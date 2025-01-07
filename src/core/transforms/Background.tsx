/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import React, { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { APIKitAnimationTypes } from '../../animation/core/types'
import APIKitAnimation from '../../compositor/html/html-animation'
import { hasPermission, Permission } from '../../helpers/permission'
import CoreContext from '../context'
import { getProject } from '../data'
import { trigger } from '../events'
import { Compositor } from '../namespaces'

export type BackgroundProps = {
  src?: string
  // Opaque to the SDK
  [prop: string]: any
}

export type BackgroundSource = {
  id: string
  sourceProps: BackgroundProps
  sourceType: string
}

export const Background = {
  name: 'LS-Background',
  sourceType: 'Background',
  create(
    { onUpdate, onRemove },
    { sourceProps }: { sourceProps: BackgroundProps },
  ) {
    onRemove(() => {
      clearInterval(interval)
    })

    const root = document.createElement('div')
    const role = getProject(CoreContext.state.activeProjectId).role
    let interval: NodeJS.Timeout

    const Video = ({
      source,
      setStartAnimation,
    }: {
      source: BackgroundSource
      setStartAnimation: (value: boolean) => void
    }) => {
      const { src, type, meta, loop } = source?.sourceProps || {}
      const { id, sourceType } = source || {}
      const [refId, setRefId] = React.useState(null)
      const videoRef = React.useRef<HTMLVideoElement>(null)
      console.log('Updated current time', videoRef?.current?.currentTime)

      /* A callback function that is called when the video element is created. */
      const handleRect = React.useCallback((node: HTMLVideoElement) => {
        videoRef.current = node
        setRefId(node ? node.id : null)
      }, [])

      /* A callback function that is called when the video element is loaded. */
      const onLoadedData = React.useCallback(() => {
        if (videoRef?.current) {
          videoRef.current!.play().catch(() => {
            videoRef.current.muted = true
            videoRef.current?.play()
          })
        }
      }, [src])

      /* A callback function that is called when the video playback ended. */
      const onEnded = React.useCallback(() => {
        if (interval) {
          clearInterval(interval)
        }
        if (hasPermission(role, Permission.UpdateProject)) {
          trigger('VideoEnded', { id: id, category: type })
        }
      }, [src])

      /* Checking if the video is playing and if the user has permission to manage self and if the guest is
      the same as the room participant id. If all of these are true, then it sets the current time of the
      video to the meta time. */
      React.useEffect(() => {
        if (meta && videoRef?.current && refId) {
          if (hasPermission(role, Permission.ManageSelf)) {
            if (meta?.time) {
              videoRef.current.currentTime = Number(meta?.time)
            }
          }
        }
      }, [meta?.time, refId])

      /* This is a React hook that is called when the component is unmounted. It clears the interval. */
      React.useEffect(() => {
        return () => {
          if (interval) {
            clearInterval(interval)
          }
        }
      }, [id])

      /* This is a React hook that is called when the component is mounted and when the refId changes. */
      React.useEffect(() => {
        if (!refId) {
          if (interval) {
            clearInterval(interval)
          }
        } else {
          if (videoRef.current) {
            videoRef.current!.src = src
            videoRef.current!.play().catch(() => {
              if (videoRef.current) {
                videoRef.current.muted = true
                videoRef.current.play()
              }
            })
            if (hasPermission(role, Permission.UpdateProject)) {
              interval = setInterval(() => {
                if (videoRef.current?.duration) {
                  const timePending =
                    videoRef.current.duration - videoRef.current.currentTime
                  trigger('VideoTimeUpdate', {
                    category: sourceType,
                    id: id,
                    time: Math.floor(timePending),
                  })
                }
              }, 1000)
            }
          }
        }
      }, [refId])

      return (
        <React.Fragment key={id}>
          {src && (
            <video
              loop={loop}
              id={id}
              ref={handleRect}
              style={{
                ...sourceProps?.meta?.style,
                ...meta.style,
              }}
              onLoadedData={onLoadedData}
              onEnded={onEnded}
              onCanPlay={() => setStartAnimation(true)}
            />
          )}
        </React.Fragment>
      )
    }

    const Image = ({
      source,
      setStartAnimation,
    }: {
      source: BackgroundSource
      setStartAnimation: (value: boolean) => void
    }) => {
      const { src, meta, type } = source?.sourceProps || {}
      const { id } = source || {}

      return (
        <React.Fragment key={id}>
          {src && (
            <img
              style={{
                ...sourceProps?.meta?.style,
                ...meta?.style,
              }}
              src={src}
              onLoad={() => setStartAnimation(true)}
            />
          )}
        </React.Fragment>
      )
    }

    const Background = ({ source }: { source: BackgroundSource }) => {
      const { type } = source.sourceProps
      const { id } = source || {}
      const [startAnimation, setStartAnimation] = React.useState(false)
      useEffect(() => {
        setStartAnimation(false)
      }, [id])

      return (
        <APIKitAnimation
          id={id}
          type="background"
          enter={APIKitAnimationTypes.FADE_IN}
          exit={APIKitAnimationTypes.FADE_OUT}
          duration={400}
        >
          <div
            style={{ opacity: startAnimation ? 1 : 0 }}
            className={`backgroundContainer background-transition`}
          >
            {id && type === 'image' && (
              <Image source={source} setStartAnimation={setStartAnimation} />
            )}
            {id && type === 'video' && (
              <Video source={source} setStartAnimation={setStartAnimation} />
            )}
          </div>
        </APIKitAnimation>
      )
    }

    const _root = createRoot(root)
    const render = (source: BackgroundSource) =>
      _root.render(
        <>
          <Background source={source} />
        </>,
      )

    onUpdate((props) => {
      render({ ...props })
    })

    return {
      root,
    }
  },
} as Compositor.Transform.TransformDeclaration
