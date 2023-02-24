/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import ReactDOM from 'react-dom'
import React from 'react'
import { CoreContext } from '../context'
import { getProject, getProjectRoom } from '../data'
import { Compositor } from '../namespaces'
import { InternalEventMap, trigger, triggerInternal } from '../events'
import APIKitAnimation from '../../compositor/html/html-animation'
import { APIKitAnimationTypes } from '../../animation/core/types'
import { hasPermission, Permission } from '../../helpers/permission'

interface ISourceMap {
  sourceType: string
  trigger: keyof InternalEventMap
}

const SourceTriggerMap = [
  {
    sourceType: 'Overlay',
    trigger: 'OverlayMetadataUpdate',
  },
  {
    sourceType: 'Background',
    trigger: 'BackgroundMetadataUpdate',
  },
] as ISourceMap[]

export const Video2 = {
  name: 'LS-Video-2',
  sourceType: 'Video2',
  props: {
    id: {
      type: String,
      required: true,
    },
  },
  useSource(sources, props) {
    return sources.find((x) => x.props.type === props.id)
  },
  create({ onUpdate, onNewSource, onRemove }, initialProps) {
    onRemove(() => {
      clearInterval(interval)
    })

    const root = document.createElement('div')
    const room = getProjectRoom(CoreContext.state.activeProjectId)
    const role = getProject(CoreContext.state.activeProjectId).role

    let source: any
    let interval: NodeJS.Timer

    const Video = ({ source }: { source: any }) => {
      const SourceTrigger = SourceTriggerMap.find(
        (x) => x.sourceType === initialProps.proxySource,
      )
      const { src, type, meta, loop } = source?.value || {}
      const { id } = source || {}
      const [refId, setRefId] = React.useState(null)
      const videoRef = React.useRef<HTMLVideoElement>(null)
      const [startAnimation, setStartAnimation] = React.useState(false)

      console.log('Updated current time', videoRef?.current?.currentTime)

      React.useEffect(() => {
        setStartAnimation(false)
      }, [id])

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
        <APIKitAnimation
          id={id}
          type="video"
          enter={APIKitAnimationTypes.FADE_IN}
          exit={APIKitAnimationTypes.FADE_OUT}
          duration={400}
        >
          <div
            style={{ opacity: startAnimation ? 1 : 0, width: '100%', height: '100%' }}
            className={`video-transition`}
          >
            {src && (
              <video
                id={id}
                ref={handleRect}
                style={initialProps.style}
                {...initialProps.props}
                onLoadedData={onLoadedData}
                onEnded={onEnded}
                onCanPlayThrough={() => setStartAnimation(true)}
              />
            )}
          </div>
        </APIKitAnimation>
      )
    }

    const render = () => ReactDOM.render(<Video source={source} />, root)

    onUpdate(() => {
      render()
    })

    onNewSource((_source) => {
      source = _source
      render()
    })

    return {
      root,
    }
  },
} as Compositor.Transform.TransformDeclaration
