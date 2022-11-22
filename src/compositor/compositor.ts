/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import * as HtmlTransforms from './html/html-transforms'
import * as HtmlLayouts from './html/html-layouts'
import * as Sources from './sources'
import * as Components from './components'
import * as Renderer from './html/html-renderer'
import * as Logic from '../logic'
import { log } from '../core/context'
import {
  TransformElementGetter,
  TransformRegister,
  TransformSettings,
} from './transforms'
import { LayoutRegister, Transition } from './layouts'
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

export type DataNode = {
  id: NodeId
  props: {
    [prop: string]: any
  }
  childIds: NodeId[]
}

export type AnyProps = {
  [prop: string]: any
}

export type LayoutProps = {
  insertionTransition?: Transition
  removalTransition?: Transition
  showcase?: string
  withEntry?: boolean
  overflow?: 'visible' | 'hidden'
  [prop: string]: any
}

type BaseNode = {
  id: NodeId
  props: {
    sources?: { [type: string]: Sources.NodeSource[] }
    layout?: string
    layoutProps?: LayoutProps
    layoutControls?: boolean

    // IMPLEMENT: Generic properties shared by all nodes:
    muted?: boolean
    hidden?: boolean
    opacity?: number
    size?: { x: number; y: number }
    position?: { x: number; y: number }
    componentChildren?: SceneNode[]
  }
  children: SceneNode[]
}

export type ComponentNode<Props extends {} = AnyProps> = BaseNode & {
  props: {
    /** Component type */
    type?: string
    /** The version of this node's Component its data currently fits */
    version?: string
    componentProps?: Props
  }
}

export type TransformNode<Props extends {} = AnyProps> = BaseNode & {
  props: Props & {
    element?: string
    sourceId?: string
    sourceProps?: {
      [prop: string]: any
    }

    /** @deprecated */
    sourceType?: string
  }
}
// Alias
export type ElementNode<Props extends {} = AnyProps> = TransformNode<Props>

// The crucial difference between SceneNode vs DataNode is that SceneNode has
//  fully-populated children[] rather than childIds[]
// TODO: Can we infer Node type Transform vs Component?
export type SceneNode<Props extends {} = AnyProps> = {
  _deleted?: boolean
} & (TransformNode<Props> | ComponentNode<Props>)

export type VirtualNode<Props extends {} = AnyProps> = SceneNode<Props> & {
  // Applies to a node during render (virtual nodes only)
  render?: {
    methods?: RenderMethods
  }
  props: SceneNode<Props>['props'] & {
    key?: string
  }
  interactionId: string
  sceneNodeId: string
}

export type DB = {
  insert: (
    props: DataNode['props'],
    parentId?: NodeId,
    index?: number,
  ) => Promise<NodeId> | NodeId
  update: (id: NodeId, props: DataNode['props']) => Promise<void> | void
  remove: (id: NodeId) => Promise<void> | void
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
  /** Create a project and return its ID */
  createProject: (metadata?: unknown) => Promise<string> | string
  loadProject: (id: string) => Promise<SceneNode>
  db: (project: Project) => DB
}

