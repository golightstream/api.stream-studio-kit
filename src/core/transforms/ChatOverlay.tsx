/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import ReactDOM from 'react-dom'
import React, { useMemo } from 'react'
import { Compositor } from '../namespaces'
import * as Colors from '../../helpers/colors'
import Icon from '../../helpers/icon'
import { BannerStyle } from '../../helpers/compositor'
import { getProject } from '../data'
import CoreContext from '../context'
import APIKitAnimation from '../../compositor/html/html-animation'
import { APIKitAnimationTypes } from '../../animation/core/types'

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
 * AvatarProps is an object with a width and height property, both of which are numbers. It also has an
 * optional background property, which is a string. It also has an optional borderColor property, which
 * is a string. It also has an optional username property, which is a string. It also has an optional
 * marginRight property, which is a number. It also has an optional fontSize property, which is a
 * number.
 * @property {number} width - The width of the avatar
 * @property {number} height - The height of the avatar
 * @property {string} background - The background color of the avatar.
 * @property {string} borderColor - The color of the border around the avatar.
 * @property {string} username - The username of the user.
 * @property {number} marginRight - The margin to the right of the avatar.
 * @property {number} fontSize - The font size of the username
 */
type AvatarProps = {
  width: number | string
  height: number | string
  background?: string
  borderColor?: string
  username?: string
  marginRight?: number | string
  fontSize?: number | string
}

/* Defining a type called SegmentType. */
const enum SegmentType {
  Text = 'text',
  Mention = 'mention',
  Link = 'link',
  Emoticon = 'emoticon',
  MixerSkill = 'mixerSkill',
}

/* Defining a constant enum called SegmentEmoticonType. */
const enum SegmentEmoticonType {
  DIRECT = 'direct',
  UNICODE = 'unicode',
}

/**
 * It takes a string, and if it doesn't start with http: or https:, it prepends https:// to it
 * @param {string} link - The link to be fixed.
 * @returns A function that takes a string and returns a string.
 */
const fixLink = (link: string): string => {
  if (!link.startsWith('http:') && !link.startsWith('https:')) {
    return `https://${link}`
  }

  return link
}


/**
 * ChatOverlayProps is an object that has a property called metadata that can be of any type.
 * @property {string} id - Unique identifier for the chat message.
 * @property {string} username - The display name of the chat message.
 * @property {any} message - The message that the user has sent.
 * @property metadata - This is a property that can be of any type.
 */
export type ChatOverlayProps = {
  // Unique identifier for the chat message.
  id?: string
  // Display name of the chat messages
  username?: string
  // Users avatar
  message?: any
  /* Defining a property called metadata that can be of any type. */
  metadata: { [prop: string]: any }
}

