/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { SceneNode } from '../../compositor'
import { Component, NodeInterface } from '../../compositor/components'
import { Components } from '../namespaces'

const commands = {}

const children = {
  validate: (x: SceneNode) => {
    return true
  },
}

const Project = {
  name: 'Project',
  version: '1',
  sources: ['Image', 'Video', 'RoomParticipant'],
  children,
  commands,
  create(props, children) {
    return {
      ...props,
    }
  },
  render(context, { id, renderNode, renderChildren }) {
    const { props, sources } = context
    let banner = sources.get(props.bannerId)

    return renderNode({ key: 'project-root', layout: 'Layered' }, [
      renderChildren(),
      banner &&
        renderNode({
          key: 'banner',
          element: 'LS-Banner',
          sourceId: banner.id,
        }),
    ])
  },
  migrations: [],
} as Component<Interface>

/**
 * --- Types ---
 */

export type Props = {
  bannerId?: string
}

export type Interface = NodeInterface<
  Props,
  typeof commands,
  Components.Sceneless.Interface | Components.MultiScene.Interface
>

export const Declaration = Project
