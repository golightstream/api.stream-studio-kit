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

const commands = {}

const children = {
  content: {
    validate: (x: SceneNode) => {
      return true
    },
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
  render(context, { id, renderMethods }) {
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
        {
          id: id('content'),
          render: {
            methods: renderMethods('content'),
          },
          props: {
            layout,
            layoutProps,
          },
          children: children.content.map((x) => ({
            ...x,
          })),
        },
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
} as Component<Props, typeof children, typeof commands>

/**
 * --- Types ---
 */

type ParticipantProps = {
  volume: number
  isMuted: boolean
  isHidden: boolean
}

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

type ParticipantType = 'camera' | 'screen'

type Context = ComponentContext<Props, typeof children>

export type Props = {
  layout: LayoutName
  layoutProps: LayoutProps
  background: {
    id: string
    type: 'Image' | 'Video'
    stretch?: boolean
  }
}

export type Interface = NodeInterface<Props, typeof Sceneless>

export const Declaration = Sceneless
