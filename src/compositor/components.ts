/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import {
  asArray,
  generateId,
  insertAt,
  mapValues,
  memoize,
  swapItems,
} from '../logic'
import {
  PropsDefinition,
  CompositorBase,
  SceneNode,
  Project,
  Disposable,
  ComponentNode,
  AnyProps,
  TransformNode,
  VirtualNode,
  CompositorInstance,
  getCompositorInstance,
} from './compositor'
import { Get } from 'type-fest'
import { SourceManager } from './sources'
import { RenderMethods } from './compositor'
import { Props } from '../core/types'

export type Filter = (node: SceneNode) => SceneNode

// Run the pipeline of filters in order
export const runFilters = (node: SceneNode, filters: Filter[] = []) => {
  return filters.reduce((node, filter) => filter(node), node)
}

export type CommandsInterface<Dict extends ComponentCommands = {}> = {
  // @ts-ignore
  [Key in keyof Dict]: ReturnType<Get<Dict, `${Key}`>>
}
type SourceInterface = ReturnType<SourceManager['wrap']>

type ChildMethods = {
  getChild: <I extends NodeInterface = NodeInterface>(childId: string) => I
  addChildComponent: <I extends NodeInterface = NodeInterface>(
    type: string,
    props?: Partial<I['props']>,
    index?: number,
  ) => Promise<void>
  addChildElement: <
    ElementProps extends Partial<TransformNode['props']> = AnyProps,
  >(
    type: string,
    props?: Partial<ElementProps>,
    sourceId?: string,
    index?: number,
  ) => Promise<void>
  insertChild: (node: SceneNode, index?: number) => Promise<void>
  insertTree: (tree: SceneNode, index?: number) => Promise<void>
  removeChild: (id: string) => Promise<void>
  updateChild: <Props extends {} = AnyProps>(
    id: string,
    props: Props,
  ) => Promise<void>
  reorderChildren: (ids: string[]) => Promise<void>
}

export type NodeInterface<
  Props = AnyProps,
  Commands extends ComponentCommands = {},
  ChildInterface extends NodeInterface = NodeInterface<AnyProps, {}, any>,
> = {
  id: string
  isRoot: boolean
  // The universal compositor instance
  compositor: CompositorInstance
  // The project the node belongs to
  project: Project
  kind: 'Base' | 'Element' | 'Component'
  type: string
  nodeProps: SceneNode['props']
  props: Props
  // Listen to changes to props of the node
  onChange: (cb: (newProps: Props) => void) => Disposable
  // Update the the node props
  update: (props: Partial<Props>) => Promise<void>
  updateNode: (props: Partial<Props>) => Promise<void>
  remove: () => Promise<void>
  // Move the node to another parent
  move: (parentId: string, index?: number) => Promise<void>
  // Swap the node with another node
  swap: (nodeId: string) => Promise<void>
  sources: SourceInterface
  execute: CommandsInterface<Commands> & {
    [name: string]: (...args: unknown[]) => any
  }
  render: Component['render']
  getParent: () => NodeInterface
  children: ChildInterface[]
  toNode: () => SceneNode
} & ChildMethods

type x = Component['children']
const x = {} as x

export type ComponentCommand<
  Props extends AnyProps = {},
  C extends Component = Component,
> = (
  context: NodeInterface<Props, C['commands']>,
) => (...args: unknown[]) => unknown

export type ComponentCommands<Props = {}> = {
  [name: string]: ComponentCommand<Props>
}

type RenderHelpers = {
  id: (id: string) => string
  renderChildren: (
    map?: (children: NodeInterface[]) => NodeInterface[],
    settings?: { controls: boolean },
  ) => SceneNode
  renderNode: (
    props: SceneNode['props'] & { key: string },
    children?: Array<SceneNode | undefined | null>,
  ) => SceneNode
}

type CreateComponent = (
  type: string,
  props?: {
    [prop: string]: any
  },
  sources?: {
    [type: string]: { [prop: string]: unknown }[]
  },
  children?: SceneNode[],
) => SceneNode

export type Component<
  ComponentInterface extends NodeInterface = NodeInterface,
  ChildInterface extends NodeInterface = NodeInterface,
