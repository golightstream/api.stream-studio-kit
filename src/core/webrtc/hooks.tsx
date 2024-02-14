/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import React, {
  useCallback,
  useState,
  useEffect,
  useReducer,
  useContext,
} from 'react'
import {
  RoomContext,
  LSRoomContext,
  SpecialEvent,
  ChatObject,
} from './room-context'
import {
  Room,
  Participant,
  LocalParticipant,
  RoomEvent,
  RemoteTrack,
  Track,
  AudioTrack,
  ParticipantEvent,
  ConnectionQuality,
  TrackPublication,
  LocalTrack,
} from 'livekit-client'
import { webrtcManager } from './index'
import { CoreContext } from '../context'

type RoomManagerState = LSRoomContext
const initialValue: RoomContext = null
const roomContextReducer: React.Reducer<RoomManagerState, LSRoomContext> = (
  prevState,
  action,
) => {
  return action
}

const participantsReducer = (
  prevState: Participant[],
  action: Participant[],
) => {
  return action
}

type ChatState = ChatObject[]

/**
 * Event to be consumed by chat reducer
 */
type ChatEvent = {
  type: 'POST'
  payload: ChatObject
}

const initialChatState: ChatState = []

const roughChatReducer: React.Reducer<ChatState, ChatState> = (
  prevState,
  action,
) => action

const chatReducer: React.Reducer<ChatState, ChatEvent> = (
  prevState,
  action,
) => {
  switch (action.type) {
    case 'POST':
      return [...prevState, action.payload]
    default:
      return prevState
  }
}

/**
 * Basically replicates the same functionality as livekit-react's own useRoom hook.
 * Returns { room, participants, connect, isConnecting, chatHistory, sendChatMessage, isAdmin, removeParticipant, muteTrackAsAdmin }
 */
export const useLivekitRoom = (roomName: string, token: string) => {
  // TODO: use the actual app SFU token in the roomContext
  const url = new URL(CoreContext.clients.getLiveKitServer())
  const [roomContext, roomContextDispatch] = useReducer(
    roomContextReducer,
    webrtcManager.ensureRoom(url.host + url.pathname, roomName, token),
  )
  const [room, setRoom] = useState(roomContext.livekitRoom)
  const [participants, setParticipants] = useState(roomContext.participants)
  const [isConnecting, setIsConnecting] = useState(roomContext.isConnecting)
  const connect = roomContext.connect
  const [chatHistory, dispatchChat] = useReducer(
    roughChatReducer,
    roomContext.chatHistory,
  )
  const sendChatMessage = roomContext.sendChatMessage
  const removeParticipant = roomContext.kickParticipant
  const muteTrackAsAdmin = roomContext.muteTrackAsAdmin
  const isAdmin = roomContext.isAdmin
  const [videoTracks, setVideoTracks] = useState(
    roomContext.participants.flatMap((p) =>
      p.getTrackPublications().filter((t) => t.kind === 'video'),
    ),
  )
  const [audioTracks, setAudioTracks] = useState(
    roomContext.participants.flatMap((p) =>
      p.getTrackPublications().filter((t) => t.kind === 'audio'),
    ),
  )

  const connectFn = async () => {
    setIsConnecting(true)
    await connect()
    setIsConnecting(false)
  }

  const onParticipantsChanged = () => {
    if (!room) {
      return
    }
    setParticipants(roomContext.participants)
    setVideoTracks(
      roomContext.participants.flatMap((p) =>
        p.getTrackPublications().filter((t) => t.kind === 'video'),
      ),
    )
    setAudioTracks(
      roomContext.participants.flatMap((p) =>
        p.getTrackPublications().filter((t) => t.kind === 'audio'),
      ),
    )
  }

  const onDisconnect = () => {
    // Not sure why, but  putting this inside of a setTimeout prevents the app from breaking when localParticipant is kicked.
    setTimeout(() => {
      setRoom(null)
      setParticipants([])
      setVideoTracks([])
      setAudioTracks([])
    })
  }

  useEffect(() => {
    roomContext.subscribeToRoomEvent(
      RoomEvent.ParticipantConnected,
      onParticipantsChanged,
    )
    roomContext.subscribeToRoomEvent(
      RoomEvent.ParticipantDisconnected,
      onParticipantsChanged,
    )
    roomContext.subscribeToRoomEvent(
      RoomEvent.ActiveSpeakersChanged,
      onParticipantsChanged,
    )
    roomContext.subscribeToRoomEvent(
      RoomEvent.AudioPlaybackStatusChanged,
      onParticipantsChanged,
    )
    roomContext.subscribeToRoomEvent(RoomEvent.Disconnected, onDisconnect)
    roomContext.subscribeToRoomEvent(
      RoomEvent.TrackSubscribed,
      onParticipantsChanged,
    )
    roomContext.subscribeToRoomEvent(
      RoomEvent.TrackUnsubscribed,
      onParticipantsChanged,
    )
    roomContext.subscribeToRoomEvent(
      RoomEvent.LocalTrackPublished,
      onParticipantsChanged,
    )
    roomContext.subscribeToRoomEvent(
      RoomEvent.LocalTrackUnpublished,
      onParticipantsChanged,
    )
    roomContext.subscribeToSpecialEvent(SpecialEvent.Chat, dispatchChat)
    const unsubscribeFromConnect = roomContext.subscribeToConnect((newRoom) => {
      setTimeout(() => setRoom(newRoom))
      const parts: Participant[] = [newRoom.localParticipant]
      const remotes = Array.from(newRoom.remoteParticipants.values())
      parts.push(...remotes)
      setParticipants(parts)
      setIsConnecting(false)
    })
    return () => {
      roomContext.unsubscribeFromRoomEvent(
        RoomEvent.ParticipantConnected,
        onParticipantsChanged,
      )
      roomContext.unsubscribeFromRoomEvent(
        RoomEvent.ActiveSpeakersChanged,
        onParticipantsChanged,
      )
      roomContext.unsubscribeFromRoomEvent(
        RoomEvent.ParticipantDisconnected,
        onParticipantsChanged,
      )
      roomContext.unsubscribeFromRoomEvent(
        RoomEvent.AudioPlaybackStatusChanged,
        onParticipantsChanged,
      )
      roomContext.unsubscribeFromRoomEvent(RoomEvent.Disconnected, onDisconnect)
      roomContext.unsubscribeFromRoomEvent(
        RoomEvent.TrackSubscribed,
        onParticipantsChanged,
      )
      roomContext.unsubscribeFromRoomEvent(
        RoomEvent.TrackUnsubscribed,
        onParticipantsChanged,
      )
      roomContext.unsubscribeFromRoomEvent(
        RoomEvent.LocalTrackPublished,
        onParticipantsChanged,
      )
      roomContext.unsubscribeFromRoomEvent(
        RoomEvent.LocalTrackUnpublished,
        onParticipantsChanged,
      )
      roomContext.unsubscribeFromSpecialEvent(SpecialEvent.Chat, dispatchChat)
      unsubscribeFromConnect()
    }
  })

  return {
    room,
    participants,
    connect: connectFn,
    chatHistory,
    sendChatMessage,
    removeParticipant,
    muteTrackAsAdmin,
    isConnecting,
    roomContext,
    isAdmin,
  }
}

