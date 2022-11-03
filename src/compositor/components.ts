/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { asArray, generateId, insertAt, mapValues, memoize } from '../logic'
import type {
  PropsDefinition,
  CompositorBase,
  SceneNode,
  Project,
  Disposable,
  ComponentNode,
  AnyProps,
  TransformNode,
  VirtualNode,
} from './compositor'
import { Get } from 'type-fest'
import { SourceManager } from './sources'
import { RenderMethods } from './renderer'
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
    props: Partial<I['props']>,
    index?: number,
  ) => Promise<void>
  addChildElement: <
    ElementProps extends Partial<TransformNode['props']> = AnyProps,
  >(
    type: string,
    props: Partial<ElementProps>,
    sourceId?: string,
    index?: number,
  ) => Promise<void>
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
  // The project the node belongs to
  project: Project
  kind: 'Base' | 'Element' | 'Component'
  type: string
  props: Props
  // Listen to changes to props of the node
  onChange: (cb: (newProps: Props) => void) => Disposable
  // Update the the node props
  update: (props: Partial<Props>) => void
  sources: SourceInterface
  execute: CommandsInterface<Commands> & {
    [name: string]: (...args: unknown[]) => any
  }
  render: Component['render']
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
    props: SceneNode['props'],
    map?: (children: NodeInterface[]) => NodeInterface[],
    settings?: { controls: boolean },
  ) => SceneNode
  renderNode: (
    props: SceneNode['props'] & { key: string },
    children: SceneNode[],
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
    (type, props = {}, sources = {}, children = []): ComponentNode => {
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
        children,
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
        componentProps: component.create(props, children),
        componentChildren: children,
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
    const getInterfaceChildren = () => {
      return (node.props.componentChildren || node.children).map((x) =>
        getNodeInterface(x.id),
      )
    }

    if (existing) {
      Object.assign(existing, {
        props:
          existing.kind === 'Component'
            ? node.props.componentProps
            : node.props,
        children: getInterfaceChildren(),
      })
      return existing
    }
    const project = compositor.getNodeProject(node.id)

    // const createComponent = _createComponent(project.id, node.id)

    let kind = 'Base'
    if ((node as ComponentNode).props.type) {
      kind = 'Component'
    } else if ((node as TransformNode).props.element) {
      kind = 'Element'
    }

    const component = getComponent(node.props.type)

    const addChild = (childNode: SceneNode, index: number) => {
      const previous = node.props.componentChildren || []
      const current = insertAt(index || previous.length, childNode, previous)
      return project.update(node.id, {
        ...node.props,
        componentChildren: current,
      })
    }

    const createComponent = _createComponent(project.id, node.id)

    const result = {
      id: node.id,
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
      render: component
        ? component.render
        : () => {
            return {
              ...node,
              children: node.children.map((x) => renderVirtualNode(x, node.id)),
            }
          },
      update: (props) => project.update(node.id, props),
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
      addChildComponent: (type, props, index) => {
        const node = createComponent(type, props)
        return addChild(node, index)
      },
      addChildElement: (type, props, sourceId, index) => {
        const node = {
          id: generateId(),
          props: {
            element: type,
            ...props,
            sourceId,
          },
          children: [],
        } as TransformNode
        return addChild(node, index)
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
      result.update = (props) => {
        project.update(node.id, {
          ...node.props,
          componentProps: { ...node.props.componentProps, ...props },
        })
      }
    }

    return result as I
  }

  const getComponent = (type: string) => components[type]

  const renderVirtualNode = (
    node: SceneNode | NodeInterface,
    parentId: string,
  ): VirtualNode => {
    // Ensure index in case it's a virtual node
    compositor.nodeIndex[node.id] = (node as NodeInterface).toNode
      ? (node as NodeInterface).toNode()
      : node
    compositor.parentIdIndex[node.id] = parentId
    compositor.projectIdIndex[node.id] =
      compositor.projectIdIndex[node.id] || compositor.projectIdIndex[parentId]

    const nodeInterface = getNodeInterface(node.id)

    const keyToId = (id: string) => `${node.id}-${id}`
    const renderNode: RenderHelpers['renderNode'] = (
      props,
      children = [],
    ) => {
      if (!props.key) console.warn('Every child should have a `key`')
      const id = keyToId(props.key || 'child')

      return renderVirtualNode(
        {
          id,
          props,
          children,
        },
        node.id,
      )
    }

    return nodeInterface.render(nodeInterface, {
      id: keyToId,
      renderChildren: (props, map, settings = { controls: false }) => {
        const containerNode = renderNode(
          {
            ...props,
            key: '__children',
          },
          nodeInterface.children,
          false,
        )
        return {
          ...containerNode,
          render: settings.controls
            ? {
                methods: {
                  remove: (id: string) => {
                    return nodeInterface.removeChild(id)
                  },
                  reorder: (ids: string[]) => {
                    return nodeInterface.reorderChildren(ids)
                  },
                },
              }
            : {},
        }
      },
      renderNode,
    })
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
    createTempComponent: _createComponent(),
  }
  return componentManager
}

export type ComponentManager = ReturnType<typeof init>
