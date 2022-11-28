/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import ReactDOM from 'react-dom'
import React from 'react'
import { CoreContext, InternalProject } from '../context'
import { getProject, getProjectRoom } from '../data'
import { Compositor, SDK } from '../namespaces'
import { InternalEventMap, trigger, triggerInternal, on } from '../events'
import APIKitAnimation from '../../compositor/html/html-animation'
import { APIKitAnimationTypes } from '../../animation/core/types'
import { hasPermission, Permission } from '../../helpers/permission'
import { Overlay } from '../sources/Overlays'
import { VideoRole } from '../types'

interface ISourceMap {
  sourceType: string
  trigger: keyof InternalEventMap
}

const newOverlays = (project: InternalProject, id: string) => {
  const overlays = project.props.overlays as Overlay[]
  const remainingOverlays = overlays.filter((x) => x.id !== id)
  const allForegroundOverlays = remainingOverlays.filter(
    (f) => f.props.type !== 'video-overlay',
  )
  return allForegroundOverlays.map((overlay) => {
    return {
      ...overlay,
      props: {
        ...overlay.props,
        meta: {
          ...overlay.props.meta,
          style: { opacity: 1 },
        },
      },
    }
  })
}

const showVideoReducer = (oldState: boolean, newState: boolean) => newState

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
    videoRole: {
      type: String,
      required: false,
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

    // intro / outro designated by videoRole
    const Video = (everything: { source: any }) => {
      const SourceTrigger = SourceTriggerMap.find(
        (x) => x.sourceType === initialProps.proxySource,
      )
      const { source } = everything
      const { src, type, meta, loop } = source?.value || {}
      const props = source?.props
      const { id } = source || {}
      const videoRole: VideoRole = source?.props?.videoRole

      const [refId, setRefId] = React.useState(null)
      const videoRef = React.useRef<HTMLVideoElement>(null)
      console.log('Updated current time', videoRef?.current?.currentTime)

      // We show video initially unless it is an intro video and we are not on the renderer, in which case we wait for the broadcast to start before showing the video
      const initialShowVideo = React.useMemo(() => {
        const value = videoRole !== VideoRole.Intro || role === SDK.Role.ROLE_RENDERER
        return value
      }, [props])
      // When showVideo is false, layer will just be plain black
      // (This is good for outros and intros)
      const [showVideo, setShowVideo] = React.useReducer(showVideoReducer, initialShowVideo)

      React.useEffect(() => {
        setShowVideo(initialShowVideo)
      }, [initialShowVideo])

      /* A callback function that is called when the video element is created. */
      const handleRect = React.useCallback((node: HTMLVideoElement) => {
        if (showVideo) {
          videoRef.current = node
          setRefId(node ? node.id : null)
        }
      }, [showVideo])

      React.useEffect(() => {
        // Do this when broadcast ends, or else this layer will remain black
        return on('BroadcastStopped', (payload) => {
          console.log('broadcast stopped!')
          if (payload.projectId === CoreContext.state.activeProjectId) {
            if (role !== SDK.Role.ROLE_RENDERER) {
              setShowVideo(true)
            }
          }
        })
      })

      React.useEffect(() => {
        return room.onData((data) => {
          // Start video when we receive signal from renderer
          // This prevents situation where intro video cuts out too early.
          if (data.type === 'StartVideo' && data.id === id && role !== SDK.Role.ROLE_RENDERER) {
            setShowVideo(true)
          }
        })
      })

      /* A callback function that is called when the video element is loaded. */
      const onLoadedData = React.useCallback(() => {
        // Send "start" signal over to webrtc ws connection so that other parties know to start the video
        if (videoRef?.current) {
          if (role === SDK.Role.ROLE_RENDERER) {
            const data = {
              type: 'StartVideo',
              id: id,
            }
            room.sendData(data)
          }
          videoRef.current!.play().catch(() => {
            videoRef.current.muted = true
            videoRef.current?.play()
          })
        }
      }, [src])

      /* A callback function that is called when the video playback ended. */
      const onEnded = React.useCallback(async () => {
        if (interval) {
          clearInterval(interval)
        }
        const project = CoreContext.state.projects[0]
        const sceneNode = CoreContext.state.projects[0].compositor.getRoot()
        // If video is an outro, stop the broadcast and remove the video from the renderer
        if (videoRole === VideoRole.Intro && sceneNode?.props?.type === 'scneless-project') {
          if (role === SDK.Role.ROLE_RENDERER) {
            const newForegroundOverlays = newOverlays(project, id)
            CoreContext.Command.updateProjectProps({
              projectId: CoreContext.state.activeProjectId,
              props: {
                overlays: newForegroundOverlays,
              },
            })
          }
        }
        if (videoRole === VideoRole.Outro) {

          // TODO: perhaps define behavior for non-sceneless projects
          if (sceneNode?.props?.type === 'sceneless-project') {
            if (project.videoApi.phase === SDK.ProjectBroadcastPhase.PROJECT_BROADCAST_PHASE_RUNNING) {
              setShowVideo(false)

              // Only stop the broadcast from the renderer
              if (role === SDK.Role.ROLE_RENDERER) {
                const newForegroundOverlays = newOverlays(project, id)
                CoreContext.Command.stopBroadcast({ projectId: CoreContext.state.activeProjectId })
                CoreContext.Command.updateProjectProps({
                  projectId: CoreContext.state.activeProjectId,
                  props: {
                    overlays: newForegroundOverlays,
                  },
                })
              }
            } else {
              // If broadcast is not running then renderer won't be up, so the host needs to remove the overlay.
              // TODO: Preferably, this would also be done by the server when a broadcast ends.
              // Otherwise, we could end up with a situation where the broadcast ends mid-outro.
              // This would result in the outro being played at the start of the next broadcast.
              if (role === SDK.Role.ROLE_HOST && project.videoApi.phase === SDK.ProjectBroadcastPhase.PROJECT_BROADCAST_PHASE_NOT_RUNNING || project.videoApi.phase === SDK.ProjectBroadcastPhase.PROJECT_BROADCAST_PHASE_STOPPED) {
                const newForegroundOverlays = newOverlays(project, id)
                // Remove the video overlay
                CoreContext.Command.updateProjectProps({
                  projectId: CoreContext.state.activeProjectId,
                  props: {
                    overlays: newForegroundOverlays,
                  },
                })
              }
            }
          }
        }
        trigger('VideoEnded', { id: id, category: type, videoRole })
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
        <APIKitAnimation
          id={id}
          type="video"
          enter={APIKitAnimationTypes.FADE_IN}
          exit={APIKitAnimationTypes.FADE_OUT}
          duration={400}
        >
          {showVideo && src && (
            <video
              id={id}
              ref={handleRect}
              style={initialProps.style}
              {...initialProps.props}
              onLoadedData={onLoadedData}
              onEnded={onEnded}
            />
          )}
          {!showVideo && (
            <div style={{...initialProps.style, background: 'black' }} />
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
