/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { updateMediaStreamTracks } from '../../helpers/webrtc'
import { connectDevice } from '../../logic'
import { CoreContext } from '../context'
import { getProject, toBaseProject } from '../data'
import { Compositor, SDK } from '../namespaces'

export type RTMPSource = {
  id: string
  value: MediaStream
  props: {
    id: string
    /** should always just be rtmp */
    type: string
    displayName?: string
    videoEnabled?: boolean
    audioEnabled?: boolean
    mirrored?: boolean
    external?: boolean
    participantId?: string
    trackId?: string
    rtmpUrl?: string
    rtmpKey?: string
  }
}

export const RTMP = {
  type: 'RTMP',
  valueType: MediaStream,
  props: {
    id: {},
    type: {},
    videoEnabled: {},
    audioEnabled: {},
  },
  init({
    addSource,
    removeSource,
    updateSource,
    getSource
  }) {
    // Updated by engine socket events
    let rtmpSourceStreams: { [id: string]: MediaStream } = {}

    let previousTracks: SDK.Track[] = []
    // Updated by corecontext events
    let previousRTMPSources: SDK.Source[] = []

    const updateRTMPSources = (sources: SDK.Source[]) => {
      // Get diffs
      const newSources = sources.filter((source) => {
        return !previousRTMPSources.some((s) => s.id === source.id)
      })

      const removedSources = previousRTMPSources.filter((source) => {
        return !sources.some((s) => s.id === source.id)
      })

      previousRTMPSources = sources

      // Add sources
      newSources.forEach(async (s) => {
        const srcObject = new MediaStream([])
        rtmpSourceStreams[s.id] = srcObject

        const videoTracks = srcObject.getVideoTracks()

        addSource({
          id: `rtmp-${s.id}`,
          isActive: true,
          value: srcObject,
          props: {
            id: s.id,
            isMuted: false,
            participantId: s.id,
            type: 'rtmp',
            videoEnabled: Boolean(videoTracks.length),
            audioEnabled: true,
          },
        } as Compositor.Source.NewSource)
      })

      // Remove sources
      removedSources.forEach((s) => {
        removeSource(`rtmp-${s.id}`)
      })
    }

    CoreContext.on('ActiveProjectChanged', ({ projectId }) => {
      const project = toBaseProject(getProject(projectId))
      const sources = project.sources.filter((s) => !s.address?.dynamic?.id)
      updateRTMPSources(sources)
    })

    CoreContext.on('RoomJoined', ({ projectId, room }) => {
      const project = toBaseProject(getProject(projectId))
      if (project.role !== SDK.Role.ROLE_RENDERER) {
        let previousParticipants = [] as SDK.Participant[]
        /*  Updating the source of the camera. 
            Adding multi camera support
         */
        const updatePreviewStreams = () => {
          previousTracks
            .filter((p) => p?.type === 'screen_share' && p?.isExternal === true)
            .forEach((track) => {
              if (track.type === 'screen_share') {
                const srcObject = rtmpSourceStreams[track.participantId]
                const participant = room.getParticipant(track.participantId)
                // only do anything if it is for an RTMP source
                if (
                  previousRTMPSources.some(
                    (source) => source.id === participant.id,
                  )
                ) {
                  const videoTrack = room.getTrack(track.id)
                  const source = getSource(`rtmp-${participant?.id}`)
                  if (source) {
                    const audioTrack = room.getTracks().find((track) => {
                      return (
                        track.participantId === participant.id &&
                        track.mediaStreamTrack.kind === 'audio'
                      )
                    })
                    updateMediaStreamTracks(srcObject, {
                      video: videoTrack?.mediaStreamTrack,
                      audio: audioTrack?.mediaStreamTrack,
                    })

                    updateSource(`rtmp-${participant?.id}`, {
                      videoEnabled: Boolean(
                        videoTrack?.mediaStreamTrack && !videoTrack.isMuted,
                      ),
                      audioEnabled: Boolean(audioTrack && !audioTrack.isMuted),
                      mirrored: participant?.meta[track.id]?.isMirrored,
                      external: track?.isExternal,
                    })
                  }
                }
              }
            })
        }

        // listen for changes to available tracks
        room.useTracks((tracks) => {
          // Filter for those that are rtmp
          const rtmpTracks = tracks
            .filter((t) =>
              previousRTMPSources.some((s) => s.id === t.participantId),
            )
            .filter((t) => ['screen_share'].includes(t.type))

          // get tracks not contained in previous tracks
          const newTracks = rtmpTracks.filter(
            (track) =>
              !previousTracks.some((x) => x.id === track.id) &&
              Boolean(track?.mediaStreamTrack),
          )

          // get previous tracks not contained in current tracks
          const removedTracks = previousTracks.filter(
            (t) => !rtmpTracks.some((x) => x.id === t.id),
          )

          // Filter out racks that have a mediaStreamTrack
          previousTracks = rtmpTracks.filter((t) =>
            Boolean(t?.mediaStreamTrack),
          )

          removedTracks.forEach((track) => {
            const { participantId } = track
            const srcObject = rtmpSourceStreams[track.participantId]

            if (track.mediaStreamTrack.kind === 'video') {
              updateMediaStreamTracks(srcObject, {
                video: null,
              })
              updateSource(`rtmp-${track.participantId}`, {
                videoEnabled: false,
              })
            }
            if (track.mediaStreamTrack.kind === 'audio') {
              updateMediaStreamTracks(srcObject, {
                audio: null,
              })
              updateSource(`rtmp-${track.participantId}`, {
                audioEnabled: false,
              })
            }
          })

          newTracks.forEach((track) => {
            if (
              track.type === 'screen_share' &&
              track.mediaStreamTrack.kind === 'video'
            ) {
              const srcObject = rtmpSourceStreams[track.participantId]
              const audioTrack = previousTracks.find((t) => {
                return (
                  t.participantId === track.participantId &&
                  t.mediaStreamTrack?.kind === 'audio'
                )
              })
              updateMediaStreamTracks(srcObject, {
                video: track?.mediaStreamTrack,
                audio: audioTrack?.mediaStreamTrack,
              })
              updateSource(`rtmp-${track.participantId}`, {
                videoEnabled: Boolean(track && !track?.isMuted),
                audioEnabled: Boolean(audioTrack && !audioTrack?.isMuted),
              })
            }
          })

          updatePreviewStreams()
        })
      }
    })

    CoreContext.onInternal('SourceConnected', async (id) => {
      const stream = rtmpSourceStreams[id]
      if (stream) {
        const deviceStream = await connectDevice(id)
        const source = getSource(`rtmp-${id}`)

        if (source && deviceStream) {
          const audioTrack = deviceStream.getAudioTracks()[0]
          const videoTrack = deviceStream.getVideoTracks()[0]

          updateMediaStreamTracks(stream, {
            video: videoTrack,
            audio: audioTrack,
          })

          updateSource(`rtmp-${id}`, {
            videoEnabled: Boolean(videoTrack),
            audioEnabled: Boolean(audioTrack),
            mirrored: false,
            external: true,
          })
        }
      }
    })

    CoreContext.onInternal('SourceDisconnected', async (id) => {
      const stream = rtmpSourceStreams[id]
      if (stream) {
        const tracks = stream?.getTracks()
        tracks.forEach((track) => {
          rtmpSourceStreams[id]?.removeTrack(track)
        })

        updateSource(`rtmp-${id}`, {
          videoEnabled: false,
          audioEnabled: false,
          mirrored: false,
          external: true,
        })
      }
    })

    CoreContext.on('ProjectSourceAdded', ({ source, projectId }) => {
      const project = toBaseProject(getProject(projectId))
      const sources = project.sources.filter((s) => !s.address?.dynamic?.id)
      updateRTMPSources(sources)
    })

    CoreContext.on('ProjectSourceRemoved', ({ sourceId, projectId }) => {
      const project = toBaseProject(getProject(projectId))
      const sources = project.sources.filter((s) => !s.address?.dynamic?.id)
      updateRTMPSources(sources)
    })
  },
} as Compositor.Source.SourceDeclaration
