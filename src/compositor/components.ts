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

type ChildMethods<ChildTypes = never> = {
  getChild: <I extends NodeInterface = NodeInterface>(
    childId: string,
    childCollection?: ChildTypes,
  ) => I
  getChildren: (childCollection?: ChildTypes) => NodeInterface[]
  addChildComponent: <I extends NodeInterface = NodeInterface>(
    type: string,
    props: Partial<I['props']>,
    childCollection?: ChildTypes,
    index?: number,
  ) => Promise<void>
  addChildElement: <
    ElementProps extends Partial<TransformNode['props']> = AnyProps,
  >(
    type: string,
    props: Partial<ElementProps>,
    sourceId?: string,
    childCollection?: ChildTypes,
    index?: number,
  ) => Promise<void>
  removeChild: (id: string, childCollection?: ChildTypes) => Promise<void>
  updateChild: <Props extends {} = AnyProps>(
    id: string,
    props: Props,
    childCollection?: ChildTypes,
  ) => Promise<void>
  reorderChildren: (
    ids: string[],
    childCollection?: ChildTypes,
  ) => Promise<void>
}

export type NodeInterface<
  Props = AnyProps,
  Declaration extends Partial<Component> = {},
> = {
  id: string
  kind: 'Base' | 'Element' | 'Component'
  type: string
  props: Props
  // Update the the node props
  update: (props: Partial<Props>) => void
  sources: SourceInterface
  execute: CommandsInterface<Declaration['commands']>
  children: {
    [childCollection in keyof Declaration['children']]: NodeInterface<AnyProps>[]
  }
} & ChildMethods<keyof Declaration['children']>

// TODO:
type ChildDeclaration = { [childType: string]: any }

type x = Component['children']
const x = {} as x

export type ComponentContext<
  Props = {},
  Children extends ChildDeclaration = {},
  Commands extends ComponentCommands = {},
> = {
  // The node ID
  id: string
  // The project the node belongs to
  project: Project
  // The node props
  props: Props
  // The node props
  children: { [name in keyof Children]: SceneNode[] }
  createComponent: CreateComponent
  // Update the the node in context
  update: (props: Partial<Props>) => void
  // Execute a command on the node in context
  execute: CommandsInterface<Commands> & {
    [name: string]: (...args: unknown[]) => any
  }
  // Execute a source method on the node in context
  sources: SourceInterface
  // Listen to changes to props of the node
  onChange: (cb: (newProps: Props) => void) => Disposable
} & ChildMethods<keyof Children>

export type ComponentCommand<Props = {}> = (
  context: ComponentContext<Props>,
) => (...args: unknown[]) => unknown

export type ComponentCommands<Props = {}> = {
  [name: string]: ComponentCommand<Props>
}

type RenderHelpers = {
  id: (id: string) => string
  renderNode: (
    props: SceneNode['props'] & { key: string },
    children: SceneNode[],
  ) => SceneNode
  renderMethods: (childType: string) => RenderMethods
}

type CreateComponent = (
  type: string,
  props?: {
    [prop: string]: any
  },
  sources?: {
    [type: string]: { [prop: string]: unknown }[]
  },
  children?: { [collectionName: string]: SceneNode[] },
) => SceneNode

export type Component<
  Props = {},
  Children extends ChildDeclaration = {},
  Commands extends ComponentCommands<Props> = {},
> = {
  /** The name of the component */
  name: string
  version: string
  children?: {
    // TODO: Child declaration
    [name in keyof Children]: any
  }
  commands?: Commands
  /** The list of sources that can be assigned to this node */
  sources?: string[]
  /** Returns valid component props used to persist a new Node */
  create: (
    props: Props,
    children?: ComponentNode['props']['componentChildren'],
  ) => { [prop: string]: any }
  render: (
    context: ComponentContext<Props, Children>,
    helpers: RenderHelpers,
  ) => SceneNode
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
  // init?: () => void
  // TODO:
  // preFilter?: Array<(node: SceneNode) => SceneNode>
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
  [type: string]: Component<unknown, unknown, ComponentCommands<unknown>>
}

