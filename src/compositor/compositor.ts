/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import * as HtmlTransforms from './html/html-transforms'
import * as HtmlLayouts from './html/html-layouts'
import * as Sources from './sources'
import * as Components from './components'
import * as Renderer from './renderer'
import * as Logic from '../logic'
import { log } from '../core/context'
import {
  TransformElementGetter,
  TransformRegister,
  TransformSettings,
} from './transforms'
import { LayoutRegister } from './layouts'
import { SourceManager, SourceRegister, SourceSettings } from './sources'
import {
  ComponentRegister,
  ComponentSettings,
  ComponentManager,
} from './components'
const { forEachDown, insertAt, toDataNode, pull, replaceItem } = Logic

// Export namespaces
export * as Transform from './transforms'
export * as Layout from './layouts'
export * as Source from './sources'
export * as Component from './components'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'ls-layout': any
    }
  }
}

type Command = (...args: unknown[]) => unknown
export type ExecuteCommand = (command: string, ...args: any[]) => void
export type RegisterCommand = (name: string, fn: Command) => void

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
  // Applies to a node during render (virtual nodes only)
  render?: {
    methods: Renderer.RenderMethods
  }
  props: DataNode['props'] & {
    version?: string
    type?: string
    sources?: { [type: string]: Sources.NodeSource[] }
    sourceType?: string
    sourceId?: string
    sourceProps?: {
      [prop: string]: any
    }
    componentProps?: {
      [prop: string]: any
    }
    componentChildren?: {
      [childType: string]: SceneNode[]
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

export type DBAdapter = {
  createProject: (metadata?: unknown) => Promise<{ id: string }>
  loadProject: (id: string) => Promise<SceneNode>
  db: (project: Project) => DB
}

export type Settings = {
  dbAdapter: DBAdapter
  transformSettings?: TransformSettings
  sourceSettings?: SourceSettings
  componentSettings?: ComponentSettings
  updateOutdatedComponents?: boolean
  // TODO: We do not yet offer any settings for layouts
  // layoutSettings?: LayoutSettings
}

type ProjectIndex = { [id: NodeId]: Project }

type ProjectSettings = {
  size?: { x: number; y: number }
  canEdit?: boolean
}

/**
 * CompositorBase represents the base set of compositor functionality
 *  that components, transforms, and layouts require to initialize a compositor.
 *
 * These fields are included in the full CompositorInstance singleton
 */
export type CompositorBase = {
  nodeIndex: {
    [nodeId: NodeId]: SceneNode
  }
  parentIdIndex: {
    [nodeId: NodeId]: NodeId
  }
  settings: Settings
  projects: ProjectIndex
  registerCommand: RegisterCommand
  executeCommand: ExecuteCommand
  triggerEvent: Trigger
  subscribe: Subscribe
  on: On
  createProject: (
    settings: ProjectSettings,
    metadata?: unknown,
  ) => Promise<Project>
  loadProject: (id: string, settings?: ProjectSettings) => Promise<Project>
  getProject: (id: string) => Project
  getNodeProject: (id: string) => Project
  getNodeParent: (id: string) => SceneNode
  getNode: (id: string) => SceneNode
}

/**
 */
export interface CompositorInstance extends CompositorBase {
  registerComponent: ComponentRegister
  registerLayout: LayoutRegister
  registerTransform: TransformRegister
  registerSource: SourceRegister
  getElement: TransformElementGetter
  getSource: SourceManager['getSource']
  getSources: SourceManager['getSources']
  useSource: SourceManager['useSource']
  useSources: SourceManager['useSources']
  createComponent: ComponentManager['createComponent']
  getComponent: ComponentManager['getComponent']
}

type RenderSettings = {
  containerEl: HTMLElement
}

export type LayoutUpdates = {
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

export type Project = DB &
  LayoutUpdates & {
    id: NodeId
    settings: ProjectSettings
    triggerEvent: Trigger
    subscribe: Subscribe
    on: On
    nodes: SceneNode[]
    component: (id?: NodeId) => ReturnType<ComponentManager['getNodeInterface']>
    useRoot: <I extends Components.NodeInterface = Components.NodeInterface>(
      cb: (tree: I) => void,
    ) => Disposable
    useNode: ComponentManager['useNodeInterface']
    get: (id: NodeId) => SceneNode
    getElement: TransformElementGetter
    getParent: (id: NodeId) => SceneNode
    getRoot: () => SceneNode
    insertRoot: (props: DataNode['props']) => Promise<NodeId>
    render: (settings: RenderSettings) => Disposable
    renderVirtualTree: () => SceneNode
    // Local database controls will not be forwarded to other connections
    local: LocalDB
  }

type Trigger = (event: string, payload: EventPayload) => void
type EventPayload = {
  projectId?: string
  nodeId?: string
  [prop: string]: any
}

type SubscribeCallback = ((event: string, payload: EventPayload) => void) & {
  nodeId?: string
}
type Subscribe = (cb: SubscribeCallback, nodeId?: string) => Disposable
type OnCallback = ((payload: EventPayload) => void) & { nodeId?: string }
type On = (event: string, cb: OnCallback, nodeId?: string) => Disposable

// Invoke callback to dispose of an active callback hook
export type Disposable = () => void

let compositor: CompositorInstance
export const start = (settings: Settings): CompositorInstance => {
  if (compositor) return compositor
  const {
    dbAdapter,
    transformSettings = {},
    sourceSettings = {},
    componentSettings = {},
  } = settings

  type ProjectDbMap = { [id: string]: DB }
  const projectDbMap = {} as ProjectDbMap
  const projectIndex = {} as ProjectIndex

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
  const subscribers = new Map<number, SubscribeCallback>()
  const subscribe: Subscribe = (cb, nodeId): Disposable => {
    if (typeof cb !== 'function') return

    const id = ++currentSubId
    subscribers.set(id, cb)
    cb.nodeId = nodeId

    return () => {
      subscribers.delete(id)
    }
  }
  const on: On = (event, cb, nodeId) => {
    return subscribe((_event, payload) => {
      if (_event !== event) return
      cb(payload)
    }, nodeId)
  }

  const triggerEvent: Trigger = (event, payload) => {
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

  const commands = new Map<string, Command>()

  // TODO:
  const registerCommand: RegisterCommand = (name, fn) => {
    commands.set(name, fn)
  }

  // TODO:
  const executeCommand: ExecuteCommand = (name, ...args) => {
    const command = commands.get(name)
    if (!command) {
      throw Error(`${name} is not a valid command. Supplied payload:`, ...args)
    }
    log.debug('Compositor command: ' + name, args)
    return command(...args)
  }

  const compositorBase = {
    nodeIndex,
    parentIdIndex,
    settings,
    projects: projectIndex,
    subscribe,
    on,
    triggerEvent,
    registerCommand,
    executeCommand,
    getProject: (id) => projectIndex[id],
    getNodeProject: (id) => projectIndex[projectIdIndex[id]],
    getNodeParent: (id) => nodeIndex[parentIdIndex[id]],
    getNode: (id) => nodeIndex[id],
    createProject: async (projectSettings, metadata) => {
      const { id } = await dbAdapter.createProject(metadata)
      return compositor.loadProject(id, projectSettings)
    },
    loadProject: (...args) => loadProject(...args),
  } as CompositorBase

  const sourceManager = Sources.init(sourceSettings, compositorBase)
  const componentManager = Components.init(
    componentSettings,
    compositorBase,
    sourceManager,
  )
  const transformManager = HtmlTransforms.init(
    transformSettings,
    compositorBase,
    sourceManager,
  )

  compositor = {
    registerComponent: componentManager.registerComponent,
    registerLayout: HtmlLayouts.registerLayout,
    registerTransform: transformManager.registerTransform,
    registerSource: sourceManager.registerSource,
    getElement: transformManager.getElement,
    getSource: sourceManager.getSource,
    getSources: sourceManager.getSources,
    useSource: sourceManager.useSource,
    useSources: sourceManager.useSources,
    createComponent: componentManager.createComponent,
    getComponent: componentManager.getComponent,
    useComponent: componentManager.getNodeInterface,
    ...compositorBase,
  } as CompositorInstance

  /** Project init */
  const loadProject = async (
    id: string,
    projectSettings: ProjectSettings = {},
  ) => {
    const { dbAdapter } = compositor.settings
    let root = await dbAdapter.loadProject(id)
    let { size, canEdit = true } = projectSettings

    const existingProject = compositor.getProject(id)
    projectSettings.size = size ||
      existingProject?.settings.size ||
      root?.props.size || { x: 1280, y: 720 }

    if (existingProject) {
      existingProject.settings = {
        ...existingProject.settings,
        ...projectSettings,
      }
      return existingProject
    }

    if (compositor.settings.updateOutdatedComponents) {
      // Note: This is a legacy validation. This is necessary to ensure
      //  certain nodes are recreated as components
      if (root.props.type === 'sceneless-project') {
        // This is a v0, so recreate
        // const component = componentManager.components['ScenelessProject']
        // TODO:
        // await projectDb.update()
      }
      // TODO: Check for 'version'
      // TODO: Validate the scene tree
    }

    // Traverse root and index each node as SceneNode
    forEachDown(root, (node, parent) => {
      nodeIndex[node.id] = node
      parentIdIndex[node.id] = parent?.id
      projectIdIndex[node.id] = id
      
      if (node.props?.componentChildren) {
        Object.keys(node.props.componentChildren).forEach((x) =>
          (node.props.componentChildren || {})[x].forEach((x: SceneNode) => {
            nodeIndex[x.id] = x
            parentIdIndex[x.id] = node.id
          }),
        )
      }
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
        } else {
          root = node as SceneNode
        }

        // Add to nodeIndex/parentNodeIndex
        nodeIndex[node.id] = node as SceneNode
        projectIdIndex[node.id] = id

        triggerEvent('NodeAdded', { nodeId: node.id, projectId: project.id })

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

        // Index component nodes
        if (props.componentChildren) {
          Object.keys(props.componentChildren).forEach((x) =>
            (props.componentChildren || {})[x].forEach((node: SceneNode) => {
              nodeIndex[node.id] = node
              parentIdIndex[node.id] = current.id
            }),
          )
        }

        triggerEvent('NodeChanged', { nodeId: id, projectId: project.id })
      },
      remove: async (id) => {
        const parent = nodeIndex[parentIdIndex[id]]
        // TODO: Sometimes parent is undefined, though it shouldn't be
        if (parent) {
          parent.children = parent.children.filter((x) => x.id !== id)
        } else {
          root = null
        }
        const self = nodeIndex[id]

        // Emit NodeRemoved for self and each child node.
        //  This enables Transforms to clean up instead of becoming
        //  silently detached from the render tree.
        forEachDown(self, (node) => {
          // We do not remove the node from index, to avoid race conditions
          //  Note: Unknown whether this may become a problem in the future
          if (nodeIndex[node.id]) {
            nodeIndex[node.id]._deleted = true
          }
          // Trigger compositor-only event
          triggerEvent('NodeRemoved', {
            projectId: project.id,
            nodeId: node.id,
          })
        })
      },
    } as LocalDB

    // Store a set of all node IDs as they are rendered. On the following render,
    //  we'll remove from this list one-by-one to determine which virtual nodes
    //  have been removed from the scene tree
    let lastRenderIds = new Set<string>()
    let lastRenderRemovedIds = new Set<string>()

    // Crawl a node recursively, return its pre-processed render result,
    //  and update each element based on its node's resulting props
    const renderVirtualTreeOfNode = (
      node: SceneNode,
      parentId?: string,
    ): SceneNode => {
      // Ensure index in case it's a virtual node
      nodeIndex[node.id] = node
      parentIdIndex[node.id] = parentId
      lastRenderIds.add(node.id)
      lastRenderRemovedIds.delete(node.id)
      const element = transformManager.getElement(node)
      const component = componentManager.getComponent(node.props.type)
      let result = componentManager.renderVirtualNode(node)

      // Run children through node's filter pipeline
      // TODO: Figure this out
      // const filters = [] as Components.Filter[]
      // const result = runFilters(node, filters)

      // Ensure node has the proper source based on its props
      transformManager.updateSourceForNode(node.id)

      // Pass update to the existing element
      element?._onUpdateHandlers.forEach((x) => x(node.props || {}))

      // Call renderTree recursively for each child
      return {
        ...result,
        children: result.children.map((x) =>
          renderVirtualTreeOfNode(x, node.id),
        ),
      }
    }

    const project = {
      id,
      settings: projectSettings,
      on(event, cb) {
        return on(event, (payload) => {
          if (payload.projectId !== project.id) return
          cb(payload)
        })
      },
      triggerEvent: (event, payload) => {
        return triggerEvent(event, { ...payload, projectId: project.id })
      },
      useRoot(cb) {
        let listeners = [] as Disposable[]
        if (!root) {
          listeners.push(
            project.on('NodeAdded', ({ nodeId }) => {
              if (nodeId === root?.id) {
                listeners.push(project.useRoot(cb))
              }
            }),
          )
        }
        listeners.push(project.useNode(root.id, cb))
        return () => listeners.forEach((x) => x())
      },
      useNode(id, cb) {
        return componentManager.useNodeInterface(id, cb)
      },
      component: (id) => componentManager.getNodeInterface(id || root.id),
      getRoot: () => root,
      get(id) {
        return nodeIndex[id]
      },
      getParent(id) {
        return nodeIndex[parentIdIndex[id]]
      },
      getElement: (node) => transformManager.getElement(node),
      render({ containerEl }) {
        return Renderer.renderProject(project as Project, containerEl)
      },
      renderVirtualTree() {
        lastRenderRemovedIds = lastRenderIds
        lastRenderIds = new Set()
        const result = renderVirtualTreeOfNode(project.getRoot())

        // TODO: This will result in redundant NodeRemoved events for non-virtual nodes
        lastRenderRemovedIds.forEach((x) =>
          triggerEvent('NodeRemoved', {
            projectId: project.id,
            nodeId: x,
          }),
        )
        return result
      },
      local: dbApi,
      insertRoot: (props = {}) => {
        return project.insert({ ...props, isRoot: true })
      },
      insert: async (props = {}, parentId, index = 0) => {
        if (!canEdit) return
        if (!parentId && root) {
          console.warn(
            'Cannot insert an additional root node (require parentId).',
          )
          return
        }
        if (parentId && !project.getParent(parentId)) {
          console.warn('Cannot find parent node of ID', parentId)
          return
        }
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
        if (!canEdit) return
        await dbApi.update(id, props)
        return projectDb.update(id, props)
      },
      remove: async (id) => {
        if (!canEdit) return
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
        if (!canEdit) return
        // TODO: Ensure childIds has the same exact IDs as it currently does
        const parent = nodeIndex[parentId]
        parent.children = childIds.map((x) =>
          parent.children.find((y) => y.id === x),
        )

        // @ts-ignore
        return projectDb.batch([['update', parent]])
      },
      move: async (id, newParentId, index = 0) => {
        if (!canEdit) return
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
        if (!canEdit) return
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
    const projectDb = projectDbMap[id] || dbAdapter.db(project as Project)
    projectDbMap[id] = projectDb
    projectIndex[id] = project as Project

    triggerEvent('ProjectLoaded', { project })
    return project
  }

  return compositor
}
