/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { Source } from '../sources'
import { CoreContext } from '../../core/context'
import { asArray } from '../../logic'
import type { SceneNode, PropsDefinition } from '../compositor'

export type TransformDeclaration = {
  name: string
  sourceType?: string // TODO: keyof SourceType
  useSource?: (sources: Source[], nodeProps: any) => Source
  tagName?: string
  props?: PropsDefinition
  create: (props: any) => TransformElementBase
}

type TransformElementBase = {
  root: HTMLElement
  /** Called anytime the Source value returned by useSource is different */
  onNewSource?: (source: Source, nodeProps: any) => void
  /** Called anytime the node associated with the element has been updated */
  onUpdate?: (nodeProps: any) => void
  /** Listens for all events emitted by the compositor */
  onEvent?: (name: string, payload: any) => void
  /** Cleanup to run when node is removed from the scene tree */
  dispose?: () => void
}
type TransformElement = TransformElementBase & {
  nodeId: string
  sourceType: string
  transformName: string
  sourceValue?: any
}

export type TransformMap = {
  [name: string]: TransformDeclaration
}
export type DefaultTransformMap = {
  [sourceType: string]: TransformDeclaration['name']
}
export const htmlTransforms = {} as TransformMap
const defaultHtmlTransforms = {} as DefaultTransformMap

export const setDefaultTransforms = (defaults: DefaultTransformMap = {}) => {
  Object.keys(defaults).forEach((name) => {
    defaultHtmlTransforms[name] = defaults[name]
  })
}

export const registerTransform = (
  declaration: TransformDeclaration | TransformDeclaration[],
) => {
  asArray(declaration).forEach((x) => {
    // TODO: Validation / ensure source exists
    htmlTransforms[x.name] = x
  })
}

const nodeElementIndex = {} as {
  [nodeId: string]: TransformElement
}
const elementSourceIndex = {} as {
  [type: string]: TransformElement[]
}

export const getElementsBySourceType = (type: string) => {
  return elementSourceIndex[type] || []
}
export const getElementByNodeId = (name: string) => {
  return nodeElementIndex[name]
}
export const getTransformByName = (name: string) => {
  return htmlTransforms[name]
}

export const updateSourceForNode = (nodeId: string) => {
  const element = getElementByNodeId(nodeId)
  if (!element) return
  const transform = getTransformByName(element.transformName)
  if (!transform.useSource) return

  const node = CoreContext.compositor.getNode(nodeId)
  const sources = CoreContext.compositor.getSources(element.sourceType)
  const source = transform.useSource(sources, node.props)
  const previousValue = element.sourceValue
  const newValue = source?.value
  element.sourceValue = newValue

  if (!Object.is(previousValue, newValue)) {
    element.onNewSource(source, node.props || {})
  }

  element.onUpdate?.(node.props || {})
}

export const getElement = (node: SceneNode) => {
  // Return the element if it exists
  if (nodeElementIndex[node.id]) return nodeElementIndex[node.id]

  const { compositor } = CoreContext
  const { props = {} } = node
  const { sourceType } = props

  if (!sourceType) return null

  // Try to find a match on the default transforms
  let transformName = defaultHtmlTransforms[sourceType]
  let transform: TransformDeclaration
  if (transformName) {
    transform = htmlTransforms[transformName]
  } else {
    // If there's no match, check the remaining register transforms for a sourceType match
    transform = Object.values(htmlTransforms).find(
      (x) => x.sourceType === sourceType,
    )
  }

  // Create the node and update it immediately
  const result = {
    ...transform.create(node.props),
    sourceType,
    nodeId: node.id,
    transformName: transform.name,
  } as TransformElement

  // Update indexes
  nodeElementIndex[node.id] = result
  elementSourceIndex[sourceType] = [
    ...(elementSourceIndex[sourceType] || []),
    result,
  ]

  // Immediately update the node with latest values
  window.setTimeout(() => {
    // TODO: React doesn't like this, so we defer it.
    // Once our compositor is not React based we should inline
    result.onUpdate?.(node.props)
  })
  if (transform.useSource) {
    window.setTimeout(() => {
      // TODO: React doesn't like this, so we defer it.
      // Once our compositor is not React based we should inline
      updateSourceForNode(node.id)
    })
  }

  // Listen for changes to the node and update the element
  const listeners = [
    // Bind to compositor events
    result.onEvent && compositor.subscribe(result.onEvent),
    // Update when node changes
    CoreContext.on('NodeChanged', ({ nodeId }) => {
      if (nodeId === node.id) {
        const node = compositor.getNode(nodeId)
        result.onUpdate?.(node.props)
        if (transform.useSource) {
          updateSourceForNode(node.id)
        }
      }
    }),
    // Dispose when node is removed
    CoreContext.on('NodeRemoved', ({ nodeId }) => {
      if (nodeId === node.id) {
        const node = compositor.getNode(nodeId)
        const { sourceType = 'Element' } = node.props
        listeners.forEach((x) => x?.())
        result.dispose?.()

        // Update indexes
        delete nodeElementIndex[node.id]
        elementSourceIndex[sourceType] = elementSourceIndex[sourceType].filter(
          (x) => x !== nodeElementIndex[node.id],
        )
      }
    }),
  ]

  return result
}