> = {
  /** The name of the component */
  name: string
  version: string
  // TODO: Child declaration
  children?: {
    validate?: (props: ChildInterface['props']) => boolean
  }
  commands?: ComponentInterface['execute']
  /** The list of sources that can be assigned to this node */
  sources?: string[]
  /** Returns valid component props used to persist a new Node */
  create: (
    props: Props,
    children?: SceneNode<ChildInterface['props']>[],
  ) => { [prop: string]: any }
  render: (context: ComponentInterface, helpers: RenderHelpers) => SceneNode
  /** The properties associated with an individual Component */

  // TODO:
  // props?: PropsDefinition

  /**
   * TODO: Determine if necessary
   *
   * Recreate a node while preserving as many properties as can be salvaged.
   * This is used to repair a broken node and should be removed once component
   * versioning has eliminated the possibility of a node entering a broken state.
   */
  // recreate?: () => NewNode

  migrations: ComponentMigration[]
  // TODO:
  // postFilter?: Array<(el: HTMLElement | any) => HTMLElement | any>
}

// A helper to ensure typescript types are accessible
// TODO: Remove if unneeded
// export const declareComponent = <Props, T extends Component<Props>>(
//   component: T,
// ) => {
//   return {
//     ...component,
//     ...{ commands: component.commands },
//   } as const
// }

// TODO:
export type ComponentMigration = Function

export type ComponentMap = {
  [type: string]: Component
}

export type ComponentRegister = (declaration: Component | Component[]) => void

// Note: Currently no settings are supported
export type ComponentSettings = {}

