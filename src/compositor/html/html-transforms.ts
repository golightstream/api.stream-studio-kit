/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { asArray } from '../../logic'
import type { CompositorInstance, SceneNode } from '../compositor'
import {
  runFilters,
  TransformDeclaration,
  TransformElement,
  TransformMap,
  TransformRegister,
  TransformSettings,
} from '../transforms'

const createDefault: TransformDeclaration['create'] = () => {
  return {
    root: document.createElement('div'),
  }
}

export const init = (
  settings: TransformSettings,
  compositor: CompositorInstance,
) => {
  const transforms = {} as TransformMap
  const defaultTransforms = settings.defaultTransforms || {}
  const registerTransform: TransformRegister = (declaration) => {
    asArray(declaration).forEach((x) => {
      // TODO: Validation / ensure source exists
      transforms[x.name] = x
    })
  }

  const nodeElementIndex = {} as {
    [nodeId: string]: TransformElement
  }
  const elementSourceIndex = {} as {
    [type: string]: TransformElement[]
  }

  const getElementsBySourceType = (type: string) => {
    return elementSourceIndex[type] || []
  }
  const getElementByNodeId = (name: string) => {
    return nodeElementIndex[name]
  }
  const getTransformByName = (name: string) => {
    return transforms[name]
  }

  compositor.on('AvailableSourcesChanged', ({ type, sources }) => {
    const elements = getElementsBySourceType(type)

    // Update all existing node Elements using Source of this type
    elements.forEach((x) => {
      updateSourceForNode(x.nodeId)
    })
  })

  const updateSourceForNode = (nodeId: string) => {
    const element = getElementByNodeId(nodeId)
    if (!element) return
    const transform = getTransformByName(element.transformName)
    if (!transform.useSource) return

    const node = compositor.getNode(nodeId)
    const sources = compositor.getSources(element.sourceType)
    const source = transform.useSource(sources, node.props)
    const previousValue = element.sourceValue
    const newValue = source?.value
    element.sourceValue = newValue

    if (!Object.is(previousValue, newValue)) {
      element._onNewSourceHandlers.forEach((x) => x(source))
    }
  }

  // TODO: Describe
  const renderTree = (node: SceneNode): SceneNode => {
    const element = getElement(node)

    // Run children through node's filter pipeline
    const filters = transforms[element.transformName]?.filters
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
    const { sourceType } = props

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

    const _onNewSourceHandlers: Function[] = []
    const _onUpdateHandlers: Function[] = []

    const create = transform.create || createDefault

    // Create the node and update it immediately
    const result = {
      ...create(
        {
          trigger: (event, data) =>
            compositor.triggerEvent(event, {
              nodeId: node.id,
              data,
            }),
          // TODO: Store and automatically dispose of handlers
          onEvent: compositor.on,
          onNewSource: (cb) => _onNewSourceHandlers.push(cb),
          onUpdate: (cb) => _onUpdateHandlers.push(cb),
        },
        node.props,
      ),
      sourceType,
      nodeId: node.id,
      transformName: transform.name,
      _onNewSourceHandlers,
      _onUpdateHandlers,
    } as TransformElement

    // Update indexes
    nodeElementIndex[node.id] = result
    elementSourceIndex[sourceType] = [
      ...(elementSourceIndex[sourceType] || []),
      result,
    ]

    if (transform.useSource) {
      window.setTimeout(() => {
        // TODO: React doesn't like this, so we defer it.
        // Once our compositor is not React based we should inline
        updateSourceForNode(node.id)
      })
    }

    // Listen for changes to the node and update the element
    const listeners = [
      // Dispose when node is removed
      compositor.on('NodeRemoved', ({ nodeId }) => {
        if (nodeId === node.id) {
          const node = compositor.getNode(nodeId)
          const { sourceType = 'Element' } = node.props
          listeners.forEach((x) => x?.())
          result.dispose?.()

          // Update indexes
          delete nodeElementIndex[node.id]
          elementSourceIndex[sourceType] = elementSourceIndex[
            sourceType
          ].filter((x) => x !== nodeElementIndex[node.id])
        }
      }),
    ]

    return result
  }

  return {
    transforms,
    registerTransform,
    nodeElementIndex,
    elementSourceIndex,
    getElementsBySourceType,
    getElementByNodeId,
    getTransformByName,
    updateSourceForNode,
    renderTree,
    getElement,
  }
}
