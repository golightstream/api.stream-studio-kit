/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import ReactDOM from 'react-dom'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Compositor } from '../namespaces'
import * as Colors from '../../helpers/colors'
import Icon from '../../helpers/icon'
import { BannerStyle } from '../../helpers/compositor'
import { getProject } from '../data'
import CoreContext from '../context'

/* Brand primary colors
 */

const iconStyles = {
  twitch: [
    {
      icon: 'Twitch',
      background: Colors.neutral(900),
      iconColor: 'neutral',
      iconColorWeight: 0,
      textColor: Colors.white.toHexString(),
    },
    {
      icon: 'TwitchDuo',
      background: Colors.white.toHexString(),
      iconColor: 'neutral',
      iconColorWeight: 900,
      textColor: Colors.neutral(900),
    },
    {
      icon: 'Twitch',
      background: Colors.neutral(900),
      iconColor: 'neutral',
      iconColorWeight: 0,
      textColor: Colors.white.toHexString(),
    },
    {
      icon: 'TwitchDuo',
      background: Colors.white.toHexString(),
      iconColor: 'neutral',
      iconColorWeight: 900,
      textColor: Colors.neutral(900),
    },
  ],
  youtube: [
    {
      icon: 'YouTube',
      background: Colors.neutral(900),
      iconColor: 'neutral',
      iconColorWeight: 0,
      textColor: Colors.white.toHexString(),
    },
    {
      icon: 'YouTubeDuo',
      background: Colors.white.toHexString(),
      iconColor: 'neutral',
      iconColorWeight: 900,
      textColor: Colors.neutral(900),
    },
    {
      icon: 'YouTube',
      background: Colors.neutral(900),
      iconColor: 'neutral',
      iconColorWeight: 0,
      textColor: Colors.white.toHexString(),
    },
    {
      icon: 'YouTubeDuo',
      background: Colors.white.toHexString(),
      iconColor: 'neutral',
      iconColorWeight: 900,
      textColor: Colors.neutral(900),
    },
  ],
  facebook: [
    {
      icon: 'Facebook',
      background: Colors.neutral(900),
      iconColor: 'neutral',
      iconColorWeight: 0,
      textColor: Colors.white.toHexString(),
    },
    {
      icon: 'Facebook',
      background: Colors.white.toHexString(),
      iconColor: 'neutral',
      iconColorWeight: 900,
      textColor: Colors.neutral(900),
    },
    {
      icon: 'Facebook',
      background: Colors.neutral(900),
      iconColor: 'neutral',
      iconColorWeight: 0,
      textColor: Colors.white.toHexString(),
    },
    {
      icon: 'Facebook',
      background: Colors.white.toHexString(),
      iconColor: 'neutral',
      iconColorWeight: 900,
      textColor: Colors.neutral(900),
    },
  ],
} as const

/**
 * ChatOverlayProps is an object with optional properties of chatOverlayId, text, bannerStyle, id,
 * isSender, displayName, avatar, variant, and platform.
 * @property {string} chatOverlayId - The id of the chat overlay.
 * @property {string} text - The text of the chat message.
 * @property {string} bannerStyle - The style of the banner.
 * @property {string} id - Unique identifier for the chat message.
 * @property {boolean} isSender - Whether the chat message was sent by the current user.
 * @property {string} displayName - The name of the user who sent the message.
 * @property {string} avatar - The URL of the avatar image.
 * @property {number} variant - The variant of the chat message.
 * @property platform - The platform the message was sent from.
 */
export type ChatOverlayProps = {
  // Unique identifier for the chat message.
  id?: string

  // Whether the chat message was sent by the current user.
  isSender?: boolean

  // Display name of the chat messages
  username?: string

  // Users avatar
  avatar?: string

  variant?: number

  platform?: keyof typeof iconStyles

  text?: string

  chatOverlayId?: string

  bannerStyle?: string
}

