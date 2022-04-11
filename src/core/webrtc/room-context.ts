/* --------------------------------------------------------------------------------------------- 
 * Copyright (c) Infiniscene, Inc. All rights reserved. 
 * Licensed under the MIT License. See License.txt in the project root for license information. 
 * -------------------------------------------------------------------------------------------- */
import { connect, ParticipantEvent, Room, RoomEvent, Participant, DataPacket_Kind, ConnectOptions, AudioTrack, RoomState, RemoteParticipant } from 'livekit-client'
import { LiveKitServer, ApiStream, LiveKitUtils } from '@api.stream/sdk'
import decode from 'jwt-decode'
import { log } from '../context'
export * as Livekit from 'livekit-client'

/**
 * Types of data messages that are sent/received via websocket
 */
enum DataType {
  ChatMessage = 'ChatMessage'
}

/**
 * Special events that are implemented/triggered manually
 */
export enum SpecialEvent {
  /** Chat event listener is of type (x: ChatObject) => void */
  Chat = 'Chat'
}

/**
 * Data object received as websocket message
 */
interface DataObject {
  type: DataType
}

/**
 * Chat message sent/received via websocket.
 * This is the structure of the message as it is transferred via websocket.
 */
interface ChatDataObject extends DataObject {
  /**
   * Always `'ChatMessage'`
   */
  type: DataType.ChatMessage
  /**
   * content of chat message
   */
  content: string
  timestamp: number
  /**
   * Identities of the recipient {@link Participant Participants}. Only specified if it is a private message. Otherwise, it is undefined.
   */
  recipients?: string[]
  /**
   * Field for miscellaneous data
   */
  metadata?: object | string
}

/**
 * We have included in the {@link Room} model methods for implementing a chat interface between the {@link Participant Participants} of a WebRTC Room.
 * Chat messages are stored as instances of this ChatObject model.
 *
 * *(See: {@link Room.sendChatMessage sendChatMessage}, {@link Room.useChatHistory useChatHistory})*
 * @category WebRTC
 */
export interface ChatObject extends ChatDataObject {
  /**
   * identity of sender
   */
  sender: string
  /**
   * Display name of message sender.
   * This is included in addition to the sender's id so that messages can be displayed properly even after the sender has left the {@link Room}.
   */
  displayName: string
}


const decoder = new TextDecoder()
const encoder = new TextEncoder()


/**
 * RoomsManager is essentially a singleton for accessing all livekit rooms
 */
interface IRoomsManager {
  /**
   * Map to different room contexts. keys are the room names.
   */
  rooms: Map<string, LSRoomContext>
  addRoom(baseUrl: string, roomName: string, token: string): LSRoomContext
  /**
   * Returns a matching RoomContext if it already exists. Creates and then returns a matching RoomContext otherwise
   */
  ensureRoom(baseUrl: string, roomName: string, token: string): LSRoomContext
  removeRoom(roomName: string): void
}

enum RoomContextEvent {
  Connect = 'Connect',
  Disconnect = 'Disconnect',
}

/**
 * Wraps livekit Room interface and allows us to access it, act on it, regardless of connection state
 */
