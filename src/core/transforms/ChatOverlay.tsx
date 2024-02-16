/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { createRoot } from 'react-dom/client'
import React, { useLayoutEffect, useMemo, useRef, useState } from 'react'
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
  twitch: {
    icon: 'Twitch',
  },
  youtube: {
    icon: 'YouTube',
  },

  facebook: {
    icon: 'Facebook',
  },
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

    /**
     * It takes an element and a canvas, and returns a number between 0 and 4, depending on the size of the
     * element relative to the canvas
     * @param ele - The element that is being rendered
     * @param canvas - The canvas object that the element is on.
     * @returns The size of the element
     */
    const getSize = (
      ele: { width: number; height: number },
      canvas: { width: number; height: number },
    ) => {
      const widthAsPercentage = ele.width / canvas.width
      const heightAsPercentage = ele.height / canvas.height
      if (heightAsPercentage >= 0.25 && widthAsPercentage >= 0.75) {
        return 4
      }
      if (widthAsPercentage >= 0.75) {
        return 1
      } else if (widthAsPercentage >= 0.5) {
        return -2
      } else if (widthAsPercentage > 0.25) {
        return -3
      }
      return -4
    }

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
      const [labelSize, setLabelSize] = useState<number>(0)
      const { index, platform, avatar, bannerStyle } = metadata || {}

      const platformStyle = useMemo(
        () => iconStyles[platform as keyof typeof iconStyles],
        [platform],
      )

      /* Creating a ref to a div element. */
      const ref = useRef<HTMLDivElement>()

      /* Using the useLayoutEffect hook to calculate the size of the label. */
      useLayoutEffect(() => {
        if (!ref.current) return

        /**
         * It calculates the size of the label based on the size of the canvas
         */
        const calculate = () => {
          const rect = ref.current
          if (rect) {
            setLabelSize(
              getSize(
                { width: rect.clientWidth, height: rect.clientHeight },
                {
                  width: project.compositor.getRoot().props.size.x,
                  height: project.compositor.getRoot().props.size.y,
                },
              ),
            )
          }
        }

        /* Using the ResizeObserver API to observe the ref.current element and call the calculate function when
        the element is resized. */
        const resizeObserver = new ResizeObserver((entries) => {
          calculate()
        })
        calculate()
        resizeObserver.observe(ref.current)

        return () => {
          if (ref?.current) {
            resizeObserver.unobserve(ref?.current)
          }
        }
      }, [ref.current, project])

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
                    <button className="ChatOverlay-badge-container">
                      {platformStyle?.icon && (
                        <Icon
                          className="ChatOverlay-badge-icon"
                          name={platformStyle?.icon}
                        />
                      )}
                      <div className="ChatOverlay-badge-username">
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
                      marginTop: `-${scale(160)}`,
                      alignItems: 'flex-end',
                      padding: `${scale(14)} ${scale(0)} ${scale(14)} ${scale(
                        0,
                      )}`,
                      marginLeft: `${labelSize * 10}px`,
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
                      <button className="ChatOverlay-badge-container">
                        {platformStyle?.icon && (
                          <Icon
                            className="ChatOverlay-badge-icon"
                            name={platformStyle?.icon}
                          />
                        )}
                        <div className="ChatOverlay-badge-username">
                          {username}
                        </div>
                      </button>
                    )}
                  </div>
                  {message && (
                    <div
                      ref={ref}
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

    const _root = createRoot(root)
    const render = (rest: ChatOverlayProps) =>
      _root.render(<ChatOverlay {...rest} />)

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
