/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
/**
 * This file contains logical helpers with zero app dependencies
 *  that produce no side effects (pure functions)
 */

import deepEqual from 'fast-deep-equal'
import { isArray, iteratee } from 'lodash-es'
import { visit } from 'unist-util-visit'
import type * as Compositor from './compositor/index'
// Re-export needed lodash functions to keep them centralized for tree shaking
export {
  camelCase, cloneDeep, debounce, every, isArray, isEqual, kebabCase, omit, pick,
  pull, sortBy
} from 'lodash-es'

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

/**
 * Find
 * @param {Node} tree - Root node
 * @param {string|object|function} [condition] - Condition to match node.
 */
export const find = (
  tree: any,
  condition: string | object | Function,
): Compositor.SceneNode => {
  if (!tree) throw new Error('requires a tree to search')
  if (!condition) throw new Error('requires a condition')

  const predicate = iteratee(condition)
  let result: Compositor.SceneNode

  visit(tree, function (node: Compositor.SceneNode) {
    if (predicate(node)) {
      result = node
      return false
    }
  })

  return result
}

/**
 * Find All
 * @param {Node} tree - Root node
 * @param {string|object|function} [condition] - Condition to match node.
 */
export const findAll = (
  tree: any,
  condition: string | object | Function,
): Compositor.SceneNode[] => {
  if (!tree) throw new Error('requires a tree to search')
  if (!condition) throw new Error('requires a condition')

  const predicate = iteratee(condition)
  let result: Compositor.SceneNode[] = []

  visit(tree, function (node: Compositor.SceneNode) {
    if (predicate(node)) {
      result.push(node)
    }
  })

  return result
}

export const lookupDevice = (
  devices: MediaDeviceInfo[],
  src: string,
): {
  videoDevice: MediaDeviceInfo
  audioDevice: MediaDeviceInfo | null
} | null => {
  const videoDevice = devices.find(
    (device) => device.label === src && device.kind === 'videoinput',
  )
  const audioDevice = devices.find(
    (device) =>
      device.label === `Monitor of ${src}` && device.kind === 'audioinput',
  )
  if (videoDevice && audioDevice) {
    return { videoDevice, audioDevice }
  }

  // Handle a standard browser context for testing locally.
  if (videoDevice) {
    if (videoDevice.label === 'Logitech BRIO (046d:085e)') {
      const audio = devices.find(
        (device) =>
          /*(device.groupId === videoDevice.groupId) &&*/ device.kind ===
            'audioinput' && device.label === 'Loopback Audio 2 (Virtual)',
      )
      return { videoDevice, audioDevice: audio! }
    }

    if (videoDevice.label === 'OBS Virtual Camera (m-de:vice)') {
      const audio = devices.find(
        (device) =>
          /*(device.groupId === videoDevice.groupId) &&*/ device.kind ===
            'audioinput' && device.label === 'Loopback Audio (Virtual)',
      )

      return { videoDevice, audioDevice: audio! }
    }

    return { videoDevice, audioDevice: null }
  }

  return null
}

export const connectDevice = async (id: string) => {
  const devs = await navigator.mediaDevices.enumerateDevices()

  const devices = lookupDevice(devs, id)
  if (devices) {
    const constraints: MediaStreamConstraints = {
      video: {
        width: 999999,
        height: 999999,
        deviceId: { exact: devices.videoDevice.deviceId },
      },
    }

    if (devices.audioDevice) {
      constraints.audio = {
        autoGainControl: false,
        channelCount: 2,
        echoCancellation: false,
        // @ts-ignore: https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints/latency
        latency: 0,
        noiseSuppression: false,
        sampleRate: 128000,
        sampleSize: 16,
        deviceId: {
          exact: devices.audioDevice.deviceId,
        },
      }
    }
    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    if (stream) {
      return stream
    } else {
      console.warn(`No stream found for source ${id}.`)
    }
  } else {
    console.warn(`No device found for source ${id}.`)
  }
}

/** Convert a Map to an array of its values */
export const values = <T>(map: Map<any, T>) => Array.from(map.values())