export interface LSRoomContext {
  audioTracks: AudioTrack[]
  /**
   * Bind ApiStream Client to the room context.
   * Must be done before connecting in order to do admin actions.
   */
  bindApiClient: (client: ApiStream) => void
  connect: (options?: ConnectOptions) => Promise<Room>
  /**
   * Array of chat messages in ascending chronological order 
   */
  chatHistory: ChatObject[]
  /**
   * Sends chat message to entire livekit room, or a private message (if specified) from local participant
   * @param {string[]} [data.recipients] The identities of the recipient participants. If undefined, will send message to all participants in the chat.
   * Only specify for private messages.
   * Do not include the local participant's identity in this.
   */
  sendChatMessage(data: { message:  string, recipients?: string[], metadata?: object | string }): void
  /**
   * Is the localParticipant a room admin?
   */
  isAdmin?: boolean
  isConnecting: boolean
  livekitRoom?: Room
  participants: Participant[]
  /** name of room */
  roomName: string
  /**
   * kick a remote participant from your livekit room. Can only be used by admins.
   * @param identity Identity of the user that you wish to kick
   */
  kickParticipant(identity: string): void
  /**
   * mute a track as room admin
   */
  muteTrackAsAdmin(trackSid: string): void
  /**
   * Special method for subscribing to livekit room connect events.
   */
  subscribeToConnect(listener: (room: Room) => void): () => void
  /**
   * Subscribe to a room event. Returns a function that will unsubscribe from the event when invoked.
   * Use this method because it is safe to use even if room does not exist yet, which will avoid a ton of null checks.
   * If room does not exist yet, it will subscribe to the room event once the room is created.
   * @param {RoomEvent} evt the room event
   * @param listener event listener to be called
   */
  subscribeToRoomEvent(evt: RoomEvent, listener: (...args: any[]) => void): () => void
  /**
   * Subscribe to a local participant event event. Returns a function that will unsubscribe from the event when invoked.
   * Use this method because it is safe to use even if room does not exist yet.
   * @param {ParticipantEvent} evt the local participant event
   * @param listener event listener to be called
   */
  subscribeToLocalParticipantEvent(evt: string, listener: (...args: any[]) => void): () => void
  /**
   * Subscribe to a special event event such as a chat event. Returns a function that will unsubscribe from the event when invoked.
   * Use this method because it is safe to use even if room does not exist yet.
   * @param {string} evt the local participant event
   * @param listener event listener to be called
   */
  subscribeToSpecialEvent(evt: SpecialEvent, listener: (...args: any[]) => void): () => void

  /**
   * should be the same as the sfu token
   */
  token: string
  readonly url: string
  /**
   * special method for unsubscribing from livekit room connect events
   */
  unsubscribeFromConnect(listener: (room: Room) => void): void
  /**
   * Unsubscribe from a room event
   * Use this method because it is safe to use even if room does not exist yet.
   * @param {RoomEvent} evt the room event
   * @param listener event listener to be removed
   */
  unsubscribeFromRoomEvent(evt: RoomEvent, listener: (...args: any[]) => void): void
  /**
   * Unsubscribe from a local participant event
   * Use this method because it is safe to use even if room does not exist yet.
   * @param {ParticipantEvent} evt the room event right now there is only 'Chat'
   * @param listener event listener to be removed
   */
  unsubscribeFromLocalParticipantEvent(evt: string, listener: (...args: any[]) => void): void
  /**
   * Unsubscribe from a speceal event
   * Use this method because it is safe to use even if room does not exist yet.
   * @param {SpecialEvent} evt the room event right now there is only 'Chat'
   * @param listener event listener to be removed
   */
  unsubscribeFromSpecialEvent(evt: SpecialEvent, listener: (...args: any[]) => void): void
}

/**
 * Basically, a singleton for managing and accessing all livekit rooms.
 * Contains a 'rooms' property, which is of type Map<roomName, RoomContext>
 */
export class RoomsManager implements IRoomsManager {
  rooms: Map<string, LSRoomContext>
  constructor() {
    this.rooms = new Map<string, LSRoomContext>()

    this.addRoom = this.addRoom.bind(this)
    this.ensureRoom = this.ensureRoom.bind(this)
    this.removeRoom = this.removeRoom.bind(this)
  }

  addRoom(baseUrl: string, roomName: string, token: string): LSRoomContext {
    const roomContext = new RoomContext(baseUrl, roomName, token, this)
    this.rooms.set(roomName, roomContext)
    return roomContext
  }

  ensureRoom(baseUrl: string, roomName: string, token: string): LSRoomContext {
    if (this.rooms.get(roomName)) {
      this.rooms.get(roomName).token = token
      return this.rooms.get(roomName)
    } else {
      return this.addRoom(baseUrl, roomName, token)
    }
  }

  async removeRoom(roomName: string) {
    const room = this.rooms.get(roomName)
    if (!Room) {
      throw new Error('room not found!')
    }
    if (room.isConnecting) {
      throw new Error('Cannot remove room: Room is in connecting state')
    }
    if (room.livekitRoom) {
      await room.livekitRoom.disconnect(true)
    }
    this.rooms.delete(roomName)
  }
}

export class RoomContext implements LSRoomContext {
  /**
   * base URL for the webrtc server
   */
  private _baseUrl: string
  private _chatHistory: ChatObject[]
  /**
   * event listeners just for livekit room connect
   */
  private _connectListeners: Array<(room: Room) => void>
  /**
   * Event listeners that are registered OR to be registered upon connection
   * Keys are of type RoomEvent
   */
  private _roomEventListenerRegistry: {
    [RoomEvent: string]: Set<(...args: any[]) => void>
  }

