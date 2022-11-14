/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
/**
 * This file contains logical helpers with zero app dependencies
 *  that produce no side effects (pure functions)
 */

import type * as Compositor from './compositor/index'
import { isArray } from 'lodash-es'

// Re-export needed lodash functions to keep them centralized for tree shaking
export {
  pick,
  pull,
  omit,
  isEqual,
  cloneDeep,
  sortBy,
  debounce,
  camelCase,
  kebabCase,
  isArray,
  isMatch,
  every,
  mapValues,
  memoize,
} from 'lodash-es'
import deepEqual from 'fast-deep-equal'

export { deepEqual }

// Note: Not reliable for matters of security
export const generateId = () => (Math.random() * 1e20).toString(36)

export const insertAt = <T>(
  index: number = 0,
  ins: T | T[],
  arr: T[],
  replace = false,
) =>
  [
    ...arr.slice(0, index),
    ...[ins].flat(),
    ...arr.slice(replace ? index + 1 : index),
  ] as T[]

export const replaceItem = <T>(
  match: T | ((item: T) => Boolean),
  newItem: T,
  arr: T[],
) => {
  match = typeof match === 'function' ? match : (x) => x === match
  const index = arr.findIndex(match as (item: T) => Boolean)
  if (index < 0) return arr
  return insertAt(index, newItem, arr, true)
}

export const swapIndex = <T>(indexA: number, indexB: number, arr: T[]) => {
  if (!arr[indexA] || !arr[indexB]) return arr
  arr = [...arr]
  const prevA = arr[indexA]
  arr[indexA] = arr[indexB]
  arr[indexB] = prevA
  return arr
}

export const swapItems = <T extends string | number>(
  itemA: T,
  itemB: T,
  arr: T[],
) => {
  const indexA = arr.findIndex((x) => x === itemA)
  const indexB = arr.findIndex((x) => x === itemB)
  if (indexA < 0 || indexB < 0) return arr
  return swapIndex(indexA, indexB, arr)
}

export const toDataNode = (node: Compositor.SceneNode): Compositor.DataNode => {
  if (!node) return null
  return {
    id: node.id,
    props: node.props,
    childIds: (node.children || []).map((x) => x.id),
  }
}

export const toSceneNode = (
  node: Compositor.DataNode,
): Compositor.SceneNode => {
  return {
    id: node.id,
    props: node.props,
    children: [],
  }
}

export const toSceneTree = (
  nodes: Compositor.DataNode[],
  rootId: Compositor.NodeId,
): Compositor.SceneNode => {
  const root = nodes.find((x) => x.id === rootId)
  if (!root) return null
  const childIds = root.childIds

  return {
    id: root.id,
    props: root.props,
    children: childIds.map((x) => toSceneTree(nodes, x)).filter(Boolean),
  }
}

type GraphNode = { [prop: string]: any; children: GraphNode[] }

// Move down the scene graph, executing side effects each child
export const forEachDown = <T extends GraphNode = GraphNode>(
  node: T,
  fn: (next: T, parent?: T) => void,
): void => {
  if (!node) return
  fn(node)
  const children = node.children || []
  children.forEach((x) =>
    forEachDown(x, (next, parent) => {
      fn(next as T, (parent || node) as T)
    }),
  )
}

// Move down the scene graph, updating each child
export const mapDown = <T extends GraphNode, U extends GraphNode>(
  node: T,
  fn: (next: T, parent: T) => Omit<GraphNode, 'children'>,
  parent?: T
): U => {
  const result = fn(node, parent)
  return {
    ...result,
    children: (result?.children || node?.children || []).map((x) =>
      mapDown(x, fn, node),
    ),
  } as U
}

// Move down the scene graph, updating each child
export const mapDownAsync = async (
  node: GraphNode,
  fn: (next: GraphNode) => Promise<GraphNode>,
): Promise<GraphNode> => {
  const children = node?.children ?? []
  return {
    ...(await fn(node)),
    children: await Promise.all(children.map((x) => mapDownAsync(x, fn))),
  }
}

// Get an HTML element's attributes as an object
export const getElementAttributes = (x: HTMLElement) => {
  return Object.values(x.attributes).reduce((acc, x) => {
    return {
      ...acc,
      [x.name]: x.value,
    }
  }, {}) as { [props: string]: string }
}

// Ensure an item is iterable as an array
export const asArray = <T>(x: T | T[]): T[] => {
  return isArray(x) ? (x as T[]) : [x as T]
}

export const sizeToNum = (x: string | number | null, parentSize: number) => {
  if (typeof x === 'number') return x
  if (typeof x === 'string') {
    if (x.indexOf('%') > -1) {
      return (parseFloat(x) / 100) * parentSize
    }
    return parseFloat(x)
  }
  return 0
}

export const asSize = (x: string | number | null) => {
  if (typeof x === 'number') return x + 'px'
  if (typeof x === 'string') {
    if (x.indexOf('%') > -1) {
      return parseFloat(x) + '%'
    }
    // Presumably already formatted
    return x
  }
  // Default to valid 0
  return '0px'
}

export const asDuration = (x: string | number | null) => {
  if (typeof x === 'string') {
    // Presumably already formatted
    return x
  }
  if (typeof x === 'number') return x + 'ms'
  // Default to valid 0
  return '0ms'
}

/** Convert a Map to an array of its values */
export const values = <T>(map: Map<any, T>) => Array.from(map.values())
