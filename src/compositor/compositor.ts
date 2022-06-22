/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import * as HtmlTransforms from './html/html-transforms'
import * as HtmlLayouts from './html/html-layouts'
import * as Sources from './sources'
import * as Logic from '../logic'
import { log } from '../core/context'
import {
  TransformElementGetter,
  TransformMap,
  TransformRegister,
  TransformSettings,
} from './transforms'
import { LayoutMap, LayoutRegister } from './layouts'
const { forEachDown, insertAt, toDataNode, pull, replaceItem } = Logic

// Export namespaces
export * as Transform from './transforms'
export * as Layout from './layouts'
export * as Source from './sources'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'ls-layout': any
    }
  }
}

export type PropDefinition = {
  required?: boolean
  default?: any
  type?:
    | typeof String
    | typeof Number
    | typeof Boolean
    | typeof Array
    | typeof Object
}

export type PropsDefinition = {
  [name: string]: PropDefinition
}

export type NodeId = string
type Nodelike = {
  id: NodeId
}

export type DataNode = {
  id: NodeId
  props: {
    [prop: string]: any
  }
  childIds: NodeId[]
}

// The crucial difference between SceneNode vs DataNode is that SceneNode has
//  fully-populated children[] rather than childIds[]
export type SceneNode = {
  id: NodeId
  props: DataNode['props'] & {
    type?: string
    sourceType?: string
    sourceProps?: {
      [prop: string]: any
    }
    layout?: string
    layoutProps?: {
      [prop: string]: any
    }
    objectFit?: 'contain' | 'cover' | 'fill'
    opacity?: number
    size?: { x: number; y: number }
    position?: { x: number; y: number }
  }
  children: SceneNode[]
  _deleted?: boolean
}

export type DB = {
  insert: (
    props: DataNode['props'],
    parentId?: NodeId,
    index?: number,
  ) => Promise<NodeId>
  update: (id: NodeId, props: DataNode['props']) => Promise<void>
  remove: (id: NodeId) => Promise<void>
}

type LocalDB = {
  insert: (
    node: Partial<SceneNode>,
    parentId?: NodeId,
    index?: number,
  ) => Promise<NodeId>
  update: (
    id: NodeId,
    props: DataNode['props'],
    childIds?: NodeId[],
  ) => Promise<void>
  remove: (id: NodeId) => Promise<void>
}

export type DBAdapter = (
  projectId: NodeId | null,
  queries: {
    get: (id: NodeId) => DataNode
    getParent: (id: NodeId) => DataNode
  },
) => DB

export type Settings = {
  dbAdapter: DBAdapter
  transformSettings?: TransformSettings
  // TODO: We do not yet offer any settings for layouts
  // layoutSettings?: LayoutSettings
}

type ProjectIndex = { [id: NodeId]: Project }

export type CompositorInstance = {
  // layouts: LayoutMap
  // transforms: TransformMap
  // sources: Sources.SourceMap
  registerLayout: LayoutRegister
  registerTransform: TransformRegister
  registerSource: typeof Sources.registerSource
  getElement: TransformElementGetter
  triggerEvent: EventHandler
  subscribe: (cb: EventHandler, nodeId?: string) => Disposable
  on: (event: string, cb: (payload: any) => void, nodeId?: string) => Disposable
  getSources: (type: string) => Sources.Source[]
  addSource: (type: string, source: Sources.NewSource) => void
  setSourceActive: (id: string, value: boolean) => void
  updateSource: (id: string, props: Sources.Source['props']) => void
  removeSource: (id: string) => void
  createProject: (props?: any, id?: NodeId) => Promise<Project>
  loadProject: (root: SceneNode, id?: NodeId) => Project
  getProject: (id: string) => Project
  getNodeProject: (id: string) => Project
  getNodeParent: (id: string) => SceneNode
  getNode: (id: string) => SceneNode
}

export type Project = DB & {
  id: NodeId
  getRoot: () => SceneNode
  nodes: SceneNode[]
  get: (id: NodeId) => SceneNode
  getParent: (id: NodeId) => SceneNode
  renderTree: () => SceneNode
  // Local database controls will not be forwarded to other connections
  local: LocalDB
  reorder: (
    parentId: NodeId,
    childIds: NodeId[],
    send?: boolean,
  ) => Promise<void>
  move: (
    id: NodeId,
    newParentId: NodeId,
    index?: number,
    tween?: boolean,
    send?: boolean,
  ) => Promise<void>
  swap: (idA: NodeId, idB: NodeId) => Promise<void>
}

type EventHandler = (event: string, payload?: any) => void

// Invoke callback to dispose of an active callback hook
type Disposable = () => void

