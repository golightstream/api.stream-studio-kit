/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { asArray, generateId, mapValues } from '../logic'
import type {
  PropsDefinition,
  CompositorBase,
  SceneNode,
  Project,
  Disposable,
} from './compositor'
import { Get } from 'type-fest'
import { SourceManager } from './sources'
import CoreContext from '../core/context'

export type Filter = (node: SceneNode) => SceneNode

// Run the pipeline of filters in order
export const runFilters = (node: SceneNode, filters: Filter[] = []) => {
  return filters.reduce((node, filter) => filter(node), node)
}

export type CommandsInterface<Dict extends ComponentCommands = {}> = {
  // @ts-ignore
  [Key in keyof Dict]: ReturnType<Get<Dict, `${Key}`>>
}
export type QueriesInterface<Dict extends ComponentQueries = {}> = {
  // @ts-ignore
  [Key in keyof Dict]: ReturnType<Get<Dict, `${Key}`>>
}
type SourceInterface = ReturnType<SourceManager['wrap']>

export type ComponentInterface<
  Commands extends ComponentCommands = {},
  Queries extends ComponentQueries = {},
> = {
  execute: CommandsInterface<Commands>
  query: QueriesInterface<Queries>
  source: SourceInterface
}

// Extend a scene node with the props expected by a component
export type ComponentNode<Props = {}> = {
  id?: string
  props: SceneNode['props'] & {
    componentProps: Props
  }
}

export type ComponentContext<
  Props = {},
  Commands extends ComponentCommands = {},
  Queries extends ComponentQueries = {},
> = {
  // The node ID
  id: string
  // The node props
  props: Props
  // Update the the node in context
  update: (props: Partial<Props>) => void
  // Execute a command on the node in context
  execute: CommandsInterface<Commands> & {
    [name: string]: (...args: unknown[]) => unknown
  }
  // Execute a query on the node in context
  query: QueriesInterface<Queries> & {
    [name: string]: (...args: unknown[]) => unknown
  }
  // Execute a source method on the node in context
  source: SourceInterface
  // Listen to changes to props of the node
  onChange: (cb: (newProps: Props) => void) => Disposable
}

export type ComponentCommand<Props = {}> = (
  context: ComponentContext<Props>,
) => (...args: unknown[]) => unknown

export type ComponentCommands<Props = {}> = {
  [name: string]: ComponentCommand<Props>
}

export type ComponentQuery<Props = {}> = (
  context: ComponentContext<Props>,
) => (...args: unknown[]) => unknown

export type ComponentQueries<Props = {}> = {
  [name: string]: ComponentQuery<Props>
}

type RenderHelpers = {
  id: (id: string) => string
  randomId: (slug?: string) => string
  source: SourceInterface
}

export type Component<
  Props = {},
  Commands extends ComponentCommands<Props> = {},
  Queries extends ComponentQueries<Props> = {},
> = {
  /** The name of the component */
  name: string
  version: string
  commands?: Commands
  queries?: Queries
  /** The list of sources that can be assigned to this node */
  sources?: string[]
  /** Returns valid component props used to persist a new Node */
  create: (props: Props) => { [prop: string]: any }
  render: (props: Props, helpers: RenderHelpers) => SceneNode
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
  [name: string]: Component<
    unknown,
    ComponentCommands<unknown>,
    ComponentQueries<unknown>
  >
}

export type ComponentRegister = (
  declaration:
    | Component<unknown, ComponentCommands<unknown>>
    | Component<unknown, ComponentCommands<unknown>>[],
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
            const context = getNodeContext(node)
            command(context)(...args)
          },
        )
      })
    })
  }

  const nodeCommands = {} as { [nodeId: string]: any }

  const getNodeContext = (node: SceneNode) => {
    const project = compositor.getNodeProject(node.id)
    const context = {
      id: node.id,
      props: node.props.componentProps,
      execute: {},
      query: {},
      source: sourceManager.wrap(node),
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
        // TODO: Remove this - update compositor directly
        CoreContext.triggerInternal('NodeChanged', {
          projectId: project.id,
          nodeId: node.id,
        })
      },
    } as ComponentContext<unknown>

    const component = componentManager.getComponent(node.props.type)

    const execute = Object.entries(component.commands || {}).reduce(
      (acc, [name, fn]) => {
        return {
          ...acc,
          [name]: (...args: unknown[]) =>
            fn({ ...getNodeContext(node) })(...args),
        }
      },
      {},
    )

    const query = Object.entries(component.queries || {}).reduce(
      (acc, [name, fn]) => {
        return {
          ...acc,
          [name]: (...args: unknown[]) =>
            fn({ ...getNodeContext(node) })(...args),
        }
      },
      {},
    )

    // @ts-ignore
    context.execute = execute
    // @ts-ignore
    context.query = query
    return context
  }

  const getNodeComponent = (nodeId: string): ComponentInterface => {
    if (nodeCommands[nodeId]) return nodeCommands[nodeId]

    const node = compositor.getNode(nodeId)
    const component = componentManager.getComponent(node.props.type)
    if (!component) {
      return {
        execute: {},
        query: {},
        source: sourceManager.wrap(node),
      }
    }

    const context = getNodeContext(node)
    return {
      execute: context.execute,
      query: context.query,
      source: sourceManager.wrap(node),
    }
  }

  const getComponent = (name: string) => components[name]

  const createComponent = (
    type: string,
    props: {
      [prop: string]: any
    } = {},
    sources: {
      [type: string]: { [prop: string]: unknown }[]
    } = {},
  ) => {
    const component = getComponent(type)
    if (!component) {
      throw new Error(`Component type ${type} could not be created: Not Found`)
    }

    const defaultSources = (component.sources || []).reduce((acc, sourceType) => {
      return {
        ...acc,
        [sourceType]: [],
      }
    }, {})

    return {
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
    }
  }

  const componentManager = {
    components,
    getComponent,
    createComponent,
    getNodeComponent,
    registerComponent,
  }
  return componentManager
}

export type ComponentManager = ReturnType<typeof init>
