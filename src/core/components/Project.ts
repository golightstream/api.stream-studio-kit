/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import {
  Component,
  ComponentContext,
  NodeInterface,
} from '../../compositor/components'

const commands = {}

const children = {
  content: {},
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
  render(context, { id, renderMethods, renderNode }) {
    const { props, children } = context

    return renderNode(
      {
        key: 'project',
        layout: 'Grid',
        layoutProps: { cover: true },
      },
      children.content,
    )
  },
  migrations: [],
} as Component<Props, typeof children, typeof commands>

/**
 * --- Types ---
 */

type Context = ComponentContext<Props, typeof children>

export type Props = {}

export type Interface = NodeInterface<Props, typeof Project>

export const Declaration = Project