let compositor: CompositorInstance
export const start = (settings: Settings): CompositorInstance => {
  if (compositor) return
  const { dbAdapter, transformSettings = {} } = settings

  type ProjectDbMap = { [id: string]: DB }
  const projectDbMap = {} as ProjectDbMap
  const projectIndex = {} as ProjectIndex
  const sourceIndex = {} as {
    [id: string]: Sources.Source
  }
  const sourceTypeIndex = {} as {
    [type: string]: Sources.Source[] // Array of source IDs by type
  }

  // Add ls-layout to the custom element registry
  try {
    customElements.define('ls-layout', HtmlLayouts.Layout)
  } catch (e) {
    log.warn(e)
  }

  // Node indexes
  const projectIdIndex = {} as {
    [nodeId: NodeId]: NodeId
  }
  const parentIdIndex = {} as {
    [nodeId: NodeId]: NodeId
  }
  const nodeIndex = {} as {
    [nodeId: NodeId]: SceneNode
  }

  let currentSubId = 0
  const subscribers = new Map<number, EventHandler & { nodeId?: string }>()
  const subscribe = (
    cb: EventHandler & { nodeId?: string },
    nodeId?: string,
  ): Disposable => {
    if (typeof cb !== 'function') return

    const id = ++currentSubId
    subscribers.set(id, cb)
    cb.nodeId = nodeId

    return () => {
      subscribers.delete(id)
    }
  }
  const on = (
    event: string,
    cb: EventHandler & { nodeId: string },
    nodeId?: string,
  ): Disposable => {
    return subscribe((_event, payload) => {
      if (_event !== event) return
      cb(payload)
    }, nodeId)
  }

  const triggerEvent: EventHandler = (event, payload) => {
    subscribers.forEach((handler) => {
      if (handler.nodeId) {
        if (payload?.nodeId && payload?.nodeId === handler.nodeId) {
          handler(event, payload)
        }
      } else {
        handler(event, payload)
      }
    })
  }

  const handleSourceChanged = (type: string) => {
    triggerEvent('AvailableSourcesChanged', {
      type,
      sources: sourceTypeIndex[type],
    })
  }

  compositor = {
    projects: projectIndex,
    getElement: (e) => transformManager.getElement(e),
    registerTransform: (transform) =>
      transformManager.registerTransform(transform),
    registerLayout: HtmlLayouts.registerLayout,
    registerSource: Sources.registerSource,
    // TODO: Implement registerType same way as the others
    // registerType: () => {},
    subscribe,
    on,
    triggerEvent,
    addSource: (type, source) => {
      if (!source.id) throw new Error('Cannot add source without field "id"')
      if (!source.value)
        throw new Error('Cannot add source without field "value"')
      const { id, value, props, isActive = true } = source
      sourceIndex[id] = {
        id,
        value,
        props,
        isActive,
        type,
      }
      sourceTypeIndex[type] = [
        ...(sourceTypeIndex[type] || []),
        sourceIndex[id],
      ]
      handleSourceChanged(type)
    },
    removeSource: (id) => {
      const source = sourceIndex[id]
      if (!source) return
      delete sourceIndex[id]
      sourceTypeIndex[source.type] = sourceTypeIndex[source.type].filter(
        (x) => x.id !== id,
      )
      handleSourceChanged(source.type)
    },
    updateSource: (id, props) => {
      const source = sourceIndex[id]
      source.props = {
        ...source.props,
        ...props,
      }
      handleSourceChanged(source.type)
    },
    setSourceActive: (id, value = true) => {
      const source = sourceIndex[id]
      source.isActive = value
      handleSourceChanged(source.type)
    },
    getSources: (type) => {
      return sourceTypeIndex[type] || []
    },
    getProject: (id) => projectIndex[id],
    getNodeProject: (id) => projectIndex[projectIdIndex[id]],
    getNodeParent: (id) => nodeIndex[parentIdIndex[id]],
    getNode: (id) => nodeIndex[id],
    createProject: async (
      root: Partial<SceneNode> = {},
      projectId?: string,
    ) => {
      const { id, props = {}, children = [] } = root
      // Stub out a null projectDb to use for the initial insert
      const nodeId = await dbAdapter(projectId, {
        get: () => null,
        getParent: () => null,
      }).insert(props)

      // TODO: Convert node tree to node[]
      // TODO: Iterate the node[] and replace every child in children[]
      //  with the index of that node in the node[]
      // TODO: Insert all as a single batch

      const node = {
        id: nodeId,
        props,
        children,
      }

      const nodes = []
      forEachDown(root as SceneNode, (node) => {
        nodes.push(node)
      })

      // Add the root to nodeIndex
      nodeIndex[nodeId] = node

      return compositor.loadProject(node, projectId)
    },
    loadProject: (root, id?: string) => {
      if (!root) return
      id = id || root.id

      if (projectIndex[id]) return projectIndex[id]

      // Traverse root and index each node as SceneNode
      forEachDown(root, (node, parent) => {
        nodeIndex[node.id] = node
        parentIdIndex[node.id] = parent?.id
        projectIdIndex[node.id] = id
      })

      const dbApi = {
        insert: async (node, parentId, index = 0) => {
          if (node.id && nodeIndex[node.id]) return nodeIndex[node.id] // Already exists
          if (!node.children) {
            node.children = []
          }
          if (!node.props) {
            node.props = {}
          }

          // Add node to its parent's children
          if (parentId) {
            const parent = nodeIndex[parentId]
            if (!parent) {
              throw 'Parent node not found with ID'
            }
            parent.children = insertAt(
              index,
              node as SceneNode,
              parent.children || [],
            )
            parentIdIndex[node.id] = parentId
          }

          // Add to nodeIndex/parentNodeIndex
          nodeIndex[node.id] = node as SceneNode
          projectIdIndex[node.id] = id
          return node.id
        },
        update: async (id, props = {}, childIds) => {
          // TODO: Validate by node/parent exist
          // TODO: Validate props by types
          const current = nodeIndex[id]

          if (childIds) {
            const children = childIds.map((x) => {
              const node = nodeIndex[x]
              parentIdIndex[node.id] = id
              return node
            })
            current.children = children
          }

          // Update the node in memory
          current.props = {
            ...current.props,
            ...props,
          }
        },
        remove: async (id) => {
          const parent = nodeIndex[parentIdIndex[id]]
          // TODO: Sometimes parent is undefined, though it shouldn't be
          if (parent) {
            parent.children = parent.children.filter((x) => x.id !== id)
          }
          // We do not remove the node from index, to avoid race conditions
          //  Note: Unknown whether this may become a problem in the future
          if (nodeIndex[id]) {
            nodeIndex[id]._deleted = true
          }
          // Trigger compositor-only event
          triggerEvent('NodeRemoved', {
            projectId: project.id,
            nodeId: nodeIndex.id,
          })
        },
      } as LocalDB

      const project = {
        id,
        getRoot: () => root,
        get(id) {
          return nodeIndex[id]
        },
        getParent(id) {
          return nodeIndex[parentIdIndex[id]]
        },
        renderTree() {
          return transformManager.renderTree(root)
        },
        local: dbApi,
        insert: async (props = {}, parentId, index = 0) => {
          // TODO: Validate by types (throw ValidationError)
          // TODO: Validate by business rules (throw NotAllowedError)
          const id = await projectDb.insert(props, parentId, index)
          const node = {
            id,
            props,
            children: [],
          } as SceneNode
          return dbApi.insert(node, parentId, index)
        },
        update: async (id, props) => {
          await dbApi.update(id, props)
          return projectDb.update(id, props)
        },
        remove: async (id) => {
          await dbApi.remove(id)
          const parent = nodeIndex[parentIdIndex[id]]
          const children = parent.children.filter((x) => x.id !== id)

          // @ts-ignore
          return projectDb.batch([
            [
              'delete',
              {
                id,
              },
            ],
            [
              'update',
              {
                ...parent,
                children,
              },
            ],
          ])
        },
        reorder: async (parentId: string, childIds: string[]) => {
          // TODO: Ensure childIds has the same exact IDs as it currently does
          const parent = nodeIndex[parentId]
          parent.children = childIds.map((x) =>
            parent.children.find((y) => y.id === x),
          )

          // @ts-ignore
          return projectDb.batch([['update', parent]])
        },
        move: async (id, newParentId, index = 0) => {
          const node = nodeIndex[id]
          const prevParent = nodeIndex[parentIdIndex[id]]
          const newParent = nodeIndex[newParentId]

          prevParent.children = pull(prevParent.children, node)
          newParent.children = insertAt(index, node, newParent.children)

          // @ts-ignore
          projectDb.batch([
            ['update', newParent],
            ['update', prevParent],
          ])
          parentIdIndex[id] = newParentId
          return
        },
        swap: async (idA, idB) => {
          const nodeA = nodeIndex[idA]
          const nodeB = nodeIndex[idB]
          const parentA = nodeIndex[parentIdIndex[idA]]
          const parentB = nodeIndex[parentIdIndex[idB]]

          parentA.children = replaceItem(
            (node) => node.id === idA,
            nodeB,
            parentA.children,
          )

          parentB.children = replaceItem(
            (node) => node.id === idB,
            nodeA,
            parentB.children,
          )

          parentIdIndex[idA] = parentB.id
          parentIdIndex[idB] = parentA.id

          // @ts-ignore
          projectDb.batch([
            ['update', parentA],
            ['update', parentB],
          ])
          return
        },
      } as Partial<Project>

      Object.defineProperty(project, 'nodes', {
        get() {
          return Object.values(nodeIndex).filter(
            (x) => projectIdIndex[x.id] === project.id,
          )
        },
      })

      // TODO: project-scoped {get(), getParent()} should use a snapshot of
      //  nodeIndex at the time of a DB mutation, prior to any effects being run
      const projectDb =
        projectDbMap[id] ||
        dbAdapter(id, {
          get: (id) => toDataNode(project.get(id)),
          getParent: (id) => toDataNode(project.getParent(id)),
        })
      projectDbMap[id] = projectDb
      projectIndex[id] = project as Project

      return project
    },
  } as CompositorInstance

  const transformManager = HtmlTransforms.init(transformSettings, compositor)

  return compositor
}