  /**
   * Event listeners that are registered OR to be registered on the localParticipant upon connection
   * Keys are of type ParticipantEvent
   */
  private _localParticipantEventListenerRegistry: {
    [ParticipantEvent: string]: Set<(...args: any[]) => void>
  }

  /**
   * Registry for special/custom events such as chat events
   */
  private _specialEventListenerRegistry: {
    [EventName: string]: Set<(...args: any[]) => void>
  }

  /**
   * access token for our connection
   * Should be acquired from vapi
   */
  private _jwt: string
  /**
   * reference to the rooms manager that contains it
   */
  private _manager: IRoomsManager
  private _apiClient: ApiStream
  audioTracks: AudioTrack[]
  isConnecting: boolean
  livekitRoom: Room
  participants: Participant[]
  roomName: string
  /**
   * Livekit Room Service client, for performing admin functions
   * Should only be defined if user is room admin
   */
  private _admin: LiveKitServer.RoomServiceClient

  /**
   * @param baseUrl base url for the webrtc server
   * @param token get
   */
  constructor(baseUrl: string, roomName: string, token: string, manager: IRoomsManager) {
    this._baseUrl = baseUrl
    this._connectListeners = []
    this._roomEventListenerRegistry = {}
    this._jwt = token
    Object.values(RoomEvent).forEach((value) => {
      this._roomEventListenerRegistry[value] = new Set()
    })
    this._localParticipantEventListenerRegistry = {}
    Object.values(ParticipantEvent).forEach((value) => {
      this._localParticipantEventListenerRegistry[value] = new Set()
    })
    this._specialEventListenerRegistry = {}
    this._manager = manager
    this._chatHistory = []
    this.roomName = roomName
    this.audioTracks = []
    this.participants = []
    this.isConnecting = false
    this.subscribeToRoomEvent(RoomEvent.DataReceived, (payload: Uint8Array, participant: Participant, kind: DataPacket_Kind) => {
      const strData = decoder.decode(payload)
      const data: DataObject = JSON.parse(strData)
      switch (data.type) {
        case DataType.ChatMessage: {
          return this._appendChat(payload, participant, kind)
        }
        default:
          return
      }
    })


    // Bind instance methods

    this.connect = this.connect.bind(this)
    this.subscribeToRoomEvent = this.subscribeToRoomEvent.bind(this)
    this.subscribeToConnect = this.subscribeToConnect.bind(this)
    this.subscribeToLocalParticipantEvent = this.subscribeToLocalParticipantEvent.bind(this)
    this.subscribeToSpecialEvent = this.subscribeToSpecialEvent.bind(this)
    this.unsubscribeFromRoomEvent = this.unsubscribeFromRoomEvent.bind(this)
    this.unsubscribeFromSpecialEvent = this.unsubscribeFromSpecialEvent.bind(this)
    this.unsubscribeFromConnect = this.unsubscribeFromConnect.bind(this)
    this.unsubscribeFromLocalParticipantEvent = this.unsubscribeFromLocalParticipantEvent.bind(this)
    this.sendChatMessage = this.sendChatMessage.bind(this)
    this.kickParticipant = this.kickParticipant.bind(this)
    this.muteTrackAsAdmin = this.muteTrackAsAdmin.bind(this)
    this._updateParticipants = this._updateParticipants.bind(this)

    // Permanently watch for updates to participants
    this.subscribeToRoomEvent(RoomEvent.ParticipantConnected, this._updateParticipants)
    this.subscribeToRoomEvent(RoomEvent.ParticipantDisconnected, this._updateParticipants)
    this.subscribeToRoomEvent(RoomEvent.TrackSubscribed, this._updateParticipants)
    this.subscribeToRoomEvent(RoomEvent.TrackUnsubscribed, this._updateParticipants)
    this.subscribeToRoomEvent(RoomEvent.LocalTrackPublished, this._updateParticipants)
    this.subscribeToRoomEvent(RoomEvent.LocalTrackUnpublished, this._updateParticipants)
    this.subscribeToRoomEvent(RoomEvent.Disconnected, () => {
      this.livekitRoom.removeAllListeners()
      this.livekitRoom = null
      this._updateParticipants()
    })
  }

