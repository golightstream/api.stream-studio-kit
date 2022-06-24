/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { CoreContext } from '../core/context'
import { Disposable } from '../core/types'
import { asArray, pick } from '../logic'
import type {
  PropsDefinition,
  CompositorInstance,
  CompositorBase,
} from './compositor'

type SourceMethods = Pick<
  SourceManager,
  | 'getSource'
  | 'removeSource'
  | 'updateSource'
  | 'setSourceActive'
  | 'modifySourceValue'
> & { addSource: (source: NewSource) => void }

export type SourceDeclaration = {
  /** The type to declare support for (e.g. 'MediaStreamVideo') */
  type: string
  /**
   * The value-type constructor of a Source (e.g. MediaStream)
   *  Used for run-time validation.
   *
   * This is an approximation of the actual type
   *  definition of Source.value
   */
  valueType: any
  /** The properties associated with an individual Source */
  props?: PropsDefinition
  init?: (methods: SourceMethods) => void
}

export type Source = {
  id: string
  type: string // 'MediaStreamVideo' | 'HLSMedia' | 'DOMVideo' | 'DOMImage' | ...
  /** Indicates whether a source is ready to be rendered to the page */
  isActive: boolean
  /**
   * Properties matching the schema supplied to SourceDeclaration for this Source type
   * */
  props: { [prop: string]: any }
  value: any // MediaStreamTrack | Image | String | ...
}

export type NewSource = {
  id: string
  value: any
  /**
   * A source may be set `inActive` to indicate that dependent elements
   *  should perhaps seek an alternative source.
   *
   * e.g. A webcam feed has been interrupted, but may come back online at any time.
   */
  isActive?: boolean
  props?: { [prop: string]: any }
}

export type SourceMap = {
  [type: string]: SourceDeclaration
}
export const sourceTypes = {} as SourceMap

export type SourceRegister = (
  declaration: SourceDeclaration | SourceDeclaration[],
) => void

// Note: Currently no settings are supported
export type SourceSettings = {}

export const init = (
  settings: SourceSettings = {},
  compositor: CompositorBase,
) => {
  const sourceIndex = {} as {
    [id: string]: Source
  }
  const sourceTypeIndex = {} as {
    [type: string]: Source[] // Array of source IDs by type
  }

  const handleSourceChanged = (source: Source) => {
    compositor.triggerEvent('SourceChanged', source)
  }

  const handleSourcesChanged = (type: string) => {
    compositor.triggerEvent('AvailableSourcesChanged', {
      type,
      sources: sourceTypeIndex[type],
    })
  }

  const registerSource: SourceRegister = (declaration) => {
    asArray(declaration).forEach((x) => {
      const _ensureEditPermission = (sourceId: string) => {
        const source = sourceIndex[sourceId]
        if (!source) return
        if (source.type === x.type) return
        throw new Error(
          `Attempted to modify source of type ${source.type} from ${x.type}`,
        )
      }

      // TODO: Validation / ensure type isn't already registered
      // TODO: Dispose of existing sources if a new one is registered with the same type
      x.init?.({
        getSource: (id: string) => sourceManager.getSource(id),
        removeSource: (id) => {
          _ensureEditPermission(id)
          return sourceManager.removeSource(id)
        },
        setSourceActive: (id, isActive) => {
          _ensureEditPermission(id)
          return sourceManager.setSourceActive(id, isActive)
        },
        updateSource: (id, props) => {
          _ensureEditPermission(id)
          return sourceManager.updateSource(id, props)
        },
        modifySourceValue(id, cb) {
          _ensureEditPermission(id)
          return sourceManager.modifySourceValue(id, cb)
        },
        addSource: (source: NewSource) =>
          sourceManager.addSource(x.type, source),
      } as SourceMethods)
      sourceTypes[x.type] = x
    })
  }

  const sourceManager = {
    sourceIndex,
    sourceTypeIndex,
    registerSource,
    getSource: (id: string) => {
      return sourceIndex[id]
    },
    getSources: (type: string): Source[] => {
      return sourceTypeIndex[type] || []
    },
    useSource: (id: string, cb: (source: Source) => void): Disposable => {
      return compositor.on('SourceChanged', (payload: Source) => {
        if (payload.id !== id) return
        cb(payload)
      })
    },
    useSources: (type: string, cb: (sources: Source[]) => void): Disposable => {
      return compositor.on('AvailableSourcesChanged', (payload) => {
        if (payload.type !== type) return
        cb(payload.sources)
      })
    },
    addSource: (type: string, source: NewSource): void => {
      if (!source.id) throw new Error('Cannot add source without field "id"')
      if (sourceIndex[source.id]) return // Already added

      if (!source.value)
        throw new Error('Cannot add source with an empty field "value"')

      const sourceDeclaration = sourceTypes[type]
      if (!sourceDeclaration)
        throw new Error('Could not find definition for source type: ' + type)

      const { id, value = null, props = {}, isActive = true } = source
      sourceIndex[id] = {
        id,
        type,
        props,
        value,
        isActive,
      }
      sourceTypeIndex[type] = [
        ...(sourceTypeIndex[type] || []),
        sourceIndex[id],
      ]
      handleSourceChanged(sourceIndex[id])
      handleSourcesChanged(type)
    },
    removeSource: (id: string): void => {
      const source = sourceIndex[id]
      if (!source) return
      delete sourceIndex[id]
      sourceTypeIndex[source.type] = sourceTypeIndex[source.type].filter(
        (x) => x.id !== id,
      )
      handleSourcesChanged(source.type)
    },
    updateSource: (id: string, props: Source['props']): void => {
      const source = sourceIndex[id]
      source.props = {
        ...source.props,
        ...props,
      }
      handleSourceChanged(source)
      handleSourcesChanged(source.type)
    },
    /**
     * Imperatively update a Source's value.
     * Triggers an event to inform elements to re-render.
     */
    modifySourceValue: async (
      id: string,
      cb: (value: Source['value']) => void,
    ): Promise<void> => {
      const source = sourceIndex[id]
      await cb(source.value)
      handleSourceChanged(source)
    },
    setSourceActive: (id: string, isActive: boolean = true): void => {
      const source = sourceIndex[id]
      source.isActive = isActive
      handleSourcesChanged(source.type)
    },
  }
  return sourceManager
}

export type SourceManager = ReturnType<typeof init>
