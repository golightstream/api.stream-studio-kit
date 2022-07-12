/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import ReactDOM from 'react-dom'
import React from 'react'
import { CoreContext } from '../context'
import { getProject } from './../../core/data'
import { Compositor } from '../namespaces'
import useUnload from '../../hooks/useUnload'
import { InternalEventMap } from '../events'
import APIKitAnimation from '../../compositor/html/html-animation'
import { APIKitAnimationTypes } from '../../animation/core/types'

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

export const Video = {
  name: 'LS-Video',
  sourceType: 'Video',
  props: {
    id: {
      type: String,
      required: true,
    },
  },
  useSource(sources, props) {
    return sources.find((x) => x.props.type === props.id)
  },
  create(
    { onUpdate, onNewSource, trigger, onRemove, triggerInternal, room },
    initialProps,
  ) {
    onRemove(() => {
      clearInterval(interval)
    })

    const root = document.createElement('div')

    let source: any
    let interval: NodeJS.Timer

    const Video = ({ source }: { source: any }) => {
      const role = getProject(CoreContext.state.activeProjectId).role
      const SourceTrigger = SourceTriggerMap.find(
        (x) => x.sourceType === initialProps.proxySource,
      )
      const { src, type, meta, loop } = source?.value || {}
      const { id } = source || {}

      const videoRef = React.useMemo(
        () => React.createRef<HTMLVideoElement>(),
        [id],
      )
      useUnload((e: BeforeUnloadEvent) => {
        if (id) {
          triggerInternal(SourceTrigger.trigger, {
            role,
            sourceId: id,
            doTrigger: false,
            metadata: {
              time: Math.floor(videoRef?.current?.currentTime) || 0,
              owner: room.participantId,
            },
          })
        }
      })

      const onLoadedData = React.useCallback(() => {
        if (videoRef?.current) {
          videoRef.current!.play().catch(() => {
            videoRef.current.muted = true
            videoRef.current.play()
          })
        }
      }, [src, videoRef])

      const onEnded = React.useCallback(() => {
        if (interval) {
          clearInterval(interval)
        }
        trigger('VideoEnded', { id: id, category: type })
      }, [src])

      React.useEffect(() => {
        if (meta) {
          if (room?.participantId !== meta?.owner && videoRef?.current) {
            videoRef.current.currentTime = meta?.time || 0
          }
        }
      }, [meta, videoRef])

      React.useEffect(() => {
        return room?.onData((event, senderId) => {
          // Handle request for time sync.
          if (videoRef?.current?.currentTime) {
            if (
              event.type === 'UserJoined' &&
              senderId !== room.participantId
            ) {
              triggerInternal(SourceTrigger.trigger, {
                role,
                sourceId: id,
                doTrigger: true,
                metadata: {
                  time: Math.floor(videoRef?.current?.currentTime) || 0,
                  owner: room.participantId,
                },
              })
            }
          }
        })
      }, [videoRef])

      React.useEffect(() => {
        if (id) {
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
        }
        return () => {
          if (interval) {
            clearInterval(interval)
          }
        }
      }, [id])

      React.useEffect(() => {
        if (videoRef.current) {
          triggerInternal(SourceTrigger.trigger, {
            role,
            sourceId: id,
            doTrigger: true,
            metadata: {
              time: Math.floor(videoRef?.current?.currentTime) || 0,
              owner: room.participantId,
            },
          })
        }
      }, []);
      
      return (
        <APIKitAnimation
          enter={APIKitAnimationTypes.FADE_IN}
          exit={APIKitAnimationTypes.FADE_OUT}
          duration={400}
        >
          {src && (
            <video
              key={id}
              ref={videoRef}
              style={initialProps.style}
              {...initialProps.props}
              onLoadedData={onLoadedData}
              onEnded={onEnded}
            />
          )}
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