/* It's creating a new transform called ChatOverlay. */
export const ChatOverlay = {
  name: 'LS-ChatOverlay',
  sourceType: 'ChatOverlay',
  create({ onUpdate, onEvent }, initialProps) {
    const root = document.createElement('div')
    const project = getProject(CoreContext.state.activeProjectId)
    const projectRoot = project.compositor.getRoot()

    /* Setting the rootWidth to the width of the projectRoot. */
    const { x: rootWidth } = projectRoot.props.size
    const scalar = (rootWidth ?? 1280) / 1920
    const scale = (px: number) => px * scalar + 'px'

    let globalProps: ChatOverlayProps

    /* It's listening for a ProjectChanged event, and if the payload has a bannerStyle, it will render the
      component with the new style. */
    CoreContext.onInternal('ProjectChanged', () => {
      const { bannerStyle } = project.props ?? {}
      if (bannerStyle) {
        render({
          ...globalProps,
          metadata: {
            ...globalProps.metadata,
            bannerStyle,
          },
        })
      }
    })

    /* A React component that is used to render a message bubble. */
    const ChatMessageBubbleSegment = React.memo((props: any) => {
      if (props?.type === SegmentType.Emoticon) {
        if (props?.data?.type === SegmentEmoticonType.DIRECT) {
          return (
            <img
              src={props?.data?.url}
              style={{ height: scale(36) }}
              alt={props?.text}
            />
          )
        }
      }

      if (props?.type === SegmentType.Link) {
        return (
          <a
            style={{ color: '#FFF', wordBreak: 'break-all' }}
            target="_blank"
            rel="noreferrer"
            href={fixLink(props?.data?.url)}
          >
            {props?.text}
          </a>
        )
      }

      return <span>{props?.text}</span>
    })

    /**
     * It returns a div with a div inside it
     * @param {AvatarProps} props - AvatarProps
     * @returns A function that returns a div with a div inside of it.
     */
    const LetterAvatar = (props: AvatarProps) => {
      const avatarStyle = {
        height: `${props.height}`,
        width: `${props.width}`,
        background: props.background || 'transparent',
        display: 'inline-block',
        verticalAlign: 'middle',
        borderRadius: '50%',
        fontSize: `${props.fontSize}`,
      }
      return (
        <div
          style={{
            ...avatarStyle,
            position: 'relative',
            marginRight: props?.marginRight,
          }}
        >
          <div
            style={{
              left: '50%',
              position: 'absolute',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            {props.username.substring(0, 2).toUpperCase()}
          </div>
        </div>
      )
    }

    const ChatOverlay = (props: ChatOverlayProps) => {
      /* It's destructuring the props. */
      const { message, id, username, metadata } = props || {}

      const { index, platform, variant, avatar, bannerStyle } = metadata || {}

      const platformStyle = useMemo(
        () =>
          iconStyles[platform as keyof typeof iconStyles]?.[
            variant ||
              0 % iconStyles[platform as keyof typeof iconStyles]?.length
          ],
        [platform, variant],
      )

      return (
        <APIKitAnimation
          id={`${id}_${index}`}
          type="chatoverlay"
          enter={APIKitAnimationTypes.SLIDE_IN_LEFT}
          exit={APIKitAnimationTypes.SLIDE_OUT_LEFT}
          duration={200}
        >
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
              marginLeft: bannerStyle !== BannerStyle.BUBBLE ? '5%' : '0px',
            }}
          >
            {bannerStyle !== BannerStyle.BUBBLE ? (
              /* It's a ternary operator. If the style is not equal to BannerStyle.BUBBLE.toString(), then it will
            render the first div. Otherwise, it will render the second div. */
              <div style={{ width: '100%', display: 'flex' }}>
                {avatar ? (
                  <span style={{ marginRight: '20px' }}>
                    <img src={avatar} className="ChatOverlay-avatar" />
                  </span>
                ) : (
                  <LetterAvatar
                    height={scale(110)}
                    width={scale(120)}
                    background={Colors['primary'](500)}
                    username={username}
                    marginRight={20}
                    fontSize={scale(30)}
                  />
                )}
                <div style={{ width: '100%' }}>
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
                        style={{
                          color: platformStyle?.textColor,
                        }}
                      >
                        {username}
                      </div>
                    </button>
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
                    {message && (
                      <div
                        className="ChatOverlay-body"
                        style={{
                          gap: 10,
                          display: 'flex',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          verticalAlign: 'middle',
                        }}
                      >
                        {message.map((part: any, index: number) => (
                          <ChatMessageBubbleSegment key={index} {...part} />
                        ))}
                      </div>
                    )}
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
                  <div
                    style={{
                      display: 'flex',
                      marginTop: `-${scale(135)}`,
                      alignItems: 'flex-end',
                    }}
                  >
                    {avatar ? (
                      <div className="ChatOverlayAvatar-container">
                        <img src={avatar} className="ChatOverlay-avatar" />
                      </div>
                    ) : (
                      <div className="ChatOverlayAvatar-container">
                        <LetterAvatar
                          height={scale(120)}
                          width={scale(120)}
                          background={Colors['primary'](500)}
                          username={username}
                          fontSize={scale(30)}
                        />
                      </div>
                    )}
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
                          style={{
                            color: platformStyle?.textColor,
                          }}
                        >
                          {username}
                        </div>
                      </button>
                    )}
                  </div>
                  {message && (
                    <div
                      className="ChatOverlay-body"
                      style={{
                        gap: 10,

                        alignItems: 'center',
                        flexWrap: 'wrap',
                        verticalAlign: 'middle',
                      }}
                    >
                      {message.map((part: any, index: number) => (
                        <ChatMessageBubbleSegment key={index} {...part} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </APIKitAnimation>
      )
    }

    const render = (rest: ChatOverlayProps) =>
      ReactDOM.render(<ChatOverlay {...rest} />, root)

    /* It's a callback that is called when the props are updated. */
    onUpdate((props: ChatOverlayProps) => {
      const { bannerStyle = BannerStyle.DEFAULT } = project.props ?? {}
      globalProps = {
        ...props,
        metadata: {
          ...props.metadata,
          bannerStyle,
        },
      }
      render(globalProps)
    })

    return {
      root,
    }
  },
} as Compositor.Transform.TransformDeclaration
