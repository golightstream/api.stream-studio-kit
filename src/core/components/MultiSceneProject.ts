/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { SceneNode } from '../../compositor'
import {
  Component,
  ComponentContext,
  NodeInterface,
} from '../../compositor/components'

const commands = {
  addScene:
    (context: Context) =>
    (type = 'ScenelessProject', props: { [name: string]: any } = {}) => {
      context.addChild('scenes', context.createComponent(type, props))
    },
  removeScene: (context: Context) => (sceneId: string) => {
    return context.removeChild('scenes', sceneId)
  },
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
  sources: ['Image', 'Video', 'RoomParticipant'],
  create(props, { createComponent }) {
    const children = { scenes: [createComponent('ScenelessProject')] }
    return {
      ...props,
      children,
      activeSceneId: children.scenes[0].id,
    }
  },
  children,
  commands,
  render(context, { id, renderMethods, renderNode }) {
    const { source, props, children } = context

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

export type Interface = NodeInterface<typeof MultiSceneProject, Props>

export const Declaration = MultiSceneProject
