/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { SceneNode } from '../../compositor'
import {
  Component,
  ComponentContext,
  ComponentNodeInterface,
  NodeInterface,
} from '../../compositor/components'

const commands = {
  setActiveScene: (context: Context) => (sceneId: string) => {
    return context.update({
      activeSceneId: sceneId,
    })
  },
}

const children = {
  scenes: {
    validate: (x: SceneNode) => {
      return true
    },
  },
}

const MultiSceneProject = {
  name: 'MultiSceneProject',
  version: '1',
  sources: ['Image', 'Video'],
  children,
  commands,
  create(props, children) {
    return {
      activeSceneId: children.scenes[0]?.id,
      ...props,
    }
  },
  render(context, { id, renderMethods, renderNode }) {
    const { props, children } = context

    return renderNode(
      {
        key: 'root',
        layout: 'Grid',
        layoutProps: { cover: true },
      },
      children.scenes.filter((x) => x.id === props.activeSceneId),
    )
  },
  migrations: [],
} as Component<Props, typeof children, typeof commands>

/**
 * --- Types ---
 */

type Context = ComponentContext<Props, typeof children>

export type Props = {
  activeSceneId: string
}

export type Interface = ComponentNodeInterface<typeof MultiSceneProject, Props>

export const Declaration = MultiSceneProject
