/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { updateMediaStreamTracks } from '../../helpers/webrtc'
import { CoreContext } from '../context'
import { Compositor, SDK } from '../namespaces'

type SourceDeclaration = Compositor.Source.SourceDeclaration

export type RoomParticipantSource = {
  // Equivalent to room participantId
  id: string
  value: MediaStream
  props: {
    // Equivalent to room participantId
    id: string

    type: 'screen' | 'camera'

    displayName: string
    // Video track muted by owner
    videoEnabled: boolean
    // Audio track muted by owner
    audioEnabled: boolean
    // Is Video mirrored
    mirrored: boolean

    external: boolean

    participantId: string

    trackId: string

    microphone?: SDK.Track
  }
}

export const RoomParticipant = {
  type: 'RoomParticipant',
  valueType: MediaStream,
  props: {
    id: {},
    type: {}, // 'screen' | 'camera'
    videoEnabled: {},
    audioEnabled: {},
  },
  init({ addSource, removeSource, updateSource, getSource }) {
    CoreContext.on('RoomJoined', ({ room }) => {
      let listeners = {} as { [id: string]: Function }
      let previousTracks = [] as SDK.Track[]
      let previousParticipants = [] as SDK.Participant[]
      let participantStreams = {} as { [id: string]: MediaStream }

      const updateParticipants = () => {
        /*  Updating the source of the camera.
            Adding multi camera support
        */
        previousTracks
          .filter((p) => p?.type === 'camera' && p?.isExternal === true)
          .forEach((track) => {
            if (track.type === 'camera') {
              const srcObject = participantStreams[track.id]
              const participant = room.getParticipant(track.participantId)
              const webcamTrack = room.getTrack(track.id)
              const source = getSource(track?.id)
              if (source) {
                const microphoneTrack = room.getTrack(
                  participant?.meta[track.id]?.microphone,
                )
                // Replace the tracks on the existing MediaStream
                updateMediaStreamTracks(srcObject, {
                  video: webcamTrack?.mediaStreamTrack,
                  audio: microphoneTrack?.mediaStreamTrack,
                })

                updateSource(track.id, {
                  videoEnabled: Boolean(webcamTrack && !webcamTrack.isMuted),
                  audioEnabled: Boolean(
                    microphoneTrack && !microphoneTrack.isMuted,
                  ),
                  displayName:
                    participant?.meta[track.id]?.displayName ||
                    'External Track',
                  mirrored: participant?.meta[track.id]?.isMirrored,
                  microphone: microphoneTrack,
                  external: track?.isExternal,
                })
              }
            }
          })

        // Update existing participants' tracks
        previousParticipants.forEach((x) => {
          const srcObject = participantStreams[x.id]
          const srcObjectScreenshare = participantStreams[x.id + '-screen']

          // Get one webcam track and one microphone track
          const webcamId = x.trackIds.find((trackId) => {
            const track = room.getTrack(trackId)
            return track?.type === 'camera' && !track?.isExternal
          })
          const microphoneId = x.trackIds.find((x) => {
            const track = room.getTrack(x)
            return track?.type === 'microphone' && !track?.isExternal
          })
          const screenshareId = x.trackIds.find((x) => {
            const track = room.getTrack(x)
            return track?.type === 'screen_share'
          })

          const screenshareAudioId = x.trackIds.find((x) => {
            const track = room.getTrack(x)
            return track?.type === 'screen_share_audio'
          })

          const webcamTrack = room.getTrack(webcamId)
          const microphoneTrack = room.getTrack(microphoneId)
          const screenshareTrack = room.getTrack(screenshareId)
          const screenshareAudioTrack = room.getTrack(screenshareAudioId)

          // Replace the tracks on the existing MediaStream
          updateMediaStreamTracks(srcObject, {
            video: webcamTrack?.mediaStreamTrack,
            audio: microphoneTrack?.mediaStreamTrack,
          })
          updateMediaStreamTracks(srcObjectScreenshare, {
            video: screenshareTrack?.mediaStreamTrack,
            audio: screenshareAudioTrack?.mediaStreamTrack,
          })

          updateSource(x.id, {
            videoEnabled: Boolean(webcamTrack && !webcamTrack.isMuted),
            audioEnabled: Boolean(microphoneTrack && !microphoneTrack.isMuted),
            displayName: x.displayName,
            mirrored: x?.meta?.isMirrored,
            external: webcamTrack?.isExternal,
          })
          updateSource(x.id + '-screen', {
            videoEnabled: Boolean(
              screenshareTrack && !screenshareTrack.isMuted,
            ),
            audioEnabled: Boolean(
              screenshareAudioTrack && !screenshareAudioTrack.isMuted,
            ),
            displayName:
              x.meta.screenDisplayName || `${x.displayName}'s Screen`,
            external: screenshareTrack?.isExternal,
          })
        })
      }

      // Listen for changes to available tracks
      room.useTracks((tracks) => {
        // Get tracks not contained in previousTracks
        const newTracks = tracks.filter(
          (track) =>
            !previousTracks.some((x) => x.id === track.id) &&
            Boolean(track?.mediaStreamTrack),
        )
        // Get previous tracks not contained in current tracks
        const removedTracks = previousTracks.filter(
          (track) => !tracks.some((x) => x.id === track.id),
        )

        /* Filtering out the tracks that have a mediaStreamTrack. */
        previousTracks = tracks.filter((t) => Boolean(t?.mediaStreamTrack))

        newTracks.forEach((x) => {
          const srcObject = new MediaStream([])
          participantStreams[x.id] = srcObject
          const { id, participantId, type, mediaStreamTrack } = room.getTrack(
            x.id,
          )

          // Add each new track as a source
          if (mediaStreamTrack) {
            addSource({
              id,
              isActive: true,
              value: srcObject,
              props: {
                id,
                trackId: id,
                participantId,
                isMuted: x.isMuted,
                type,
              },
            } as Compositor.Source.NewSource)
          }
        })

        // Dispose of the old tracks
        removedTracks.forEach((x) => {
          removeSource(x.id)
          listeners[x.id]?.()
        })
        updateParticipants()
      })

      // Listen for changes to available participants
      room.useParticipants((participants) => {
        // Get participants not contained in previousParticipants
        const roomParticipants = participants.filter(
          (x) => !x.id.startsWith('source'),
        )
        const newParticipants = roomParticipants.filter(
          (participant) =>
            !previousParticipants.some((x) => x.id === participant.id),
        )
        // Get previous participants not contained in current participants
        const removedParticipants = previousParticipants.filter(
          (participant) =>
            !roomParticipants.some((x) => x.id === participant.id),
        )

        previousParticipants = roomParticipants
        newParticipants.forEach((x) => {
          const { id } = x
          const srcObject = new MediaStream([])
          const screenSrcObject = new MediaStream([])
          participantStreams[id] = srcObject
          participantStreams[id + '-screen'] = screenSrcObject

          addSource({
            id,
            isActive: true,
            value: srcObject,
            props: {
              id,
              type: 'camera',
              displayName: x.displayName || x.id,
              audioEnabled: false,
              videoEnabled: false,
              mirrored: x?.meta?.isMirrored,
            },
          })
          addSource({
            id: id + '-screen',
            isActive: true,
            value: screenSrcObject,
            props: {
              id,
              type: 'screen',
              displayName: x.displayName || x.id,
              audioEnabled: false,
              videoEnabled: false,
            },
          })
        })

        updateParticipants()

        // Dispose of the old participants
        removedParticipants.forEach((x) => {
          removeSource(x.id)
          listeners[x.id]?.()
        })
      })
    })
  },
} as SourceDeclaration
