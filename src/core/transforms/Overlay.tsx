/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import ReactDOM from 'react-dom'
import React, { useEffect } from 'react'
import { Compositor } from '../namespaces'
// import {
//   OverlayProps,
//   OverlaySource,
// } from '../sources'
import APIKitAnimation from '../../compositor/html/html-animation'
import { APIKitAnimationTypes } from '../../animation/core/types'
import { getProject, getProjectRoom } from '../data'
import CoreContext from '../context'
import { InternalEventMap, trigger, triggerInternal } from '../events'
import { hasPermission, Permission } from '../../helpers/permission'
import Iframe from './components/Iframe'

export type OverlayProps = {
  src?: string
  type?: 'image' | 'video' | 'custom'
  // Opaque to the SDK
  [prop: string]: any
}

export type Overlay = {
  id: string
  props: OverlayProps
}

export type OverlaySource = {
  id: string
  value: OverlayProps
  // TODO: This shouldn't be necessary
  props: OverlayProps
  sourceType: string
}

interface ISourceMap {
  sourceType: string
  trigger: keyof InternalEventMap
}

const SourceTriggerMap = [
  {
    sourceType: 'Overlay',
    trigger: 'OverlayMetadataUpdate',
  },
] as ISourceMap[]

export const Overlay = {
  name: 'LS-Overlay',
  sourceType: 'Overlay',
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
  //   return sources.find((x) => x.id === props.overlayId)
  // },
  create({ onUpdate, onNewSource, onRemove }, initialProps) {
    onRemove(() => {
      clearInterval(interval)
    })

    const root = document.createElement('div')
    const room = getProjectRoom(CoreContext.state.activeProjectId)
    const role = getProject(CoreContext.state.activeProjectId).role

    let source: OverlaySource
    let interval: NodeJS.Timer

    const IFrame = ({
      source,
      setStartAnimation,
    }: {
      source: OverlaySource
      setStartAnimation: (value: boolean) => void
    }) => {
      const { src, meta, height, width } = source?.props || {}
      const iframeRef = React.useRef<HTMLIFrameElement>(null)

      useEffect(() => {
        if (iframeRef.current) {
          iframeRef.current.style.removeProperty('transformOrigin')
          iframeRef.current.style.removeProperty('transform')
        }
      }, [src])

      const resizeIframe = () => {
        if (iframeRef.current) {
          const project = getProject(CoreContext.state.activeProjectId)
          const root = project.compositor.getRoot()
          const { x: rootWidth, y: rootHeight } = root.props.size
          let iframeWidth = iframeRef.current.clientWidth
          let iframeHeight = iframeRef.current.clientHeight

          let scale

          if (iframeWidth && iframeHeight) {
            scale = Math.min(rootWidth / iframeWidth, rootHeight / iframeHeight)
          } else {
            // It's possible the container will have no size defined (width/height=0)
            scale = 1
          }

          iframeRef.current.style.willChange = `transform`
          // @ts-ignore
          iframeRef.current.style.transformOrigin = '0 0'
          iframeRef.current.style.transform = `scale(${scale}) translateZ(0)`
          setStartAnimation(true)
        }
      }
      return (
        <React.Fragment>
          <Iframe
            key={source.id}
            url={src}
            frameBorder={0}
            iframeRef={iframeRef}
            height={height}
            width={width}
            onLoad={resizeIframe}
            styles={{ ...meta?.style }}
          />
        </React.Fragment>
      )
    }

    const Video = ({
      source,
      setStartAnimation,
    }: {
      source: OverlaySource
      setStartAnimation: (value: boolean) => void
    }) => {
      const SourceTrigger = SourceTriggerMap.find(
        (x) => x.sourceType === initialProps.sourceType,
      )

      const { src, type, meta, loop } = source?.props || {}
      const { id , sourceType  } = source || {}
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
                  category: sourceType,
                  id: id,
                  time: Math.floor(timePending),
                })
              }
            }, 1000)

            // /* This is checking if the user has permission to manage guests. If they do, then it triggers an
            // internal event. */
            // if (hasPermission(role, Permission.ManageGuests)) {
            //   triggerInternal(SourceTrigger.trigger, {
            //     projectId: CoreContext.state.activeProjectId,
            //     role,
            //     sourceId: id,
            //     doTrigger: true,
            //     metadata: {
            //       time: Math.floor(videoRef?.current?.currentTime) || 0,
            //       owner: room?.participantId,
            //     },
            //   })
            // }

            // return room?.onData((event, senderId) => {
            //   // Handle request for time sync.
            //   if (videoRef?.current?.currentTime) {
            //     /* This is checking if the user has permission to manage guests. If they do, then it triggers an
            //         internal event. */
            //     if (
            //       event.type === 'UserJoined' &&
            //       hasPermission(role, Permission.ManageGuests)
            //     ) {
            //       triggerInternal(SourceTrigger.trigger, {
            //         projectId: CoreContext.state.activeProjectId,
            //         role,
            //         sourceId: refId,
            //         doTrigger: true,
            //         metadata: {
            //           time: Math.floor(videoRef?.current?.currentTime) || 0,
            //           owner: room?.participantId,
            //           guest: senderId,
            //         },
            //       })
            //     }
            //   }
            // })
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
      source: OverlaySource
      setStartAnimation: (value: boolean) => void
    }) => {
      const { src, meta } = source?.props || {}
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

    const Overlay = ({ source }: { source: OverlaySource }) => {
      const { type } = source?.props || {}
      const { id } = source || {}
      const [startAnimation, setStartAnimation] = React.useState(false)
      useEffect(() => {
        setStartAnimation(false)
      }, [id])

      return (
        <APIKitAnimation
          id={id}
          type="overlay"
          enter={APIKitAnimationTypes.FADE_IN}
          exit={APIKitAnimationTypes.FADE_OUT}
          duration={400}
        >
          <div
            style={{ opacity: startAnimation ? 1 : 0 }}
            className={`overlayContainer overlay-transition`}
          >
            {id && type === 'image' && (
              <Image source={source} setStartAnimation={setStartAnimation} />
            )}
            {id && type === 'video' && (
              <Video source={source} setStartAnimation={setStartAnimation} />
            )}
            {id && type === 'custom' && (
              <IFrame source={source} setStartAnimation={setStartAnimation} />
            )}
          </div>
        </APIKitAnimation>
      )
    }

    const render = (source: OverlaySource) =>
      ReactDOM.render(
        <>
          <Overlay source={source} />
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
