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
import { generateId, isMatch } from '../../logic'
import { Disposable } from '../types'

const commands = {
  setLayout:
    (context: Context) =>
    (layout: LayoutName, layoutProps: LayoutProps = {}) => {
      return context.update({
        layout,
        layoutProps,
      })
    },
  setBackground:
    ({ update, props, execute }: Context) =>
    (background: Props['background']) => {
      update({
        background: {
          ...props.background,
          ...background,
        },
      })
    },
  getBackground:
    ({ update, props, execute, source }: Context) =>
    () => {
      return source.get(props.background?.id)
    },
  addParticipant:
    (context: Context) =>
    (
      participantId: string,
      participantProps: Partial<ParticipantProps> = {},
      type: ParticipantType = 'camera',
    ) => {
      const { props, children } = context
      // TODO: Caching during "add" to prevent multiple adds (see sceneless-project.ts)

      const { isMuted = false, isHidden = false, volume = 1 } = participantProps
      const existing = children.content.find((x) =>
        isMatch(x.props.sourceProps, { participantId, type }),
      )
      if (existing) return

      context.addChild(
        'content',
        {
          sourceType: 'RoomParticipant',
          sourceProps: {
            participantId,
            type,
          },
          isMuted,
          isHidden,
          volume,
        },
        type === 'screen' ? 0 : null,
      )
    },
  removeParticipant:
    (context: Context) =>
    (participantId: string, type: ParticipantType = 'camera') => {
      const { children } = context
      const participant = children.content.find((x) =>
        isMatch(x.props.sourceProps, { participantId, type }),
      )
      if (participant) context.removeChild('content', participant.id)
    },
  getParticipant:
    (context: Context) =>
    (participantId: string, type: ParticipantType = 'camera') => {
      return context.children.content.find((x) =>
        isMatch(x.props.sourceProps, { participantId, type }),
      )
    },
  getParticipantProps:
    (context: Context) =>
    (participantId: string, type: ParticipantType = 'camera') => {
      return context.execute.getParticipant(participantId, type)?.props
    },
  useParticipantProps:
    (context: Context) =>
    (
      participantId: string,
      type: ParticipantType = 'camera',
      cb: (props: ParticipantProps) => void,
    ): Disposable => {
      return context.onChange(() => {
        cb(context.execute.getParticipantProps(participantId, type))
      })
    },
}

const children = {
  content: {
    validate: (x: SceneNode) => {
      return ['RoomParticipant'].includes(x.props.sourceType)
    },
  },
}

const ScenelessProject = {
  name: 'ScenelessProject',
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
    const { source, props, children } = context
    const { layout = 'Grid', layoutProps = {} } = props
    let background = source.get(props.background?.id)

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

export type Interface = ComponentNodeInterface<typeof ScenelessProject, Props>

export const Declaration = ScenelessProject