/* It's creating a new transform called ChatOverlay. */
export const ChatOverlay = {
  name: 'LS-ChatOverlay',
  sourceType: 'ChatOverlay',
  create({ onUpdate }, initialProps) {
    const root = document.createElement('div')
    const project = getProject(CoreContext.state.activeProjectId)
    const projectRoot = project.compositor.getRoot()
    let globalProps: ChatOverlayProps
    /* It's listening for a ProjectChanged event, and if the payload has a bannerStyle, it will render the
      component with the new style. */
    CoreContext.onInternal('ProjectChanged', () => {
      const { bannerStyle = BannerStyle.DEFAULT } = project.props ?? {}
      if (bannerStyle) {
        render({ ...globalProps, bannerStyle })
      }
    })

    const ChatOverlay = (props: ChatOverlayProps) => {
      const [rendered, setRendered] = useState(false)
      const { x: rootWidth } = projectRoot.props.size
      const scalar = (rootWidth ?? 1280) / 1920
      const scale = useCallback((px: number) => px * scalar, [scalar])
      /* It's destructuring the props. */
      const {
        platform,
        text,
        avatar,
        chatOverlayId,
        username,
        variant,
        bannerStyle = BannerStyle.DEFAULT,
      } = props || {}

      useEffect(() => {
        window.setTimeout(() => {
          setRendered(Boolean(chatOverlayId))
        })
        if (!chatOverlayId) setRendered(false)
        return () => {
          setRendered(false)
        }
      }, [chatOverlayId])

      const platformStyle = useMemo(
        () =>
          iconStyles[platform]?.[variant || 0 % iconStyles[platform]?.length],
        [platform, variant],
      )

      return (
        <div
          className="ChatOverlayContainer"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'flex-start',
            alignItems: 'flex-end',
            transition: '200ms ease all',
            marginLeft: '5%',
            ...(!rendered
              ? {
                  zIndex: 1,
                  opacity: 0,
                  transform: 'translateX(-200px)',
                }
              : {
                  zIndex: 2,
                  opacity: 1,
                  transform: 'translateX(0)',
                }),
          }}
        >
          {bannerStyle !== BannerStyle.BUBBLE ? (
            /* It's a ternary operator. If the style is not equal to BannerStyle.BUBBLE.toString(), then it will
            render the first div. Otherwise, it will render the second div. */
            <div style={{ width: '100%', display: 'flex' }}>
              {avatar && (
                <span style={{ marginRight: '20px' }}>
                  <img src={avatar} className="ChatOverlay-avatar" />
                </span>
              )}
              <div style={{ width: '100%' }}>
                {platformStyle && (
                  <>
                    {username && (
                      <button
                        className="ChatOverlay-platform"
                        style={{
                          backgroundColor: platformStyle?.background,
                        }}
                      >
                        {platformStyle?.icon && (
                          <Icon
                            width={scale(40)}
                            height={scale(40)}
                            name={platformStyle?.icon}
                            {...(platformStyle.iconColor && {
                              color: platformStyle?.iconColor,
                              colorWeight: platformStyle?.iconColorWeight,
                            })}
                          />
                        )}
                        <div
                          className="ChatOverlay-username"
                          style={{
                            color: platformStyle?.textColor,
                          }}
                        >
                          {username}
                        </div>
                      </button>
                    )}
                  </>
                )}
                <div
                  className="ChatOverlay"
                  style={{
                    padding: 10,
                    background: 'orange',
                    width: 'fit-content',
                    height: 'fit-content',
                    maxWidth: '84%',
                    position: 'relative',
                  }}
                >
                  {text && <div className="ChatOverlay-body">{text}</div>}
                </div>
              </div>
            </div>
          ) : (
            /* It's a ternary operator. If the style is not equal to BannerStyle.BUBBLE.toString(), then it will
            render the first div. Otherwise, it will render the second div. */
            <div style={{ width: '100%', display: 'flex' }}>
              <div
                className="ChatOverlay"
                style={{
                  padding: 10,
                  background: 'orange',
                  width: 'fit-content',
                  height: 'fit-content',
                  maxWidth: '84%',
                  position: 'relative',
                }}
              >
                {avatar && (
                  <div className="ChatOverlayAvatar-container">
                    <img src={avatar} className="ChatOverlay-avatar" />
                  </div>
                )}
                {platformStyle && (
                  <>
                    {username && (
                      <button
                        className="ChatOverlay-platform"
                        style={{
                          backgroundColor: platformStyle?.background,
                        }}
                      >
                        {platformStyle?.icon && (
                          <Icon
                            width={scale(40)}
                            height={scale(40)}
                            name={platformStyle?.icon}
                            {...(platformStyle?.iconColor && {
                              color: platformStyle?.iconColor,
                              colorWeight: platformStyle?.iconColorWeight,
                            })}
                          />
                        )}
                        <div
                          className="ChatOverlay-username"
                          style={{ color: platformStyle?.textColor }}
                        >
                          {username}
                        </div>
                      </button>
                    )}
                  </>
                )}
                {text && <div className="ChatOverlay-body">{text}</div>}
              </div>
            </div>
          )}
        </div>
      )
    }

    const render = (rest: ChatOverlayProps) =>
      ReactDOM.render(<ChatOverlay {...rest} />, root)

    /* It's a callback that is called when the props are updated. */
    onUpdate((props: ChatOverlayProps) => {
      globalProps = props
      render(globalProps)
    })

    return {
      root,
    }
  },
} as Compositor.Transform.TransformDeclaration
