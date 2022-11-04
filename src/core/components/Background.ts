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

const Background = {
  name: 'Background',
  version: '1',
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
  render(context, { id, renderNode }) {
    const { sources, props } = context
    const { layout = 'Grid', layoutProps = {} } = props
    let background = sources.get(props.background?.id)

    return renderNode(
      {
        key: 'background',
        layout: 'Free',
      },
      background
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
    )
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
