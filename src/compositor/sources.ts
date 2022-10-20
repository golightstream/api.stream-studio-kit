/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { CoreContext } from '../core/context'
import { Disposable } from '../core/types'
import { asArray, pick, deepEqual } from '../logic'
import { ComponentInterface } from './components'
import type {
  PropsDefinition,
  CompositorInstance,
  CompositorBase,
  SceneNode,
} from './compositor'

type SourceProps = {
  [prop: string]: any
}

type SourceContext = {
  on: CompositorInstance['on']
  triggerEvent: CompositorInstance['triggerEvent']
}

type SourceMethods<Props = SourceProps, Value = {}> = {
  load?: (methods: ReturnType<SourceManager['wrap']>) => Disposable | void
  onChange: (value: Value, props: Props) => { value: Value; isActive?: boolean }
  /** Get the initial value of a Source */
  getValue: (props: Props) => { value: Value; isActive?: boolean }
}

export type SourceDeclaration<Props = {}, Value = {}> = {
  /** The type to declare support for (e.g. 'MediaStreamVideo') */
  type: string
  /** The properties associated with an individual Source */
  props?: PropsDefinition
  init?: (context: SourceContext) => void | SourceMethods<Props, Value>
}

export type NodeSource<Props = SourceProps> = {
  id: string
  /**
   * Properties matching the schema supplied to SourceDeclaration for this Source type
   * */
  props: Props
}

export type Source<Props = SourceProps, Value = unknown> = NodeSource<Props> & {
  type?: string // 'MediaStreamVideo' | 'HLSMedia' | 'DOMVideo' | 'DOMImage' | ...
  /**
   * A source may be set `isActive=false` to indicate that dependent elements
   *  should perhaps seek an alternative source.
   *
   * e.g. A webcam feed has been interrupted, but may come back online at any time.
   */
  isActive?: boolean
  value: Value // MediaStreamTrack | Image | String | ...
}

export type SourceMap = {
  [type: string]: SourceDeclaration
}

export type SourceRegister = (
  declaration: SourceDeclaration | SourceDeclaration[],
) => void

// Note: Currently no settings are supported
export type SourceSettings = {}

export const getSourceDifference = <T extends NodeSource>(
  previousSources: T[] = [],
  newSources: T[] = [],
) => {
  return {
    added: newSources.filter(
      (source) => !previousSources.some((x) => x.id === source.id),
    ),
    removed: previousSources.filter(
      (source) => !newSources.some((x) => x.id === source.id),
    ),
    changed: newSources.filter((source) => {
      const existing = previousSources.find((x) => x.id === source.id)
      if (!existing) return false
      return !deepEqual(source, existing)
    }),
  }
}