export const init = (
  settings: ComponentSettings = {},
  compositor: CompositorBase,
  sourceManager: SourceManager,
) => {
  const components = {} as ComponentMap

  const registerComponent: ComponentRegister = (declaration) => {
    asArray(declaration).forEach((x) => {
      // TODO: Validation
      if (!x.name) throw Error('Component cannot be registered without `name`')
      if (components[x.name])
        throw Error(`Component already registered with name ${x.name}`)

      components[x.name] = x
      Object.entries(x.commands || {}).forEach(([commandName, command]) => {
        compositor.registerCommand(
          `${x.name}.${commandName}`,
          (nodeId: string, ...args: unknown[]) => {
            const nodeInterface = getNodeInterface(nodeId)
            command(nodeInterface)(...args)
          },
        )
      })
    })
  }

  const _createComponent: (
    projectId?: string,
    parentId?: string,
  ) => CreateComponent =
    (projectId, parentId) =>
    (type, props = {}, sources = {}): ComponentNode => {
      const component = getComponent(type)
      if (!component) {
        throw new Error(
          `Component type ${type} could not be created: Not Found`,
        )
      }

      const defaultSources = (component.sources || []).reduce(
        (acc, sourceType) => {
          return {
            ...acc,
            [sourceType]: [],
          }
        },
        {},
      )

      const id = generateId()
      const childNode = {
        id,
        props: {},
        children: [],
      } as ComponentNode

      // Index the node before initializing it:
      if (projectId) {
        const project = compositor.getProject(projectId)
        project.indexNode(childNode, parentId)
      }

      childNode.props = {
        type,
        sources: {
          ...defaultSources,
          ...mapValues(sources, (list) =>
            list.map((x) => ({
              id: generateId(),
              props: x,
            })),
          ),
        },
        componentProps: component.create(props),
        componentChildren: [],
      }

      return childNode
    }

  const nodeInterfaceIndex = {} as {
    [nodeId: string]: NodeInterface
  }

  const getNodeInterface = <I extends NodeInterface = NodeInterface>(
    nodeId: string,
    shallow = false,
  ): I => {
    let existing = nodeInterfaceIndex[nodeId] as I
    const node = compositor.getNode(nodeId)
    if (!node) return null

    const getInterfaceChildren = () => {
      return (node.props.componentChildren || node.children).map((x) => {
        return getNodeInterface(x.id)
      })
    }

    const getParent = () => {
      return getNodeInterface(compositor.parentIdIndex[node.id])
    }

    if (existing) {
      Object.assign(existing, {
        nodeProps: node.props,
        props:
          existing.kind === 'Component'
            ? node.props.componentProps
            : node.props,
        children: getInterfaceChildren(),
      })
      return existing
    }
    const project = compositor.getNodeProject(node.id)

    let kind = 'Base'
    if ((node as ComponentNode).props.type) {
      kind = 'Component'
    } else if ((node as TransformNode).props.element) {
      kind = 'Element'
    }

    const component = getComponent(node.props.type)

    const insertChild = (childNode: SceneNode, index?: number) => {
      const previous = node.props.componentChildren || []
      const current = insertAt(
        typeof index === 'number' ? index : previous.length,
        childNode,
        previous,
      )
      return project.update(node.id, {
        ...node.props,
        componentChildren: current,
      })
    }

    const createComponent = _createComponent(project.id, node.id)

    const result = {
      id: node.id,
      isRoot: !Boolean(compositor.parentIdIndex[node.id]),
      compositor: getCompositorInstance(),
      project,
      kind,
      type:
        kind === 'Component'
          ? (node as ComponentNode).props.type
          : (node as TransformNode).props.element,
      props:
        kind === 'Component'
          ? (node as ComponentNode).props.componentProps || {}
          : (node as TransformNode).props,
      nodeProps: node.props,
      render: component
        ? component.render
        : () => {
            return {
              ...node,
              children: [
                ...(node.children || []),
                ...(node.props.componentChildren || []),
              ].map((x) => {
                return renderVirtualNode(x, node.id)
              }),
            }
          },
      updateNode: (props) => project.update(node.id, props),
      // TODO: Should update componentProps even for ElementNode
      update: (props) => project.update(node.id, props),
      remove: () => getParent()?.removeChild(node.id),
      move: async (newParentId, index) => {
        const currentParent = getParent()

        // If the drop node is the current parent, do nothing
        if (newParentId === currentParent.id) return

        await Promise.all([
          currentParent.removeChild(node.id),
          getNodeInterface(newParentId).insertChild(
            compositor.getNode(node.id),
            index,
          ),
        ])
        return
      },
      swap: async (idB: string) => {
        if (idB === node.id) return
        const currentParentIdB = getNodeIdForVirtual(
          compositor.parentIdIndex[getNodeIdForVirtual(idB)],
        )

        const parentA = getParent()
        const parentB = getNodeInterface(currentParentIdB)

        if (parentA.id === parentB.id) {
          // Reorder instead
          const ids = swapItems(
            node.id,
            idB,
            parentA.children.map((x) => x.id),
          )
          return parentA.reorderChildren(ids)
        }

        const indexA = parentA.children.findIndex((x) => x.id === node.id)
        const indexB = parentB.children.findIndex((x) => x.id === idB)

        // Swap the nodes between parents
        await Promise.all([
          parentA.removeChild(node.id),
          parentB.removeChild(idB),
          parentA.insertChild(compositor.getNode(idB), indexA),
          parentB.insertChild(compositor.getNode(node.id), indexB),
        ])
        return
      },
      sources: sourceManager.wrap(node),
      execute: {},
      children: shallow ? [] : getInterfaceChildren(),
      onChange: (cb) => {
        return compositor.on('NodeChanged', ({ nodeId }) => {
          if (nodeId !== node.id) return
          cb(compositor.getNode(nodeId)?.props)
        })
      },
      getChild: (id) => {
        const nodeInterface = getNodeInterface<I>(node.id)
        return nodeInterface.children.find((x) => x.id === id)
      },
      getParent,
      insertChild,
      insertTree: async (tree, index) => {
        const initializeTree = (node: SceneNode, parent: SceneNode) => {
          const id = generateId()
          const newNode = {
            id,
            props: {
              ...node.props,
              componentChildren: (node.props.componentChildren || []).map((x) =>
                initializeTree(x, node),
              ),
            },
            children: node.children.map((x) => initializeTree(x, node)),
          } as SceneNode
          // Index the node before initializing it:
          project.indexNode(newNode, parent.id)
          return newNode
        }

        await result.insertChild(initializeTree(tree, node), index)
      },
      addChildComponent: (type, props = {}, index) => {
        const node = createComponent(type, props)
        return insertChild(node, index)
      },
      addChildElement: (type, props = {}, sourceId, index) => {
        const node = {
          id: generateId(),
          props: {
            element: type,
            ...props,
            sourceId,
          },
          children: [],
        } as TransformNode
        return insertChild(node, index)
      },
      removeChild: (id) => {
        const previous = node.props.componentChildren || []
        const current = previous.filter((x) => x.id !== id)
        return project.update(node.id, {
          ...node.props,
          componentChildren: current,
        })
      },
      updateChild: (id, props) => {
        const nodeInterface = getNodeInterface(node.id)
        const childNodes = nodeInterface.children || []
        const childNode = childNodes.find((x) => x.id === id)
        if (!childNode) return

        // If the node is a component, update its componentProps
        if (childNode.props.type) {
          childNode.props.componentProps = {
            ...(childNode.props.componentProps || {}),
            ...props,
          }
        } else {
          childNode.props = {
            ...childNode.props,
            ...props,
          }
        }

        return project.update(node.id, {
          ...node.props,
          componentChildren: childNodes,
        })
      },
      reorderChildren: (ids) => {
        const previous = node.props.componentChildren || []
        const current = ids.map((x) => previous.find((y) => y.id === x))

        return project.update(node.id, {
          ...node.props,
          componentChildren: current,
        })
      },
      toNode: () => compositor.nodeIndex[nodeId],
    } as NodeInterface<any, any>

    if (kind === 'Component') {
      result.props = node.props.componentProps
      result.execute = Object.entries(component?.commands || {}).reduce(
        (acc, [name, fn]) => {
          return {
            ...acc,
            [name]: (...args: unknown[]) =>
              fn({ ...getNodeInterface(node.id) })(...args),
          }
        },
        {},
      )
      result.update = async (props) => {
        await project.update(node.id, {
          ...node.props,
          componentProps: { ...node.props.componentProps, ...props },
        })
      }
    }

    return result as I
  }

  const getComponent = (type: string) => components[type]

  // Get the stored SceneNode corresponding to the virtual node
  const getNodeIdForVirtual = (id: string) => {
    return virtualSceneNodeIdIndex[id] || id
  }

  const getVirtualNode = (id: string) => {
    return virtualNodeIndex[id]
  }

  // An index of virtual render nodes
  const virtualNodeIndex = {} as { [id: string]: VirtualNode }

  // A map of virtual render nodes to their SceneNode
  const virtualSceneNodeIdIndex = {} as { [id: string]: string }

  // @ts-ignore Debug helper
  window.virtualSceneNodeIdIndex = virtualSceneNodeIdIndex

  const renderVirtualNode = (
    node: SceneNode | NodeInterface,
    parentId?: string,
  ): VirtualNode => {
    if (!virtualSceneNodeIdIndex[node.id]) {
      virtualSceneNodeIdIndex[node.id] = node.id
    }

    let transformManager = getCompositorInstance().transforms

    compositor.lastRenderIds.add(node.id)
    compositor.lastRenderRemovedIds.delete(node.id)

    // Run children through node's filter pipeline
    // TODO: Figure this out
    // const filters = [] as Components.Filter[]
    // const result = runFilters(node, filters)

    const nodeInterface = getNodeInterface(node.id)

    if (!nodeInterface) {
      virtualNodeIndex[node.id] = node as VirtualNode
      // Pass update to the existing element
      const element = transformManager.getElement(node)
      element?._onUpdateHandlers.forEach((x) => x(node.props || {}))
      // Ensure node has the proper source based on its props
      transformManager.updateSourceForNode(node.id)
      return {
        ...node,
        sceneNodeId: virtualSceneNodeIdIndex[node.id],
        interactionId: node.id,
      } as VirtualNode
    }

    const keyToId = (id: string) => `${node.id}-${id}`
    const renderNode: RenderHelpers['renderNode'] = (props, children = []) => {
      if (!props.key) console.warn('Every child should have a `key`')
      const id = keyToId(props.key || 'child')

      virtualSceneNodeIdIndex[id] = node.id

      return renderVirtualNode(
        {
          id,
          props,
          children: children.filter(Boolean),
        },
        node.id,
      )
    }

    const virtualNode = {
      ...nodeInterface.render(nodeInterface, {
        id: keyToId,
        renderChildren: (map = (x) => x, settings = { controls: false }) => {
          const containerNode = renderNode(
            {
              layout: nodeInterface.nodeProps.layout,
              layoutProps: nodeInterface.nodeProps.layoutProps,
              key: '__children',
            },
            map(nodeInterface.children).map((x) => {
              return renderVirtualNode(x, node.id)
            }),
          )
          return {
            ...containerNode,
            render: settings.controls
              ? {
                  methods: {
                    showcase: async (id: string) => {
                      await nodeInterface.updateNode({
                        layoutProps: {
                          ...node.props.layoutProps,
                          showcase: id,
                        },
                      })
                      return
                    },
                    remove: async (id: string) => {
                      await nodeInterface.removeChild(id)
                      return
                    },
                    move: async (id: string, parentId: string) => {
                      const currentParentId = getNodeIdForVirtual(
                        compositor.parentIdIndex[getNodeIdForVirtual(id)],
                      )
                      const newParentId = getNodeIdForVirtual(parentId)

                      // If the drop node is the current parent, do nothing
                      if (newParentId === currentParentId) return

                      await Promise.all([
                        getNodeInterface(currentParentId).removeChild(id),
                        getNodeInterface(newParentId).insertChild(
                          compositor.getNode(id),
                        ),
                      ])
                      return
                    },
                    swap: async (idA: string, idB: string) => {
                      const currentParentIdA = getNodeIdForVirtual(
                        compositor.parentIdIndex[getNodeIdForVirtual(idA)],
                      )
                      const currentParentIdB = getNodeIdForVirtual(
                        compositor.parentIdIndex[getNodeIdForVirtual(idB)],
                      )

                      const parentA = getNodeInterface(currentParentIdA)
                      const parentB = getNodeInterface(currentParentIdB)

                      if (parentA.id === parentB.id) {
                        // Reorder instead
                        const ids = swapItems(
                          idA,
                          idB,
                          nodeInterface.children.map((x) => x.id),
                        )
                        return nodeInterface.reorderChildren(ids)
                      }

                      const indexA = parentA.children.findIndex(
                        (x) => x.id === idA,
                      )
                      const indexB = parentB.children.findIndex(
                        (x) => x.id === idB,
                      )

                      // Swap the nodes between parents
                      await Promise.all([
                        parentA.removeChild(idA),
                        parentB.removeChild(idB),
                        parentA.insertChild(compositor.getNode(idB), indexA),
                        parentB.insertChild(compositor.getNode(idA), indexB),
                      ])
                      return
                    },
                    reorder: async (ids: string[]) => {
                      await nodeInterface.reorderChildren(ids)
                      return
                    },
                  } as RenderMethods,
                }
              : {},
          }
        },
        renderNode,
      }),
      sceneNodeId: virtualSceneNodeIdIndex[node.id],
      interactionId: node.id,
    }
    virtualNodeIndex[node.id] = virtualNode
    // Pass update to the existing element
    const element = transformManager.getElement(node)
    element?._onUpdateHandlers.forEach((x) => x(node.props || {}))

    // Ensure node has the proper source based on its props
    transformManager.updateSourceForNode(node.id)
    return virtualNode
  }

  const useNodeInterface = (
    nodeId: string,
    cb: (tree: NodeInterface) => void,
  ) => {
    cb(getNodeInterface(nodeId))

    return compositor.on(
      'NodeChanged',
      () => {
        cb(getNodeInterface(nodeId))
      },
      nodeId,
    )
  }

  const componentManager = {
    components,
    getComponent,
    useNodeInterface,
    getNodeInterface,
    registerComponent,
    renderVirtualNode,
    getVirtualNode,
    createTempComponent: _createComponent(),
  }
  return componentManager
}

export type ComponentManager = ReturnType<typeof init>