export type Settings = {
  dbAdapter?: DBAdapter
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
  projectIdIndex: {
    [nodeId: NodeId]: NodeId
  }
  parentComponentIdIndex: {
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
  loadTree: (
    root: SceneNode,
    settings?: ProjectSettings,
    id?: string,
  ) => Promise<Project>
  loadProject: (id: string, settings?: ProjectSettings) => Promise<Project>
  getProject: (id: string) => Project
  getNodeProject: (id: string) => Project
  getNodeParent: (id: string) => SceneNode
  getNode: <T = SceneNode>(id: string) => T
  lastRenderRemovedIds: Set<string>
  lastRenderIds: Set<string>
}

/**
 */
export interface CompositorInstance extends CompositorBase {
  sources: SourceManager
  components: ComponentManager
  transforms: HtmlTransforms.TransformManager
  layouts: HtmlLayouts.LayoutManager
}

export type RenderMethods = {
  showcase: (id: string | null) => void | Promise<void>
  remove: (id: string) => void | Promise<void>
  reorder: (ids: string[]) => void | Promise<void>
  swap: (idA: string, idB: string) => void | Promise<void>
  move: (id: string, parentId: string) => void | Promise<void>
}

export type RenderSettings = {
  containerEl: HTMLElement
  doubleClickShowcase?: boolean
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
    compositor: CompositorInstance
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
    getParentComponent: (id: NodeId) => SceneNode
    getRoot: () => SceneNode
    insertRoot: (props?: DataNode['props']) => Promise<NodeId>
    indexNode: (node: SceneNode, parentId: string) => void
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

export const getCompositorInstance = () => compositorInstance

// Invoke callback to dispose of an active callback hook
export type Disposable = () => void

let compositorInstance: CompositorInstance
export const start = (settings: Settings): CompositorInstance => {
  if (compositorInstance) return compositorInstance
  const {
    dbAdapter,
    transformSettings = {},
    sourceSettings = {},
    componentSettings = {},
  } = settings

  type ProjectDbMap = { [id: string]: DB }
  const projectDbMap = {} as ProjectDbMap
  const projectIndex = {} as ProjectIndex

  let lastRenderRemovedIds: Set<string>
  let lastRenderIds: Set<string> = new Set()

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
  const parentComponentIdIndex = {} as {
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

    // Restrict callback to once per event loop
    // const debounced = Logic.debounce(cb, 0, { leading: false, trailing: true })
    const debounced = Logic.debounce(cb, 0, { leading: false, trailing: true })

    const id = ++currentSubId
    subscribers.set(id, debounced)
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

  const compositor = {
    nodeIndex,
    parentIdIndex,
    projectIdIndex,
    parentComponentIdIndex,
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
      const id = await dbAdapter.createProject(metadata)
      return compositor.loadProject(id, projectSettings)
    },
    loadProject: (...args) => loadProject(...args),
    loadTree: (...args) => loadTree(...args),
    lastRenderIds,
    lastRenderRemovedIds,
  } as CompositorBase

  const sourceManager = Sources.init(sourceSettings, compositor)
  const componentManager = Components.init(
    componentSettings,
    compositor,
    sourceManager,
  )
  const transformManager = HtmlTransforms.init(
    transformSettings,
    compositor,
    sourceManager,
  )
  const layoutManager = HtmlLayouts.layoutManager

  Object.assign(compositor, {
    layouts: layoutManager,
    transforms: transformManager,
    sources: sourceManager,
    components: componentManager,
  })

  /** Project init */
  const loadProject = async (
    id: string,
    projectSettings: ProjectSettings = {},
  ) => {
    const { dbAdapter } = compositor.settings
    let root = await dbAdapter.loadProject(id)
    const existingProject = compositor.getProject(id)

    projectSettings.size = projectSettings.size ||
      existingProject?.settings.size ||
      root?.props.size || { x: 1280, y: 720 }

    if (existingProject) {
      existingProject.settings = {
        canEdit: true,
        ...existingProject.settings,
        ...projectSettings,
      }
      return existingProject
    }

    return loadTree(root, projectSettings, id)
  }

  /** Project init */
  const loadTree = async (
    root: SceneNode,
    projectSettings: ProjectSettings = {},
    id?: string,
  ) => {
    let { canEdit = true } = projectSettings
    id = id || root.id

    projectSettings.size = projectSettings.size ||
      root?.props.size || { x: 1280, y: 720 }

    projectSettings.canEdit = projectSettings.canEdit || canEdit

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

    const indexNode = (
      node: SceneNode,
      parentId?: string,
      componentId?: string,
    ) => {
      nodeIndex[node.id] = node
      parentIdIndex[node.id] = parentId || parentIdIndex[node.id]
      projectIdIndex[node.id] = id
      parentComponentIdIndex[node.id] =
        componentId || parentComponentIdIndex[node.id]

      // Wrap the node to initialize its source management
      window.setTimeout(() => {
        sourceManager.wrap(node)
      })

      if (node.props.componentChildren) {
        node.props.componentChildren.forEach((x: SceneNode) =>
          // Component ID will be passed down from the topmost component
          indexNode(x, node.id, componentId || node.id),
        )
      }
    }

    // Traverse root and index each node as SceneNode
    forEachDown(root, (node, parent) => {
      indexNode(node, parent?.id)
    })

    const filterLocalSources = (props: SceneNode['props']) => ({
      ...props,
      sources: Logic.omit(props.sources || {}, sourceManager.localSources),
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
            return node
          })
          current.children = children
        }

        // Update the node in memory
        current.props = {
          ...current.props,
          ...props,
          sources: {
            ...(current.props.sources || {}),
            ...(props.sources || {}),
          },
        }

        // Re-index to ensure child/component nodes are indexed
        if (props.componentChildren) {
          indexNode(current)
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
    compositor.lastRenderIds = new Set<string>()
    compositor.lastRenderRemovedIds = new Set<string>()

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
      getParentComponent(id) {
        return nodeIndex[parentComponentIdIndex[id]]
      },
      getElement: (node) => transformManager.getElement(node),
      render(settings) {
        return Renderer.renderProject(project as Project, settings)
      },
      renderVirtualTree() {
        compositor.lastRenderRemovedIds = compositor.lastRenderIds
        compositor.lastRenderIds = new Set()

        const node = project.getRoot()
        projectIdIndex[node.id] = project.id

        let result = componentManager.renderVirtualNode(node)

        // TODO: This will result in redundant NodeRemoved events for non-virtual nodes
        compositor.lastRenderRemovedIds.forEach((x) =>
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
        const componentNode = project.getParentComponent(id)

        // If the node is not part of a component, update it directly
        if (!componentNode) {
          return projectDb.update(id, filterLocalSources(props))
        } else {
          // Update the component node
          return project.update(
            componentNode.id,
            filterLocalSources(componentNode.props),
          )
        }
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
      indexNode,
      compositor: compositor as CompositorInstance,
    } as Partial<Project>

    Object.defineProperty(project, 'nodes', {
      get() {
        return Object.values(nodeIndex).filter(
          (x) => projectIdIndex[x.id] === project.id,
        )
      },
    })

    const projectDb =
      projectDbMap[id] ||
      (dbAdapter
        ? dbAdapter.db(project as Project)
        : ({
            insert: () => Logic.generateId(),
            update: () => {},
            remove: () => {},
          } as DB))
    projectDbMap[id] = projectDb
    projectIndex[id] = project as Project

    triggerEvent('ProjectLoaded', { project })
    return project
  }

  compositorInstance = compositor as CompositorInstance
  return compositorInstance
}
