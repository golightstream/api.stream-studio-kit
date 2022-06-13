/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { webrtcManager } from './'
import { SpecialEvent } from './room-context'
import {
  RoomEvent,
  Participant,
  TrackPublication,
  Track,
  LocalTrack,
  DataPacket_Kind,
} from 'livekit-client'
import { SDK } from '../namespaces'
import { log } from '../context'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

const simpleRooms = new Map<string, SDK.Room>()

// TODO: Dispose of listeners when no longer needed
export const getRoom = (id: string) => {
  if (!id) return null
  if (simpleRooms.get(id)) return simpleRooms.get(id)

  const room = webrtcManager.rooms.get(id)
  if (!room) return null

  const livekit = room.livekitRoom
  const localParticipant = livekit.localParticipant

  // @ts-ignore
  window.__StudioRoom = livekit

  if (!localParticipant) log.warn('No local participant!')

  const listeners = {
    useTracks: new Set<Function>(),
    useTrack: new Map<Function, string>(),
    useParticipants: new Set<Function>(),
    useParticipant: new Map<Function, string>(),
    useChatHistory: new Set<Function>(),
  }

  type FullTrack = TrackPublication & { participant: Participant }

  let latest = {
    tracks: [] as FullTrack[],
    participants: [] as Participant[],
    result: {
      participants: [] as SDK.Participant[],
      tracks: [] as SDK.Track[],
    },
    chat: room.chatHistory,
  }
  const update = () => {
    const participants = room.participants
    const tracks = participants.flatMap((participant: Participant) =>
      participant.getTracks().map((pub) => ({
        ...pub,
        participant,
      })),
    ) as FullTrack[]

    const result = {
      participants: participants.map((x) => ({
        id: x.identity,
        isSelf: x === localParticipant,
        connectionQuality: x.connectionQuality,
        isSpeaking: x.isSpeaking,
        displayName: x.name,
        trackIds: tracks
          .filter((p) => p.participant.sid === x.sid)
          .map((x) => x.trackSid),
      })) as SDK.Participant[],
      tracks: tracks.map((x) => ({
        mediaStreamTrack: x.track?.mediaStreamTrack,
        id: x.trackSid,
        participantId: x.participant?.identity,
        isMuted: x.track?.isMuted,
        type: x.source,
      })) as SDK.Track[],
    }

    latest = {
      tracks,
      participants,
      result,
      chat: room.chatHistory,
    }

    // TODO: (Perf) Only call if something has changed
    listeners.useTracks.forEach((cb) => cb(result.tracks))
    listeners.useTrack.forEach((id, cb) => {
      // TODO: subscribe to TrackEvents when track exists
      // tracks.forEach(x => x.on(''))
      cb(getTrack(id))
    })
    listeners.useParticipants.forEach((cb) => cb(result.participants))
    listeners.useParticipant.forEach((id, cb) => {
      cb(getParticipant(id))
    })
    listeners.useChatHistory.forEach((cb) => {
      cb(latest.chat)
    })
  }

  /** events on which we will update our simple room */
  const updateEvents = [
    RoomEvent.ParticipantConnected,
    RoomEvent.ParticipantDisconnected,
    RoomEvent.ActiveSpeakersChanged,
    RoomEvent.AudioPlaybackStatusChanged,
    RoomEvent.Disconnected,
    RoomEvent.TrackSubscribed,
    RoomEvent.TrackUnsubscribed,
    RoomEvent.LocalTrackPublished,
    RoomEvent.LocalTrackUnpublished,
    RoomEvent.ConnectionQualityChanged,
    RoomEvent.TrackMuted,
    RoomEvent.TrackUnmuted,
    RoomEvent.TrackStreamStateChanged,
  ]

  const unsubscribers = updateEvents.map((evt) =>
    room.subscribeToRoomEvent(evt, update),
  )
  // Also subscribe to chat
  unsubscribers.push(room.subscribeToSpecialEvent(SpecialEvent.Chat, update))

  const unsubscribeFromAll = () => {
    unsubscribers.forEach((cb) => cb())
  }

  const getTrack = (id: string) => {
    return latest.result.tracks.find((x) => x.id === id)
  }

  const getParticipant = (id: string) => {
    return latest.result.participants.find((x) => x.id === id)
  }

  const setTrackEnabled = (id: string, enabled: boolean) => {
    const track = localParticipant.getTracks().find((x) => {
      return x.trackSid === id
    })
    if (track) {
      if (enabled) {
        // @ts-ignore
        track.mute()
      } else {
        // @ts-ignore
        track.unmute()
      }
    }
  }

  const simpleRoom = {
    id: room.roomName,
    participantId: localParticipant.identity,
    setTrackEnabled,
    setCameraEnabled: (enabled = true) => {
      localParticipant.setCameraEnabled(enabled)
    },
    setMicrophoneEnabled: (enabled = true) => {
      localParticipant.setMicrophoneEnabled(enabled)
    },
    setCamera: async (options = {}) => {
      const existing = localParticipant.getTracks().find((x) => {
        return x.source === Track.Source.Camera
      })
      const tracks = await localParticipant.createTracks({
        video: {
          deviceId: options.deviceId,
          resolution: options.resolution || {
            width: 1280,
            height: 720,
            frameRate: 30,
            aspectRatio: 16 / 9,
          },
        },
      })
      if (existing?.isMuted) {
        tracks.forEach((x) => {
          x.mute()
        })
      }
      const published = await Promise.all(
        tracks.map((x) => localParticipant.publishTrack(x)),
      )
      if (existing) {
        localParticipant.unpublishTrack(existing.track as LocalTrack)
      }
      return getTrack(published[0]?.trackSid)
    },
    setMicrophone: async (options) => {
      const existing = localParticipant.getTracks().find((x) => {
        return x.source === Track.Source.Microphone
      })
      const tracks = await localParticipant.createTracks({
        audio: options || true,
      })
      if (existing?.isMuted) {
        tracks.forEach((x) => {
          x.mute()
        })
      }
      const published = await Promise.all(
        tracks.map((x) => localParticipant.publishTrack(x)),
      )
      if (existing) {
        localParticipant.unpublishTrack(existing.track as LocalTrack)
      }
      return getTrack(published[0]?.trackSid)
    },
    addCamera: async (options = {}) => {
      const tracks = await localParticipant.createTracks({
        video: {
          deviceId: options.deviceId,
          resolution: options.resolution || {
            width: 1280,
            height: 720,
            frameRate: 30,
            aspectRatio: 16 / 9,
          },
        },
      })
      const published = await Promise.all(
        tracks.map((x) => localParticipant.publishTrack(x)),
      )
      return getTrack(published[0]?.trackSid)
    },
    addScreen: async (options = { audio: false }) => {
      const tracks = await localParticipant.createScreenTracks(options)
      const published = await Promise.all(
        tracks.map((x) => localParticipant.publishTrack(x)),
      )

      const screen = published.find((x) => x.kind === 'video')
      const audio = published.find((x) => x.kind === 'audio')

      return {
        screen: getTrack(screen?.trackSid),
        audio: getTrack(audio?.trackSid),
      }
    },
    removeTrack: async (id: string) => {
      const track = latest.tracks.find((x) => x.trackSid === id)
      localParticipant.unpublishTrack(track.track as LocalTrack)
    },

    kickParticipant: room.kickParticipant,
    muteTrackAsAdmin: room.muteTrackAsAdmin,
    sendChatMessage: room.sendChatMessage,

    // Callbacks
    getTracks: () => latest.result.tracks,
    useTracks: (cb) => {
      listeners.useTracks.add(cb)
      cb(latest.result.tracks)

      return () => {
        listeners.useTracks.delete(cb)
      }
    },
    getTrack,
    useTrack: (id, cb) => {
      listeners.useTrack.set(cb, id)
      cb(getTrack(id))

      return () => {
        listeners.useTrack.delete(cb)
      }
    },
    getParticipant,
    getParticipants: () => latest.result.participants,
    useParticipants: (cb) => {
      listeners.useParticipants.add(cb)
      cb(latest.result.participants)

      return () => {
        listeners.useTracks.delete(cb)
      }
    },
    useParticipant: (id, cb) => {
      listeners.useParticipant.set(cb, id)
      cb(getParticipant(id))

      return () => {
        listeners.useTrack.delete(cb)
      }
    },
    useChatHistory: (cb) => {
      listeners.useChatHistory.add(cb)
      cb(latest.chat)
      return () => {
        listeners.useChatHistory.delete(cb)
      }
    },
    sendData: (data, recipientIds) => {
      const encoded = encoder.encode(JSON.stringify(data))
      const participants = recipientIds?.map(
        (x) => room.livekitRoom.getParticipantByIdentity(x).sid,
      )
      return localParticipant.publishData(
        encoded,
        DataPacket_Kind.RELIABLE,
        participants,
      )
    },
    onData: (cb) => {
      const fn = (encoded: any, participant: Participant) => {
        const data = JSON.parse(decoder.decode(encoded))
        cb(data, participant?.identity)
      }
      room.livekitRoom.on(RoomEvent.DataReceived, fn)
      return () => {
        room.livekitRoom.off(RoomEvent.DataReceived, fn)
      }
    },
    connect: () => {
      return room.connect()
    },
    disconnect: () => {
      return room.livekitRoom.disconnect()
    },
    onDisconnected: (cb) => {
      room.livekitRoom.on(RoomEvent.Disconnected, cb)
      return () => {
        room.livekitRoom.off(RoomEvent.DataReceived, cb)
      }
    },
    setAudioOutput: (deviceId: string) => {
      return room.livekitRoom.switchActiveDevice('audiooutput', deviceId)
    },
  } as SDK.Room

  update()
  simpleRooms.set(id, simpleRoom)
  return simpleRoom
}
