/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { SceneNode } from '../../compositor'
import { Component, NodeInterface } from '../../compositor/components'
import { Components } from '../namespaces'

const commands = {
  // TODO: Type of context
  setActiveScene: (context: any) => (sceneId: string) => {
    return context.update({
      activeSceneId: sceneId,
    })
  },
}

const children = {
  validate: (x: SceneNode) => {
    return true
  },
}

const MultiScene = {
  name: 'MultiScene',
  version: '1',
  sources: ['Image', 'Video'],
  children,
  commands,
  create(props, children) {
    return {
      activeSceneId: children[0]?.id,
      ...props,
    }
  },
  render(context, { id, renderNode, renderChildren }) {
    const { props } = context

    return renderChildren(
      {
        layout: 'Grid',
        layoutProps: { cover: true },
      },
      (children) =>
        children.filter((x) => x.id === props.activeSceneId),
    )
  },
  migrations: [],
} as Component<Interface>

/**
 * --- Types ---
 */

export type Props = {
  activeSceneId: string
}

export type Interface = NodeInterface<
  Props,
  typeof commands,
  // TODO: Issue where Interface declaration is circular
  //  when declaring own Interface as possible child
  Components.Sceneless.Interface // | Interface
>

export const Declaration = MultiScene
