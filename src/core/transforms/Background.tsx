/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import ReactDOM from 'react-dom'
import React, { useEffect } from 'react'
import { Compositor } from '../namespaces'
// import { BackgroundProps, BackgroundSource } from '../sources'
import APIKitAnimation from '../../compositor/html/html-animation'
import { APIKitAnimationTypes } from '../../animation/core/types'
import { getProject, getProjectRoom } from '../data'
import CoreContext from '../context'
import { InternalEventMap, trigger, triggerInternal } from '../events'
import { hasPermission, Permission } from '../../helpers/permission'

export type BackgroundProps = {
  src?: string
  type?: 'image' | 'video'
  // Opaque to the SDK
  [prop: string]: any
}

export type Background = {
  id: string
  props: BackgroundProps
}

export type BackgroundSource = {
  id: string
  value: BackgroundProps
  // TODO: This shouldn't be necessary
  props: BackgroundProps
}

interface ISourceMap {
  sourceType: string
  trigger: keyof InternalEventMap
}

const SourceTriggerMap = [
  {
    sourceType: 'Background',
    trigger: 'BackgroundMetadataUpdate',
  },
] as ISourceMap[]

export const Background = {
  name: 'LS-Background',
  sourceType: 'Background',
  props: {
    id: {
      type: String,
      required: true,
    },
    props: {
      src: {
        type: String,
        required: true,
      },
    },
  },
  // useSource(sources, props) {
  //   // TODO: Filter source.isActive to ensure we're getting the best match
  //   return sources.find((x) => x.id === props.backgroundId)
  // },
  create({ onUpdate, onNewSource, onRemove }, initialProps) {
    onRemove(() => {
      clearInterval(interval)
    })

    const root = document.createElement('div')
    const room = getProjectRoom(CoreContext.state.activeProjectId)
    const role = getProject(CoreContext.state.activeProjectId).role
    let interval: NodeJS.Timer

    const Video = ({
      source,
      setStartAnimation,
    }: {
      source: BackgroundSource
      setStartAnimation: (value: boolean) => void
    }) => {
      const SourceTrigger = SourceTriggerMap.find(
        (x) => x.sourceType === initialProps.sourceType,
      )

      const { src, type, meta, loop } = source?.props || {}
      const { id } = source || {}
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
        trigger('VideoEnded', { id: id, category: type })
      }, [src])

      /* Checking if the video is playing and if the user has permission to manage self and if the guest is
      the same as the room participant id. If all of these are true, then it sets the current time of the
      video to the meta time. */
      React.useEffect(() => {
        if (meta && videoRef?.current && refId) {
          if (hasPermission(role, Permission.ManageSelf)) {
            videoRef.current.currentTime = Number(meta?.time)
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
            if (loop) {
              videoRef.current.loop = Boolean(loop)
            }
            videoRef.current!.play().catch(() => {
              videoRef.current.muted = true
              videoRef.current.play()
            })

            interval = setInterval(() => {
              if (videoRef.current.duration) {
                const timePending =
                  videoRef.current.duration - videoRef.current.currentTime
                trigger('VideoTimeUpdate', {
                  category: type,
                  id: id,
                  time: Math.floor(timePending),
                })
              }
            }, 1000)

            /* This is checking if the user has permission to manage guests. If they do, then it triggers an
            internal event. */
            if (hasPermission(role, Permission.ManageGuests)) {
              triggerInternal(SourceTrigger.trigger, {
                projectId: CoreContext.state.activeProjectId,
                role,
                sourceId: id,
                doTrigger: true,
                metadata: {
                  time: Math.floor(videoRef?.current?.currentTime) || 0,
                  owner: room?.participantId,
                },
              })
            }

            return room?.onData((event, senderId) => {
              // Handle request for time sync.
              if (videoRef?.current?.currentTime) {
                /* This is checking if the user has permission to manage guests. If they do, then it triggers an
                    internal event. */
                if (
                  event.type === 'UserJoined' &&
                  hasPermission(role, Permission.ManageGuests)
                ) {
                  triggerInternal(SourceTrigger.trigger, {
                    projectId: CoreContext.state.activeProjectId,
                    role,
                    sourceId: refId,
                    doTrigger: true,
                    metadata: {
                      time: Math.floor(videoRef?.current?.currentTime) || 0,
                      owner: room?.participantId,
                      guest: senderId,
                    },
                  })
                }
              }
            })
          }
        }
      }, [refId])

      return (
        <React.Fragment key={id}>
          {src && (
            <video
              id={id}
              ref={handleRect}
              style={{ ...initialProps.style }}
              {...initialProps.props}
              onLoadedData={onLoadedData}
              onEnded={onEnded}
              onCanPlayThrough={() => setStartAnimation(true)}
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
      const { src, meta, type } = source?.props || {}
      const { id } = source || {}

      return (
        <React.Fragment key={id}>
          {src && (
            <img
              style={{
                ...initialProps?.style,
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
      const { type } = source.props
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

    const render = (source: BackgroundSource) =>
      ReactDOM.render(
        <>
          <Background source={source} />
        </>,
        root,
      )

    onUpdate((props) => {
      render({ ...props })
    })

    // onNewSource((_source) => {
    //   source = _source
    //   render()
    // })

    return {
      root,
    }
  },
} as Compositor.Transform.TransformDeclaration