export const init = (
  settings: SourceSettings = {},
  compositor: CompositorBase,
) => {
  const sourceTypes = {} as SourceMap
  const sourceMethods = {} as {
    [type: string]: SourceMethods
  }

  const nodeIndex = {} as {
    [id: string]: ReturnType<typeof wrap>
  }
  const nodeLoadedIndex = {} as {
    [id: string]: {
      [type: string]: Disposable
    }
  }
  const sourceIndex = {} as {
    [id: string]: Source
  }
  const sourceTypeIndex = {} as {
    [type: string]: Source[] // Array of source IDs by type
  }

  const registerSource: SourceRegister = (declaration) => {
    asArray(declaration).forEach((x) => {
      // TODO: Validation / ensure type isn't already registered
      // TODO: Dispose of existing sources if a new one is registered with the same type
      sourceMethods[x.type] = {
        getValue: () => ({ value: null }),
        onChange: () => ({ value: null }),
        load: () => () => {},
        ...x.init?.({
          on: compositor.on,
          triggerEvent: compositor.triggerEvent,
        } as SourceContext),
      }
      sourceTypes[x.type] = x
      sourceTypeIndex[x.type] = []
    })
  }

  compositor.on('NodeRemoved', ({ nodeId, projectId }) => {
    if (nodeIndex[nodeId]) nodeIndex[nodeId].unload()
    delete nodeIndex[nodeId]
  })

  const wrap = (node: SceneNode) => {
    const project = compositor.getNodeProject(node.id)

    nodeLoadedIndex[node.id] = {}

    const nodeSourceIndex = {} as {
      [id: string]: Source
    }
    const nodeSourceTypeIndex = {} as {
      [type: string]: Source[]
    }

    const handleSourceChanged = (source: Source) => {
      compositor.triggerEvent('SourceChanged', source)
    }

    const handleSourcesChanged = (type: string, nodeId?: string) => {
      compositor.triggerEvent('AvailableSourcesChanged', {
        type,
        sources: sourceTypeIndex[type] || [],
        nodeId,
      })
    }

    const createSource = (type: string, source: NodeSource): Source => {
      if (!source.id) throw new Error('Cannot add source without field "id"')
      if (sourceIndex[source.id]) return sourceIndex[source.id] // Already added

      const sourceDeclaration = sourceTypes[type]
      if (!sourceDeclaration)
        throw new Error('Could not find definition for source type: ' + type)

      const { id, props = {} } = source
      const { value, isActive = true } = sourceMethods[type].getValue(props)

      const fullSource = {
        id,
        type,
        props,
        value,
        isActive,
      }
      sourceIndex[id] = fullSource
      nodeSourceIndex[id] = fullSource
      sourceTypeIndex[type] = [...sourceTypeIndex[type], fullSource]
      nodeSourceTypeIndex[type] = [...nodeSourceTypeIndex[type], fullSource]
      return fullSource
    }

    const deleteSource = (id: string) => {
      const source = sourceIndex[id]
      if (!source) return

      delete sourceIndex[source.id]
      delete nodeSourceIndex[source.id]
      sourceTypeIndex[source.type] = sourceTypeIndex[source.type].filter(
        (x) => x.id !== source.id,
      )
      nodeSourceTypeIndex[source.type] = nodeSourceTypeIndex[
        source.type
      ].filter((x) => x.id !== source.id)
    }

    const toNodeSource = (source: Source): NodeSource => ({
      id: source.id,
      props: source.props,
    })

    const getNodeSources = (type: string) => node.props.sources?.[type] || []

    const updateNodeSources = (type: string, sources: NodeSource[]) => {
      project.update(node.id, {
        ...node.props,
        sources: {
          ...node.props.sources,
          [type]: sources.map(toNodeSource),
        },
      })
    }

    const nodeSourceMethods = {
      get: <S extends Source = Source>(id: string) => {
        return nodeSourceIndex[id] as S
      },
      getAll: <S extends Source = Source>(type: string): Source[] => {
        return (nodeSourceTypeIndex[type] as S[]) || []
      },
      use: <S extends Source = Source>(
        id: string,
        cb: (source: S) => void,
      ): Disposable => {
        cb(nodeSourceIndex[id] as S)
        return compositor.on('SourceChanged', (payload: S) => {
          if (payload.id !== id) return
          cb(payload)
        })
      },
      useAll: <S extends Source = Source>(
        type: string,
        cb: (sources: S[]) => void,
      ): Disposable => {
        cb((nodeSourceTypeIndex[type] as S[]) || [])
        return compositor.on('AvailableSourcesChanged', (payload) => {
          if (payload.type !== type) return
          if (payload.nodeId !== node.id) return
          cb(payload.sources as S[])
        })
      },
      add: async (type: string, source: NodeSource) => {
        const fullSource = createSource(type, source)

        await updateNodeSources(type, [
          ...(getNodeSources(type) || []),
          toNodeSource(fullSource),
        ])

        handleSourceChanged(fullSource)
        handleSourcesChanged(type, node.id)
      },
      remove: async (id: string) => {
        const source = sourceIndex[id]
        if (!source) return

        const type = source.type
        deleteSource(source.id)

        await updateNodeSources(
          type,
          getNodeSources(type).filter((x) => x.id !== id),
        )

        handleSourcesChanged(source.type)
      },
      update: async (id: string, props: Source['props']) => {
        // Update the Source in memory imperatively
        const fullSource = sourceIndex[id]
        fullSource.props = {
          ...fullSource.props,
          ...props,
        }

        // Update the NodeSource
        await updateNodeSources(
          fullSource.type,
          getNodeSources(fullSource.type).map((x) => {
            if (x.id !== id) return x
            return toNodeSource(fullSource)
          }),
        )

        if (sourceMethods[fullSource.type].onChange) {
          const { value, isActive = true } = sourceMethods[
            fullSource.type
          ].onChange(fullSource.value, fullSource.props)
          fullSource.value = value
          fullSource.isActive = isActive
        }

        handleSourceChanged(fullSource)
        handleSourcesChanged(fullSource.type)
      },
      reset: async (type: string, newSources: NodeSource[] = []) => {
        const existing = getNodeSources(type)
        const difference = getSourceDifference(existing, newSources)

        // Update nodes in index
        nodeSourceTypeIndex[type].forEach((existing) => {
          newSources.forEach((x) => {
            if (x.id === existing.id) {
              existing.props = x.props
            }
          })
        })

        // Remove sources from index
        difference.removed.forEach((x) => deleteSource(x.id))

        // Add sources to index
        difference.added.forEach((x) => {
          createSource(type, x)
        })

        await updateNodeSources(type, newSources)
        handleSourcesChanged(type)
        // TODO: Do we need to handleSourceChanged() for each new source?
      },
      /**
       * Imperatively update a Source's value.
       * Triggers an event to inform elements to re-render.
       */
      modifyValue: async (
        id: string,
        cb: (value: Source['value']) => void,
      ): Promise<void> => {
        const source = sourceIndex[id]
        await cb(source.value)
        handleSourceChanged(source)
      },
      setActive: (id: string, isActive: boolean = true): void => {
        const source = sourceIndex[id]
        source.isActive = isActive
        handleSourcesChanged(source.type)
      },
      unload: async () => {
        await Promise.all(
          Object.keys(node.props.sources || {}).map((type) =>
            nodeSourceMethods.reset(type),
          ),
        )
        Object.values(loadedSources).forEach((unload) => {
          unload()
        })
      },
    }
    nodeIndex[node.id] = nodeSourceMethods

    let loadedSources = {} as { [type: string]: Disposable }
    const loadSourceTypeForNode = (type: string) => {
      if (!sourceMethods[type]) {
        console.warn('Source type is unavailable for node:', { node, type })
        return
      }
      if (loadedSources[type]) return
      loadedSources[type] =
        sourceMethods[type].load(nodeSourceMethods) || (() => {})
      sourceTypeIndex[type] = sourceTypeIndex[type] || []
      nodeSourceTypeIndex[type] = []
    }
    const nodeSourceTypes = [...Object.keys(node.props.sources || {})]
    nodeSourceTypes.forEach(loadSourceTypeForNode)

    // Index the NodeSources as Sources
    const sources = node.props.sources || {}
    Object.keys(sources).forEach((type) =>
      sources[type].forEach((x) => createSource(type, x)),
    )

    return nodeSourceMethods
  }

  const sourceManager = {
    sourceTypes,
    registerSource,
    getSource: <S extends Source = Source>(id: string) => {
      return sourceIndex[id] as S
    },
    getSources: <S extends Source = Source>(type: string): Source[] => {
      return sourceTypeIndex[type] as S[]
    },
    useSource: <S extends Source = Source>(
      id: string,
      cb: (source: S) => void,
    ): Disposable => {
      cb(sourceIndex[id] as S)
      return compositor.on('SourceChanged', (payload: S) => {
        if (payload.id !== id) return
        cb(payload)
      })
    },
    useSources: <S extends Source = Source>(
      type: string,
      cb: (sources: S[]) => void,
    ): Disposable => {
      cb(sourceTypeIndex[type] as S[])
      return compositor.on('AvailableSourcesChanged', (payload) => {
        if (payload.type !== type) return
        cb(payload.sources as S[])
      })
    },
    wrap(node: SceneNode) {
      if (nodeIndex[node.id]) return nodeIndex[node.id]
      return wrap(node)
    },
  }
  return sourceManager
}

export type SourceManager = ReturnType<typeof init>
