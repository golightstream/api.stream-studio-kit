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
  init({ addSource, removeSource, updateSource }) {
    CoreContext.on('RoomJoined', ({ room }) => {
      let listeners = {} as { [id: string]: Function }
      let previousTracks = [] as SDK.Track[]
      let previousParticipants = [] as SDK.Participant[]
      let participantStreams = {} as { [id: string]: MediaStream }

      const updateParticipants = () => {
        // Update existing participants' tracks
        previousParticipants.forEach((x) => {
          const srcObject = participantStreams[x.id]
          const srcObjectScreenshare = participantStreams[x.id + '-screen']

          // Get one webcam track and one microphone track
          const webcamId = x.trackIds.find((x) => {
            const track = room.getTrack(x)
            return track?.type === 'camera'
          })
          const microphoneId = x.trackIds.find((x) => {
            const track = room.getTrack(x)
            return track?.type === 'microphone'
          })
          const screenshareId = x.trackIds.find((x) => {
            const track = room.getTrack(x)
            return track?.type === 'screen_share'
          })

          const webcamTrack = room.getTrack(webcamId)
          const microphoneTrack = room.getTrack(microphoneId)
          const screenshareTrack = room.getTrack(screenshareId)

          // Replace the tracks on the existing MediaStream
          updateMediaStreamTracks(srcObject, {
            video: webcamTrack?.mediaStreamTrack,
            audio: microphoneTrack?.mediaStreamTrack,
          })
          updateMediaStreamTracks(srcObjectScreenshare, {
            video: screenshareTrack?.mediaStreamTrack,
          })

          updateSource(x.id, {
            videoEnabled: Boolean(webcamTrack && !webcamTrack.isMuted),
            audioEnabled: Boolean(microphoneTrack && !microphoneTrack.isMuted),
            displayName: x.displayName,
            mirrored: x?.meta?.isMirrored
          })
          updateSource(x.id + '-screen', {
            videoEnabled: Boolean(
              screenshareTrack && !screenshareTrack.isMuted,
            ),
            displayName:
              x.meta.screenDisplayName || `${x.displayName}'s Screen`,
          })
        })
      }

      // Listen for changes to available tracks
      room.useTracks((tracks) => {
        // Get tracks not contained in previousTracks
        const newTracks = tracks.filter(
          (track) => !previousTracks.some((x) => x.id === track.id),
        )
        // Get previous tracks not contained in current tracks
        const removedTracks = previousTracks.filter(
          (track) => !tracks.some((x) => x.id === track.id),
        )
        previousTracks = tracks

        updateParticipants()

        newTracks.forEach((x) => {
          const { mediaStreamTrack, id, participantId, type } = room.getTrack(
            x.id,
          )
          const source = {
            id,
            isActive: true,
            value: mediaStreamTrack,
            props: {
              trackId: id,
              participantId,
              isMuted: x.isMuted,
              type,
            },
          } as Compositor.Source.NewSource

          // Add each new track as a source
          if (mediaStreamTrack) {
            if (mediaStreamTrack.kind === 'video') {
              addSource(source)
            } else {
              addSource(source)
            }
          }
        })
        // Dispose of the old tracks
        removedTracks.forEach((x) => {
          removeSource(x.id)
          listeners[x.id]?.()
        })
      })

      // Listen for changes to available participants
      room.useParticipants((participants) => {
        // Get participants not contained in previousParticipants
        const newParticipants = participants.filter(
          (participant) =>
            !previousParticipants.some((x) => x.id === participant.id),
        )
        // Get previous participants not contained in current participants
        const removedParticipants = previousParticipants.filter(
          (participant) => !participants.some((x) => x.id === participant.id),
        )
        previousParticipants = participants

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
              mirrored: x?.meta?.isMirrored
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