export type ComponentRegister = (
  declaration:
    | Component<unknown, unknown, ComponentCommands<unknown>>
    | Component<unknown, unknown, ComponentCommands<unknown>>[],
) => void

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
            const node = compositor.getNode(nodeId)
            const context = getNodeContext(node.id)
            command(context)(...args)
          },
        )
      })
    })
  }

  const getNodeComponentChildren = (nodeId: string) => {
    const node = compositor.getNode<ComponentNode>(nodeId)
    const component = getComponent(node.props.type)
    return Object.keys(component?.children || {}).reduce(
      (acc, x) => ({
        ...acc,
        [x]: (node.props.componentChildren || {})[x] || [],
      }),
      {},
    )
  }

  const storedContext = {} as { [nodeId: string]: ComponentContext }

  const _createComponent: (
    projectId?: string,
    parentId?: string,
  ) => CreateComponent =
    (projectId, parentId) =>
    (type, props = {}, sources = {}, children = {}): ComponentNode => {
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

      const componentChildren = Object.keys(component.children || {}).reduce(
        (acc, x) => ({ ...acc, [x]: children[x] || [] }),
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
        componentProps: component.create(props, componentChildren),
        componentChildren,
      }

      return childNode
    }

  const getNodeContext = (nodeId: string) => {
    const node = compositor.getNode<ComponentNode>(nodeId)
    if (storedContext[nodeId]) {
      return {
        ...storedContext[nodeId],
        props: node.props.componentProps,
        children: getNodeComponentChildren(node.id),
      }
    }

    const addChild = (
      childCollection: string,
      childNode: SceneNode,
      index: number,
    ) => {
      const previous = node.props.componentChildren?.[childCollection] || []
      const current = insertAt(index || previous.length, childNode, previous)
      return project.update(node.id, {
        ...node.props,
        componentChildren: { [childCollection]: current },
      })
    }

    const project = compositor.getNodeProject(node.id)

    const createComponent = _createComponent(project.id, node.id)

    const context = {
      id: node.id,
      project,
      props: node.props.componentProps,
      children: getNodeComponentChildren(node.id),
      execute: {},
      query: {},
      sources: sourceManager.wrap(node),
      createComponent,
      getChild: (id, childCollection) => {
        const list = context.getChildren(childCollection)
        return list.find((x) => x.id === id)
      },
      getChildren: (childCollection) => {
        const nodeInterface = getNodeInterface<NodeInterface>(node.id)
        return nodeInterface.children?.[childCollection] || []
      },
      addChildComponent: (type, props, childCollection, index) => {
        const node = createComponent(type, props)
        return addChild(childCollection, node, index)
      },
      addChildElement: (type, props, sourceId, childCollection, index) => {
        const node = {
          id: generateId(),
          props: {
            element: type,
            ...props,
            sourceId,
          },
          children: [],
        } as TransformNode
        return addChild(childCollection, node, index)
      },
      removeChild: (id, childCollection) => {
        const previous = node.props.componentChildren?.[childCollection] || []
        const current = previous.filter((x) => x.id !== id)
        return project.update(node.id, {
          ...node.props,
          componentChildren: { [childCollection]: current },
        })
      },
      updateChild: (id, props, childCollection) => {
        const childNodes = node.props.componentChildren?.[childCollection] || []
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
          componentChildren: { [childCollection]: childNodes },
        })
      },
      reorderChildren: (ids, childCollection) => {
        const previous = node.props.componentChildren?.[childCollection] || []
        const current = ids.map((x) => previous.find((y) => y.id === x))

        return project.update(node.id, {
          ...node.props,
          componentChildren: { [childCollection]: current },
        })
      },
      onChange: (cb) => {
        return compositor.on('NodeChanged', ({ nodeId }) => {
          if (nodeId !== node.id) return
          cb(compositor.getNode(nodeId)?.props)
        })
      },
      update: (props) => {
        project.update(node.id, {
          ...node.props,
          componentProps: { ...node.props.componentProps, ...props },
        })
      },
    } as ComponentContext<unknown>

    const component = componentManager.getComponent(node.props.type)

    const execute = Object.entries(component?.commands || {}).reduce(
      (acc, [name, fn]) => {
        return {
          ...acc,
          [name]: (...args: unknown[]) =>
            fn({ ...getNodeContext(node.id) })(...args),
        }
      },
      {},
    )

    // @ts-ignore
    context.execute = execute
    storedContext[nodeId] = context
    return context
  }

  const getNodeInterface = <I extends NodeInterface = NodeInterface>(
    nodeId: string,
    shallow = false,
  ): I => {
    const node = compositor.getNode(nodeId)

    const children = getNodeComponentChildren(
      nodeId,
    ) as ComponentNode['props']['componentChildren']

    let kind = 'Base'
    if ((node as ComponentNode).props.type) {
      kind = 'Component'
    } else if ((node as TransformNode).props.element) {
      kind = 'Element'
    }

    const context = getNodeContext(node.id)

    const nodeInterface = {
      id: node.id,
      kind,
      type:
        kind === 'Component'
          ? (node as ComponentNode).props.type
          : (node as TransformNode).props.element,
      props:
        kind === 'Component'
          ? (node as ComponentNode).props.componentProps || {}
          : (node as TransformNode).props,
      update:
        kind === 'Component'
          ? context.update
          : (props) => context.project.update(node.id, props),
      sources: sourceManager.wrap(node),
      execute: context.execute,
      children: shallow
        ? []
        : Object.keys(children).reduce(
            (acc, x) => ({
              ...acc,
              [x]: children[x].map((x) => getNodeInterface(x.id)),
            }),
            {},
          ),
      getChild: context.getChild,
      getChildren: context.getChildren,
      addChildComponent: context.addChildComponent,
      addChildElement: context.addChildElement,
      updateChild: context.updateChild,
      removeChild: context.removeChild,
      reorderChildren: context.reorderChildren,
    } as NodeInterface

    if (kind === 'Component') {
      nodeInterface.props = node.props.componentProps
    }

    return nodeInterface as I
  }

  const getComponent = (type: string) => components[type]

  const getChildRenderMethods = memoize(
    (nodeId: string, childCollection: string) => {
      const context = getNodeContext(nodeId)

      return {
        remove: (id: string) => {
          // @ts-ignore
          return context.removeChild(id, childCollection)
        },
        reorder: (ids: string[]) => {
          // @ts-ignore
          return context.reorderChildren(ids, childCollection)
        },
      } as RenderMethods
    },
  )

  const renderVirtualNode = (node: SceneNode) => {
    const component = getComponent(node.props.type)
    if (!component) return node

    const context = getNodeContext(node.id)
    const keyToId = (id: string) => `${node.id}-${id}`

    return component.render(context, {
      id: keyToId,
      renderNode: (props = { key: generateId() }, children = []) => {
        return {
          id: keyToId(props.key),
          props,
          children,
        }
      },
      renderMethods: (childType: string) =>
        getChildRenderMethods(node.id, childType),
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