  bindApiClient(client: ApiStream) {
    this._apiClient = client
  }

  get isAdmin(): boolean {
    const tokenData: object = decode(this._jwt)
    // @ts-ignore
    return tokenData.video.roomAdmin
  }

  set isAdmin(value: boolean) {
    log.warn('isAdmin cannot be set')
  }

  get token() {
    return this._jwt
  }

  set token(value: string) {
    this._jwt = value
  }

  get url() {
    return this._baseUrl
  }

  set url(value: string) {
  }

  get chatHistory() {
    return this._chatHistory
  }

  set chatHistory(value: ChatObject[]) {
    this._chatHistory = value
  }

  private _updateParticipants() {
    if (!this.livekitRoom || this.livekitRoom.state === RoomState.Disconnected) {
      this.participants = []
      return
    } else {
      const remotes = Array.from(this.livekitRoom.participants.values())
      const parts = [this.livekitRoom.localParticipant] as Participant[]
      parts.push(...remotes)
      this.participants = parts

    }
  }


  /**
   * @param identity Identity of the user that you wish to kick
   */
  async kickParticipant(identity: string) {
    if (this._admin) {
      this._admin.removeParticipant(this.roomName, identity)
    } else {
      throw new Error('no admin permissions')
    }
  }

  muteTrackAsAdmin(trackSid: string) {
    if (this._admin) {
      const participant = this.participants.find(p => (
        Array.from(p.audioTracks.values()).find(pub => pub.trackSid === trackSid)
      ))
      this._admin.mutePublishedTrack(this.roomName, participant?.identity, trackSid, true)
    } else {
      throw new Error('no admin permissions')
    }
  }

  private _appendChat(payload: Uint8Array, participant: Participant, kind: DataPacket_Kind) {
    const strData = decoder.decode(payload)
    const data: ChatDataObject = JSON.parse(strData)
    const sender = participant.identity
    const displayName = participant.name
    const fullData: ChatObject = {
      ...data,
      displayName,
      sender,
    }
    this.chatHistory = [
      ...this.chatHistory,
      fullData,
    ]
    this._triggerSpecialEvents(SpecialEvent.Chat, fullData)
  }

  subscribeToConnect(listener: (room: Room) => void) {
    this._connectListeners.push(listener)
    return () => this.unsubscribeFromConnect(listener)
  }

  unsubscribeFromConnect(listener: (room: Room) => void) {
    this._connectListeners = this._connectListeners.filter(cb => cb !== listener)
  }

  subscribeToSpecialEvent(evt: SpecialEvent, listener: (...args: any[]) => void) {
    if (!this._specialEventListenerRegistry[evt]) {
      this._specialEventListenerRegistry[evt] = new Set()
    }
    this._specialEventListenerRegistry[evt].add(listener)
    return () => {
      this.unsubscribeFromSpecialEvent(evt, listener)
    }
  }

  unsubscribeFromSpecialEvent(evt: SpecialEvent, listener: (...args: any[]) => void) {
    if (!this._specialEventListenerRegistry[evt]) {
      this._specialEventListenerRegistry[evt] = new Set()
    }
    this._specialEventListenerRegistry[evt].delete(listener)
  }

  private _triggerSpecialEvents(evt: SpecialEvent, ...args: any[]) {
    if (!this._specialEventListenerRegistry[evt]) {
      this._specialEventListenerRegistry[evt] = new Set()
    }
    this._specialEventListenerRegistry[evt].forEach((listener) => {
      listener(...args)
    })
  }

