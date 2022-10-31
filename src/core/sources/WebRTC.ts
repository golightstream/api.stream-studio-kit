/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { updateMediaStreamTracks } from '../../helpers/webrtc'
import { CoreContext } from '../context'
import { SDK } from '../namespaces'
import { webrtcManager } from '../webrtc'
import { Source, SourceDeclaration } from '../../compositor/sources'
import decode from 'jwt-decode'

export const joinRoom = async (
  token: string,
  settings: {
    displayName: string
  },
) => {
  const tokenData = decode(token) as any
  const roomName = tokenData.video.room
  const url = new URL(CoreContext.clients.getLiveKitServer())
  const baseUrl = url.host + url.pathname
  const roomContext = webrtcManager.ensureRoom(baseUrl, roomName, token)
  roomContext.bindApiClient(CoreContext.clients)
  await roomContext.connect()
  return roomName
}

type Props = {
  participantId: string
  type: 'screen' | 'camera'
  displayName?: string
  // Video track muted by owner
  videoEnabled: boolean
  // Audio track muted by owner
  audioEnabled: boolean
  mirrored: boolean
}

type Value = MediaStream

export type RoomParticipantSource = Source<Props, Value>

export const RoomParticipant = {
  type: 'RoomParticipant',
  local: true,
  valueType: MediaStream,
  props: {
    participantId: {},
    type: {},
    displayName: {},
    videoEnabled: {},
    audioEnabled: {},
  },
  init() {
    let currentRoomParticipants = {} as {
      [id: string]: RoomParticipantSource
    }

    const getRoomParticipant = (props: Props) => {
      return currentRoomParticipants[props.participantId + '-' + props.type]
    }

    CoreContext.on('RoomJoined', ({ room }) => {
      currentRoomParticipants = {}
      let previousParticipants = [] as SDK.Participant[]

      // TODO: Ideally this logic should be handled in "onChange"
      const updateParticipants = () => {
        // Update existing participants' tracks
        previousParticipants.forEach((x) => {
          const participantSources = {
            camera: currentRoomParticipants[x.id + '-camera'],
            screen: currentRoomParticipants[x.id + '-screen'],
          }
          const streams = {
            camera: participantSources.camera?.value,
            screen: participantSources.screen?.value,
          }

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
          updateMediaStreamTracks(streams.camera, {
            video: webcamTrack?.mediaStreamTrack,
            audio: microphoneTrack?.mediaStreamTrack,
          })
          updateMediaStreamTracks(streams.screen, {
            video: screenshareTrack?.mediaStreamTrack,
          })

          // Update the existing sources based on the participant
          participantSources.camera.props = {
            ...participantSources.camera.props,
            videoEnabled: Boolean(webcamTrack && !webcamTrack.isMuted),
            audioEnabled: Boolean(microphoneTrack && !microphoneTrack.isMuted),
            displayName: x.displayName,
            mirrored: x.meta.isMirrored,
          }
          participantSources.screen.props = {
            ...participantSources.screen.props,
            videoEnabled: Boolean(
              screenshareTrack && !screenshareTrack.isMuted,
            ),
            displayName:
              x.meta.screenDisplayName || `${x.displayName}'s Screen`,
          }
        })
      }

      // Listen for changes to available tracks
      room.useTracks(() => {
        updateParticipants()
        triggerUpdate()
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
          const streams = {
            camera: new MediaStream([]),
            screen: new MediaStream([]),
          }

          currentRoomParticipants[id + '-camera'] = {
            id: id + '-camera',
            value: streams.camera,
            props: {
              participantId: id,
              type: 'camera',
              audioEnabled: false,
              videoEnabled: false,
              mirrored: Boolean(x.meta.isMirrored),
            },
          }
          currentRoomParticipants[id + '-screen'] = {
            id: id + '-screen',
            value: streams.screen,
            props: {
              participantId: id,
              type: 'screen',
              audioEnabled: false,
              videoEnabled: false,
              mirrored: false,
            },
          }
        })

        updateParticipants()

        // Dispose of the old participants
        removedParticipants.forEach((x) => {
          delete currentRoomParticipants[x + '-camera']
          delete currentRoomParticipants[x + '-screen']
        })

        triggerUpdate()
      })
    })

    let cid = 1
    type SourcesCallback = (sources: RoomParticipantSource[]) => void
    const triggerUpdate = () => {
      Object.values(listeners).forEach((x) =>
        x(Object.values(currentRoomParticipants)),
      )
    }
    const listeners = {} as {
      [id: string]: SourcesCallback
    }
    const subscribeToSources = (cb: SourcesCallback) => {
      const id = cid++
      listeners[id] = cb
      cb(Object.values(currentRoomParticipants))

      return () => {
        delete listeners[id]
      }
    }

    return {
      load(nodeSources) {
        subscribeToSources((roomParticipants) => {
          nodeSources.reset(
            RoomParticipant.type,
            roomParticipants.map((x) => ({
              id: x.id,
              props: x.props,
            })),
          )
        })
      },
      getValue(props) {
        const value = getRoomParticipant(props)?.value
        return {
          value,
          isActive: true,
        }
      },
      onChange(_, props) {
        // Note: We should probably manage the value update logic in here,
        //  but currently we don't need to do anything since that value is
        //  calculated at a global level.
        const value = getRoomParticipant(props)?.value
        return {
          value,
          isActive: true,
        }
      },
    }
  },
} as SourceDeclaration<Props, Value>

export const Declaration = [RoomParticipant]
