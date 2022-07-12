/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { asArray } from '../../logic'
import type { CompositorBase, Disposable, SceneNode } from '../compositor'
import { SourceManager } from '../sources'
import {
  Filter,
  runFilters,
  TransformDeclaration,
  TransformElement,
  TransformMap,
  TransformRegister,
  TransformSettings,
} from '../transforms'
import CoreContext from '../../core/context';
import { InternalEventMap, triggerInternal } from './../../core/events'
import { getRoom } from '../../core/webrtc/simple-room';

const createDefault: TransformDeclaration['create'] = () => {
  return {
    root: document.createElement('div'),
  }
}

export const init = (
  settings: TransformSettings = {},
  compositor: CompositorBase,
  sourceManager: SourceManager,
) => {
  const transforms = {} as TransformMap
  const defaultTransforms = settings.defaultTransforms || {}
  const registerTransform: TransformRegister = (declaration) => {
    asArray(declaration).forEach((x) => {
      // TODO: Validation / ensure source exists
      transforms[x.name] = x
    })
  }

  // Index elements by node
  const nodeElementIndex = {} as {
    [nodeId: string]: TransformElement
  }

  // Index elements by the source they are using
  const elementSourceIndex = {} as {
    [sourceId: string]: TransformElement[]
  }

  // Index elements by source type
  const elementSourceTypeIndex = {} as {
    [type: string]: TransformElement[]
  }

  const getElementsBySourceType = (type: string) => {
    return elementSourceTypeIndex[type] || []
  }
  const getElementsBySource = (sourceId: string) => {
    return elementSourceIndex[sourceId] || []
  }
  const getElementByNodeId = (name: string) => {
    return nodeElementIndex[name]
  }
  const getTransformByName = (name: string) => {
    return transforms[name]
  }

  compositor.on('SourceChanged', (source) => {
    const elements = getElementsBySource(source.id)

    // Update all existing node Elements currently using this exact source
    elements.forEach((element) => {
      // Pass update to the existing element
      const node = compositor.getNode(element.nodeId)
      element._onUpdateHandlers.forEach((x) => x(node.props || {}))
    })
  })

  compositor.on('AvailableSourcesChanged', ({ type, sources }) => {
    const elements = getElementsBySourceType(type)

    // Update all existing node Elements using Source of this type
    elements.forEach((x) => {
      updateSourceForNode(x.nodeId)
    })
  })

  /**
   * Check whether the Transform should use a different Source
   *  based on its `useSource` method.
   *
   * Invoke `onNewSource` if a new match is found.
   */
  const updateSourceForNode = (nodeId: string) => {
    const element = getElementByNodeId(nodeId)
    if (!element) return
    const transform = getTransformByName(element.transformName)
    if (!transform.useSource) return

    const node = compositor.getNode(nodeId)
     const elementSourceType = element.proxySource ? element.proxySource : element.sourceType;
    const sources = sourceManager.getSources(elementSourceType) 
    const source = transform.useSource(sources, node.props)
    const previousValue = element.sourceValue
    const newValue = source?.value

    if (element.source !== source) {
      // Remove the existing index (if exists)
      if (elementSourceIndex[element.source?.id]) {
        elementSourceIndex[element.source?.id] = elementSourceIndex[
          element.source?.id
        ].filter((x) => x.nodeId !== nodeId)
      }
      // Add the new index
      elementSourceIndex[source?.id] = [
        ...(elementSourceIndex[source?.id] || []),
        element,
      ]
    }

    // Store source information on the element for convenience
    element.source = source
    element.sourceValue = newValue

    if (!Object.is(previousValue, newValue)) {
      element._onNewSourceHandlers.forEach((x) => x(source))
    }
  }

  // TODO: Describe
  const renderTree = (node: SceneNode): SceneNode => {
    const element = getElement(node)

    // Run children through node's filter pipeline
    const filters = [] as Filter[]
    const result = runFilters(node, filters)

    // Pass update to the existing element
    element?._onUpdateHandlers.forEach((x) => x(node.props || {}))

    // Call renderTree recursively for each child
    return {
      ...result,
      children: result.children.map(renderTree),
    }
  }

  const getElement = (node: SceneNode) => {
    // Return the element if it exists
    if (nodeElementIndex[node.id]) return nodeElementIndex[node.id]

    const { props = {} } = node
    const { sourceType , proxySource } = props

    if (!sourceType) return null

    // Try to find a match on the default transforms
    let transformName = defaultTransforms[sourceType]
    let transform: TransformDeclaration
    if (transformName) {
      transform = transforms[transformName]
    } else {
      // If there's no match, check the remaining register transforms for a sourceType match
      transform = Object.values(transforms).find(
        (x) => x.sourceType === sourceType,
      )
    }

    if (!transform) {
      throw new Error(
        'Could not find matching transform for sourceType: ' + sourceType,
      )
    }

    const _onNewSourceHandlers: Function[] = []
    const _onUpdateHandlers: Function[] = []
    const _onRemoveHandlers: Function[] = []
    const _disposables: Disposable[] = []

    const create = transform.create || createDefault

    // Create the node and update it immediately
    const result = {
      ...create(
        {
          triggerInternal: (event: keyof InternalEventMap, data: any) =>
            triggerInternal(event, {
              projectId: CoreContext.state.activeProjectId,
              ...data,
            }),
          trigger: (event, data) =>
            compositor.triggerEvent(event, {
              nodeId: node.id,
              data,
            }),
          onEvent: (event, cb, ...args) => {
            // Event handlers will be cleaned up automatically
            //  if not manually cleaned up by invoking "dispose"
            const dispose = compositor.on(event, cb, ...args)
            _disposables.push(dispose)
            return dispose
          },
          onNewSource: (cb) => _onNewSourceHandlers.push(cb),
          onUpdate: (cb) => _onUpdateHandlers.push(cb),
          onRemove: (cb) => _onRemoveHandlers.push(cb),
          room : getRoom(CoreContext.state.activeProjectId),
          nodeId: node.id
        },
        node.props,
      ),
      proxySource,
      sourceType,
      nodeId: node.id,
      transformName: transform.name,
      _onNewSourceHandlers,
      _onUpdateHandlers,
      _disposables,
    } as TransformElement

    // Update indexes
    nodeElementIndex[node.id] = result
    const elementSourceType = proxySource ? proxySource : sourceType;
    elementSourceTypeIndex[elementSourceType] = [
      ...(elementSourceTypeIndex[elementSourceType] || []),
      result,
    ]

    if (transform.useSource) {
      updateSourceForNode(node.id)
    }

    // Listen for changes to the node and update the element
    const listeners = [
      // Dispose when node is removed
      compositor.on('NodeRemoved', ({ nodeId }) => {
        if (nodeId === node.id) {
          const node = compositor.getNode(nodeId)
          const { sourceType = 'Element' } = node.props
          
          listeners.forEach((x) => x?.())
          _disposables.forEach((x) => x?.())
          _onRemoveHandlers.forEach((x) => x?.())

          // Update indexes
          delete nodeElementIndex[node.id]
          const elementSourceType = proxySource ? proxySource : sourceType
          elementSourceTypeIndex[elementSourceType] = elementSourceTypeIndex[
            elementSourceType
          ].filter((x) => x !== nodeElementIndex[node.id])
        }
      }),
    ]

    return result
  }

  return {
    transforms,
    nodeElementIndex,
    elementSourceTypeIndex,
    registerTransform,
    getElementsBySourceType,
    getElementByNodeId,
    getTransformByName,
    updateSourceForNode,
    renderTree,
    getElement,
  }
}

export type TransformManager = ReturnType<typeof init>