  /**
   * connect to livekit webrtc room
   * @param {string} identity unique user name to be displayed to other users
   */
  async connect(options?: ConnectOptions) {
    try {
      if (this.livekitRoom && this.livekitRoom.state === 'connected') {
        return this.livekitRoom
      }
      if (this.isConnecting) return null
      this.isConnecting = true
      // Fetch token
      const room = await connect(`wss://${this._baseUrl}`, this._jwt, options)

      this.livekitRoom = room
      this.isConnecting = false

      // Bind registered events to the webrtc room
      Object.values(RoomEvent).forEach((eventName) => {
        this.livekitRoom.on(eventName, (...args: any[]) => {
          this._roomEventListenerRegistry[eventName]
            .forEach((cb) => {
              cb(...args)
            })
        })
      })

      // Bind registered eventws to the localParticipant
      Object.values(ParticipantEvent).forEach((eventName) => {
        this.livekitRoom.localParticipant.on(eventName, (...args: any[]) => {
          this._localParticipantEventListenerRegistry[eventName]
            .forEach((cb) => {
              cb(...args)
            })
        })
      })

      this._updateParticipants()
      this._connectListeners.forEach(cb => cb(this.livekitRoom))

      if (LiveKitUtils.isRoomAdmin(this._jwt)) {
        log.info('Room: Granting admin permissions')
        log.debug('Livekit server: ', this._apiClient?.getLiveKitServer())
        this._admin = new LiveKitServer.RoomServiceClient(this._apiClient?.getLiveKitServer(), undefined, undefined, this._jwt)
      } else {
        log.debug('Room: Not an admin')
      }
      return room
    } catch (err) {
      this.isConnecting = false
      // TODO: handle error
      log.error(err)
    }
  }

  subscribeToLocalParticipantEvent(evt: string, listener: (...args: any[]) => void): () => void {
    if (!this._localParticipantEventListenerRegistry[evt]) {
      this._localParticipantEventListenerRegistry[evt] = new Set<(...args: any[]) => void>()
    }
    this._localParticipantEventListenerRegistry[evt].add(listener)
    return () => {
      this.unsubscribeFromLocalParticipantEvent(evt, listener)
    }
  }

  unsubscribeFromLocalParticipantEvent(evt: string, listener: (...args: any[]) => void): void {
    if (!this._localParticipantEventListenerRegistry[evt]) {
      this._localParticipantEventListenerRegistry[evt] = new Set<(...args: any[]) => void>()
    }
    this._localParticipantEventListenerRegistry[evt].delete(listener)
  }

  subscribeToRoomEvent(evt: RoomEvent, listener: (...args: any[]) => void): () => void {
    if (!this._roomEventListenerRegistry[evt]) {
      this._roomEventListenerRegistry[evt] = new Set<(...args: any[]) => void>()
    }
    this._roomEventListenerRegistry[evt].add(listener)
    return () => {
      this.unsubscribeFromRoomEvent(evt, listener)
    }
  }

  unsubscribeFromRoomEvent(evt: RoomEvent, listener: (...args: any[]) => void): void {
    if (!this._roomEventListenerRegistry[evt]) {
      this._roomEventListenerRegistry[evt] = new Set<(...args: any[]) => void>()
    }
    this._roomEventListenerRegistry[evt].delete(listener)
  }

  /**
   * Sends chat message to entire livekit room, or a private message (if specified) from local participant
   * @param {string[]} [recipients] The identities of the recipient participants. If undefined, will send message to all participants in the chat.
   * Only specify for private messages.
   * Do not include the local participant's identity in this.
   */
  sendChatMessage(data: { message:  string, recipients?: string[], metadata?: object | string }) {
    const { message, recipients, metadata } = data
    if (!this.livekitRoom || this.livekitRoom.state !== 'connected') {
      return
    }
    const messageObject: ChatDataObject = {
      type: DataType.ChatMessage,
      recipients,
      metadata,
      content: message,
      timestamp: Date.now(),
    }
    const strData = JSON.stringify(messageObject)
    const encodedData = encoder.encode(strData)
    const chatObject: ChatObject = {
      ...messageObject,
      sender: this.livekitRoom.localParticipant.identity,
      displayName: this.livekitRoom.localParticipant.identity,
    }
    if (Boolean(recipients)) {
      const participants = recipients.map(this.livekitRoom.getParticipantByIdentity) as RemoteParticipant[]

      this.livekitRoom.localParticipant.publishData(
        encodedData,
        DataPacket_Kind.RELIABLE,
        participants,
      ).then(() => {
        // TODO trigger event
        this._appendChat(encodedData, this.livekitRoom.localParticipant, DataPacket_Kind.RELIABLE)
      })
    }
    else {
      this.livekitRoom.localParticipant.publishData(
        encodedData,
        DataPacket_Kind.RELIABLE,
      ).then(() => {
        // TODO trigger event
        this._appendChat(encodedData, this.livekitRoom.localParticipant, DataPacket_Kind.RELIABLE)
      })
    }
  }
}
