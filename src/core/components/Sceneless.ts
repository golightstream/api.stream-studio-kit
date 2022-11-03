/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { SceneNode } from '../../compositor'
import { Component, NodeInterface } from '../../compositor/components'
import { Elements } from '../namespaces'

const commands = {}

const children = {
  validate: (x: SceneNode) => {
    return true
  },
}

const Sceneless = {
  name: 'Sceneless',
  version: '1',
  sources: ['Image', 'Video', 'RoomParticipant'],
  children,
  commands,
  create(props) {
    return {
      layout: 'Grid',
      background: {
        stretch: false,
      },
      ...props,
    }
  },
  render(context, { id, renderChildren }) {
    const { sources, props, children } = context
    const { layout = 'Grid', layoutProps = {} } = props
    let background = sources.get(props.background?.id)

    return {
      id: id('root'),
      props: {
        layout: 'Layered',
      },
      children: [
        {
          id: id('background-container'),
          props: {
            layout: 'Free',
          },
          children: background
            ? [
                {
                  id: background.id,
                  props: {
                    sourceType: background.type,
                    sourceId: background.id,
                    loop: true,
                    fit: props.background.stretch ? 'fill' : 'cover',
                  },
                  children: [],
                },
              ]
            : [],
        },
        renderChildren(
          {
            layout,
            layoutProps,
          },
          (x) => x,
          { controls: true },
        ),
        {
          id: id('foreground'),
          props: {
            layout: 'Free',
          },
          children: [],
        },
      ],
    }
  },
  migrations: [],
} as Component<Interface>

/**
 * --- Types ---
 */

// TODO: These should be derived from the active layout
export type LayoutProps = {
  cover?: boolean
  /** Valid CSS for justify-content */
  justifyViewers?: 'flex-end' | 'center' | 'flex-start'
  /** Percentage */
  barWidth?: number
  barPosition?: 'bottom' | 'side'
  useGrid?: boolean
  reverse?: boolean
}

type LayoutName = string

export type Props = {
  layout: LayoutName
  layoutProps: LayoutProps
  background: {
    id: string
    type: 'Image' | 'Video'
    stretch?: boolean
  }
}

type ParticipantInterface = NodeInterface<Elements.WebRTC.Props>

export type Interface = NodeInterface<
  Props,
  typeof commands,
  ParticipantInterface
>

export const Declaration = Sceneless
