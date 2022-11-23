/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { ElementNode, SceneNode } from '../../compositor'
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
  sources: [],
  children,
  commands,
  create(props) {
    return {
      background: {
        stretch: false,
      },
      ...props,
    }
  },
  render(context, { id, renderNode, renderChildren }) {
    const { sources, props, children } = context
    const { backgroundId } = props
    let background = sources.get(backgroundId)

    return renderNode(
      {
        key: 'sceneless-root',
        layout: 'Layered',
      },
      [
        renderNode(
          {
            key: 'background',
            layout: 'Layered',
          },
          [
            background &&
              (background.type === 'Image'
                ? renderNode({
                    key: 'bg-' + background.id,
                    element: 'LS-Image',
                    sourceId: background.id,
                  })
                : renderNode({
                    key: 'bg-' + background.id,
                    element: 'LS-Video',
                    sourceId: background.id,
                    loop: true,
                  })),
          ],
        ),
        renderChildren(
          (x) => x,
          { layoutControls: true },
        ),
        renderNode({
          key: 'foreground',
          layout: 'Free',
        }),
      ],
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

export type Props = {
  backgroundId?: string
}

type ParticipantInterface = NodeInterface<
  ElementNode<Elements.WebRTC.Props>['props']
>

export type Interface = NodeInterface<
  Props,
  typeof commands,
  ParticipantInterface
>

export const Declaration = Sceneless
