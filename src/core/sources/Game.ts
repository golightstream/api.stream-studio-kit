/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { updateMediaStreamTracks } from '../../helpers/webrtc'
import { connectDevice } from '../../logic'
import { CoreContext } from '../context'
import { getProject, toBaseProject } from '../data'
import { Compositor, SDK } from '../namespaces'

export type GameSource = {
  id: string
  value: MediaStream
  props: {
    id: string
    /** should always just be game */
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

export const Game = {
  type: 'Game',
  valueType: MediaStream,
  props: {
    id: {},
    type: {},
    videoEnabled: {},
    audioEnabled: {},
  },
  init({ addSource, removeSource, updateSource, getSource }) {
    // Updated by engine socket events
    let gameSourceStreams: { [id: string]: MediaStream } = {}
    let previousTracks: SDK.Track[] = []
    // Updated by corecontext events
    let previousGameSources: SDK.Source[] = []

    const updateGameSources = (sources: SDK.Source[]) => {
      // Get diffs
      const newSources = sources.filter((source) => {
        return !previousGameSources.some((s) => s.id === source.id)
      })

      const removedSources = previousGameSources.filter((source) => {
        return !sources.some((s) => s.id === source.id)
      })

      previousGameSources = sources

      // Add sources
      newSources.forEach(async (s) => {
        const srcObject = new MediaStream([])
        gameSourceStreams[s.id] = srcObject

        const videoTracks = srcObject.getVideoTracks()

        addSource({
          id: `game-${s.id}`,
          isActive: true,
          value: srcObject,
          props: {
            id: s.id,
            isMuted: false,
            participantId: s.id,
            type: 'game',
            videoEnabled: Boolean(videoTracks.length),
            audioEnabled: true,
          },
        } as Compositor.Source.NewSource)
      })

      // Remove sources
      removedSources.forEach((s) => {
        removeSource(`game-${s.id}`)
      })
    }

    CoreContext.on('RoomJoined', ({ projectId, room }) => {
      const project = toBaseProject(getProject(projectId))
      if (project.role !== SDK.Role.ROLE_RENDERER) {
        const updatePreviewStreams = () => {
          previousTracks
            .filter((p) => p?.type === 'screen_share' && p?.isExternal === true)
            .forEach((track) => {
              if (track.type === 'screen_share') {
                const srcObject = gameSourceStreams[track.participantId]
                const participant = room.getParticipant(track.participantId)
                // only do anything if it is for an Game source
                const isGameSource = previousGameSources.some(
                  (source) => source.id === participant.id,
                )
                if (isGameSource) {
                  const videoTrack = room.getTrack(track.id)
                  const source = getSource(`game-${participant?.id}`)
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

                    updateSource(`game-${participant?.id}`, {
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
          // Filter for those that are game-source
          const gameSourceTracks = tracks
            .filter((t) =>
              previousGameSources.some((s) => s.id === t.participantId),
            )
            .filter((t) => ['screen_share'].includes(t.type))

          // get tracks not contained in previous tracks
          const newTracks = gameSourceTracks.filter(
            (track) =>
              !previousTracks.some((x) => x.id === track.id) &&
              Boolean(track?.mediaStreamTrack),
          )

          // get previous tracks not contained in current tracks
          const removedTracks = previousTracks.filter(
            (t) => !gameSourceTracks.some((x) => x.id === t.id),
          )

          // Filter out racks that have a mediaStreamTrack
          previousTracks = gameSourceTracks.filter((t) =>
            Boolean(t?.mediaStreamTrack),
          )

          removedTracks.forEach((track) => {
            const { participantId } = track
            const srcObject = gameSourceStreams[participantId]

            if (track.mediaStreamTrack.kind === 'video') {
              updateMediaStreamTracks(srcObject, {
                video: null,
              })
              updateSource(`game-${participantId}`, {
                videoEnabled: false,
              })
            }
            if (track.mediaStreamTrack.kind === 'audio') {
              updateMediaStreamTracks(srcObject, {
                audio: null,
              })
              updateSource(`game-${participantId}`, {
                audioEnabled: false,
              })
            }
          })

          newTracks.forEach((track) => {
            if (
              track.type === 'screen_share' &&
              track.mediaStreamTrack.kind === 'video'
            ) {
              const srcObject = gameSourceStreams[track.participantId]
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
              updateSource(`game-${track.participantId}`, {
                videoEnabled: Boolean(track && !track?.isMuted),
                audioEnabled: Boolean(audioTrack && !audioTrack?.isMuted),
              })
            }
          })

          updatePreviewStreams()
        })
      }
    })

    CoreContext.on('ActiveProjectChanged', ({ projectId }) => {
      const project = toBaseProject(getProject(projectId))
      const sources = project.sources.filter(
        (s) => s.props.type === 'integration',
      )
      updateGameSources(sources)
    })

    CoreContext.onInternal('SourceConnected', async (id) => {
      const stream = gameSourceStreams[id]
      if (stream) {
        const deviceStream = await connectDevice(id)
        const source = getSource(`game-${id}`)

        if (source && deviceStream) {
          const audioTrack = deviceStream.getAudioTracks()[0]
          const videoTrack = deviceStream.getVideoTracks()[0]

          updateMediaStreamTracks(stream, {
            video: videoTrack,
            audio: audioTrack,
          })

          updateSource(`game-${id}`, {
            videoEnabled: Boolean(videoTrack),
            audioEnabled: Boolean(audioTrack),
            mirrored: false,
            external: true,
          })
        }
      }
    })

    CoreContext.onInternal('SourceDisconnected', (id) => {
      const stream = gameSourceStreams[id]
      if (stream) {
        const tracks = stream?.getTracks()
        tracks.forEach((track) => {
          gameSourceStreams[id]?.removeTrack(track)
        })
      }
    })

    CoreContext.on('ProjectSourceAdded', ({ source, projectId }) => {
      const project = toBaseProject(getProject(projectId))
      updateGameSources(
        project.sources.filter((s) => s?.props?.type === 'integration'),
      )
    })

    CoreContext.on('ProjectSourceRemoved', ({ sourceId, projectId }) => {
      const project = toBaseProject(getProject(projectId))
      updateGameSources(
        project.sources.filter((s) => s?.props?.type === 'integration'),
      )
    })
  },
} as Compositor.Source.SourceDeclaration
