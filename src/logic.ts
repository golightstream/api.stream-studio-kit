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
  every,
} from 'lodash-es'
import deepEqual from 'fast-deep-equal'
import { SDK } from './core/namespaces'

export { deepEqual }

// Note: Not reliable for matters of security
export const generateId = () => (Math.random() * 1e20).toString(36)

export const insertAt = <T>(
  index: number = 0,
  ins: T | T[],
  arr: T[],
  replace = false,
) => [
  ...arr.slice(0, index),
  ...[ins].flat(),
  ...arr.slice(replace ? index + 1 : index),
]

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

// Move down the scene graph, executing side effects each child
export const forEachDown = (
  node: Compositor.SceneNode,
  fn: (next: Compositor.SceneNode, parent?: Compositor.SceneNode) => void,
): void => {
  fn(node)
  const children = node.children || []
  children.forEach((x) =>
    forEachDown(x, (next, parent) => {
      fn(next, parent || node)
    }),
  )
}

type GraphNode = { children?: GraphNode[] }

// Move down the scene graph, updating each child
export const mapDown = <T extends GraphNode, U extends GraphNode>(
  node: T,
  fn: (next: T) => U,
): U => {
  const result = fn(node)
  return {
    ...result,
    children: (result?.children || node?.children || []).map((x) =>
      mapDown(x, fn),
    ),
  }
}

// Move down the scene graph, updating each child
export const mapDownAsync = async (
  node: Compositor.SceneNode,
  fn: (next: Compositor.SceneNode) => Promise<Compositor.SceneNode>,
): Promise<Compositor.SceneNode> => {
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

type PermissionMap = {
  [key in SDK.Role]: Permission[]
}

/**
 * A contextual repurposing of API.stream roles
 * https://www.api.stream/docs/api/auth/#permission-roles
 */

export enum Permission {
  ReadProject, // LiveAPI / LayoutAPI Read
  UpdateProject, // LiveAPI / LayoutAPI Write
  JoinRoom, // Join WebRTC
  InviteGuests, // Invite Guests
  ManageGuests, // (Non-API.stream?) Kick / rename guests
  ManageBroadcast, // Manage Broadcast
  ManageSelf,
}

export const permissions = {
  [SDK.Role.ROLE_HOST]: [
    Permission.ReadProject,
    Permission.UpdateProject,
    Permission.JoinRoom,
    Permission.InviteGuests,
    Permission.ManageGuests,
    Permission.ManageBroadcast,
  ],
  [SDK.Role.ROLE_COHOST]: [
    Permission.ReadProject,
    Permission.UpdateProject,
    Permission.JoinRoom,
    Permission.InviteGuests,
    Permission.ManageGuests,
    Permission.ManageBroadcast,
  ],
  [SDK.Role.ROLE_CONTRIBUTOR]: [
    Permission.ReadProject,
    Permission.UpdateProject,
    Permission.JoinRoom,
    Permission.InviteGuests,
  ],
  [SDK.Role.ROLE_GUEST]: [
    Permission.ReadProject,
    Permission.JoinRoom,
    Permission.ManageSelf,
  ],
  [SDK.Role.ROLE_VIEWER]: [Permission.ReadProject, Permission.JoinRoom],
  [SDK.Role.ROLE_IMPERSONATE]: [
    Permission.ReadProject,
    Permission.UpdateProject,
    Permission.InviteGuests,
    Permission.ManageGuests,
    Permission.ManageBroadcast,
  ],
} as PermissionMap

export const hasPermission = (role: SDK.Role, permission: Permission) => {
  return Boolean(permissions[role].find((x) => x === permission))
}