type LivekitContext = {
  roomName: string
  url: string
  token: string
}

/**
 * subscribes to a livekit RoomEvent for the lifecycle of the component
 */
export const useRoomEvent = (
  evt: RoomEvent,
  listener: (...args: any[]) => void,
) => {
  const { url, roomName } = useContext(LivekitContext)
  // TODO: use the actual SFU token in ensureRoom
  const [roomContext, roomContextDispatch] = useReducer(
    roomContextReducer,
    webrtcManager.ensureRoom(url, roomName, CoreContext.state.activeProjectId),
  )
  useEffect(() => {
    roomContext.subscribeToRoomEvent(evt, listener)
    return () => {
      roomContext.unsubscribeFromRoomEvent(evt, listener)
    }
  })
}

/**
 * Updates publications / subscribed tracks arrays when track is published/subscribed
 * Also returns isSpeaking, and isLocal
 */
export const useParticipant = (participant: Participant) => {
  const [publications, setPublications] = useState<TrackPublication[]>([])
  const [subscribedTracks, setSubscribedTracks] = useState<TrackPublication[]>(
    [],
  )
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [connectionQuality, setConnectionQuality] = useState(
    participant?.connectionQuality ?? ConnectionQuality.Unknown,
  )
  const onConnectionQualityChanged = (quality: ConnectionQuality) => {
    setConnectionQuality(quality)
  }

  const onPublishChanged = () => {
    const tracks = participant
      .getTrackPublications()
      .filter((t) => t.track !== undefined)
    setPublications(tracks)
    setSubscribedTracks(
      tracks.filter((t) => t.isSubscribed && t.track !== undefined),
    )
  }

  const onIsSpeakingChanged = () => {
    setIsSpeaking(participant.isSpeaking)
  }

  useEffect(() => {
    if (!participant) return
    onPublishChanged()
    onIsSpeakingChanged()

    participant.on(RoomEvent.TrackMuted, onPublishChanged)
    participant.on(RoomEvent.TrackUnmuted, onPublishChanged)
    participant.on(RoomEvent.LocalTrackPublished, onPublishChanged)
    participant.on(RoomEvent.LocalTrackUnpublished, onPublishChanged)
    participant.on(RoomEvent.TrackSubscribed, onPublishChanged)
    participant.on(RoomEvent.TrackUnsubscribed, onPublishChanged)
    participant.on(RoomEvent.TrackPublished, onPublishChanged)
    participant.on(RoomEvent.TrackUnpublished, onPublishChanged)
    participant.on(
      ParticipantEvent.ConnectionQualityChanged,
      onConnectionQualityChanged,
    )
    participant.on(ParticipantEvent.IsSpeakingChanged, onIsSpeakingChanged)
    return () => {
      participant.off(RoomEvent.TrackMuted, onPublishChanged)
      participant.off(RoomEvent.TrackUnmuted, onPublishChanged)
      participant.off(RoomEvent.LocalTrackPublished, onPublishChanged)
      participant.off(RoomEvent.LocalTrackUnpublished, onPublishChanged)
      participant.off(RoomEvent.TrackSubscribed, onPublishChanged)
      participant.off(RoomEvent.TrackUnsubscribed, onPublishChanged)
      participant.off(RoomEvent.TrackPublished, onPublishChanged)
      participant.off(RoomEvent.TrackUnpublished, onPublishChanged)
      participant.off(
        ParticipantEvent.ConnectionQualityChanged,
        onConnectionQualityChanged,
      )
      participant.off(ParticipantEvent.IsSpeakingChanged, onIsSpeakingChanged)
    }
  }, [participant])

  return {
    ...(participant || {}),
    publications,
    subscribedTracks,
    isLocal: participant instanceof LocalParticipant,
    isSpeaking,
    connectionQuality,
  }
}

/**
 * React context containing the url and roomname, which are in turn used to look up the livekit room
 */
export const LivekitContext = React.createContext<LivekitContext>({
  url: '',
  roomName: '',
  token: '',
})

/**
 * Just a shortcut that uses the react context so that you don't have to look it up every time you want to use the room
 */
export const useCurrentRoom = () => {
  const { url, roomName, token } = useContext(LivekitContext)
  return useLivekitRoom(roomName, token)
}
