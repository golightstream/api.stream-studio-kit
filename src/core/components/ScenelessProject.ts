/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import {
  Component,
  ComponentContext,
  ComponentInterface,
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
      const { props } = context
      // TODO: Caching during "add" to prevent multiple adds (see sceneless-project.ts)

      const { isMuted = false, isHidden = false, volume = 1 } = participantProps
      const existing = props.participants.find((x) =>
        isMatch(x.match, { participantId, type }),
      )
      if (existing) return

      const participant = {
        id: generateId(),
        match: {
          participantId,
          type,
        },
        props: {
          isMuted,
          isHidden,
          volume,
        },
      }
      const participants =
        type === 'screen'
          ? [participant, ...props.participants]
          : [...props.participants, participant]

      context.update({
        participants,
      })

      // TODO: Delete cache entry
    },
  removeParticipant:
    (context: Context) =>
    (participantId: string, type: ParticipantType = 'camera') => {
      const { props } = context
      const participants = props.participants.filter(
        (x) => x.match.participantId !== participantId || x.match.type !== type,
      )
      context.update({
        participants,
      })
    },
  getParticipant:
    (context: Context) =>
    (participantId: string, type: ParticipantType = 'camera') => {
      return context.props.participants.find(
        (x) => x.match.participantId === participantId && x.match.type === type,
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
} as const

const queries = {} as const

const ScenelessProject = {
  name: 'ScenelessProject',
  version: '1',
  sources: ['Image', 'Video', 'RoomParticipant'],
  create(props) {
    return {
      layout: 'Grid',
      participants: [],
      background: {
        stretch: false,
      },
      ...props,
    }
  },
  // requests: {
  //   getImage: () => {}
  // },
  commands,
  // TODO: Pass in {query} for things like getBackground()
  render(props, { id, randomId, source }) {
    const { layout = 'Grid', layoutProps = {}, participants = [] } = props
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
          props: {
            layout,
            layoutProps,
          },
          children: participants.map((x) => ({
            id: id(x.id),
            props: {
              sourceType: 'RoomParticipant',
              sourceProps: {
                type: x.match.type,
                participantId: x.match.participantId,
              },
              ...x.props,
            },
            children: [],
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
} as Component<Props>

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

type Context = ComponentContext<Props>

export type Props = {
  // TODO: Finish typing out all props (banners, etc.)
  layout: LayoutName
  layoutProps: LayoutProps
  banners: any[]
  images: {
    id: string
    src: string
  }[]
  videos: {
    id: string
    src: string
  }[]
  participants: {
    id: string
    match: {
      participantId: string
      type: ParticipantType
    }
    props: ParticipantProps
  }[]
  background: {
    id: string
    type: 'Image' | 'Video'
    stretch?: boolean
  }
}

export type Interface = ComponentInterface<typeof commands, typeof queries>

export const Declaration = ScenelessProject
