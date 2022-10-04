/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
/**
 * Repository of interfaces and types provided by the Studio SDK.
 *
 * Core models
 * ----
 * **{@link Studio}**
 *
 * Represents a singleton of the initialized Studio SDK, the basis
 * of all core functionality.
 *
 * ```typescript
 * import { init, Helpers } from `@api.stream/studio-kit`
 *
 * // Initialize the studio
 * const studio = await init()
 * ```
 *
 * **{@link Project}**
 *
 * Represents a single project owned by a user. A project provides
 * access to a unique WebRTC room for video conferencing, and contains
 * information about all elements of a stream configuration.
 *
 * ```typescript
 * // Authenticate a user and fetch their existing projects
 * const { projects } = await studio.load(accessToken)
 *
 * // Create a new project
 * const project = await Helpers.ScenelessProject.create()
 * ```
 *
 * _Related: {@link ScenelessProject}_
 *
 * **{@link Room}**
 *
 * Represents a WebRTC video conferencing room that allows multiple participants
 * to join and share video feeds using webcam and screenshare.
 *
 * ```typescript
 * // Join the WebRTC room associated with a project
 * const room = await project.joinRoom()
 * ```
 *
 * @module SDK
 */
import { Command, Events } from './namespaces'
import * as Compositor from '../compositor/index'
import { LiveApiModel } from '@api.stream/sdk'
import { ChatObject } from './webrtc/room-context'
import { render } from '../helpers/compositor'
import * as Livekit from 'livekit-client'

/**
 * Represents a simple interface over a project's child nodes,
 * used only to query. Node updates should be run using commands.
 *
 * @private @internal
 */
export interface Scene {
  nodes: Compositor.SceneNode[]
  get: (id: string) => Compositor.SceneNode
  getRoot: () => Compositor.SceneNode
  getParent: (id: string) => Compositor.SceneNode
}

// Import everything we need from LiveApiModel
import Rendering = LiveApiModel.Rendering
import VideoRendering = LiveApiModel.VideoRendering
import AudioRendering = LiveApiModel.AudioRendering
import RenderingQuality = LiveApiModel.RenderingQuality
import Encoding = LiveApiModel.Encoding
import VideoEncoding = LiveApiModel.VideoEncoding
import AudioEncoding = LiveApiModel.AudioEncoding
import ProjectBroadcastPhase = LiveApiModel.ProjectBroadcastPhase
/**
 * @category Core
 */
import Role = LiveApiModel.Role
import DestinationAddress = LiveApiModel.DestinationAddress
import VideoCodec = LiveApiModel.VideoCodec
import AudioCodec = LiveApiModel.AudioCodec
import VideoCodecRateControl = LiveApiModel.VideoCodecRateControl
import VideoCodecProfile = LiveApiModel.VideoCodecProfile

export {
  Rendering,
  VideoRendering,
  AudioRendering,
  RenderingQuality,
  Encoding,
  Role,
  DestinationAddress,
  VideoEncoding,
  AudioEncoding,
  VideoCodec,
  AudioCodec,
  VideoCodecRateControl,
  VideoCodecProfile,
  ProjectBroadcastPhase,
}

export type SceneNode = Compositor.SceneNode

/**
 * A **Project** provides
 * access to a unique WebRTC room for video conferencing, and contains
 * information about all elements of a stream configuration.
 *
 * @category Core
 */
export interface Project {
  /**
   * The active user's role associated with this project
   *  https://www.api.stream/docs/api/auth/#permission-roles
   */
  role: Role
  /**
   * Unique alpha-numeric ID. Example: `"1234a56b7890cd12e34f5gh6"`.
   * Corresponds to a Live API `project_id`.
   */
  id: string
  /**
   * The project's associated live broadcast ID.
   *  Field will be empty if project is not live.
   */
  broadcastId?: string
  /**
   * Phase of the project's broadcast.
   */
  broadcastPhase: ProjectBroadcastPhase
  /**
   * Boolean representation of project's broadcast phase,
   *  indicating whether the project is currently being broadcast.
   */
  isLive: boolean
  /**
   * Destinations are RTMP destinations where you can send your broadcast.
   * Examples: a YouTube channel or a Twitch channel.
   */
  destinations: Destination[]
  /**
   * RTMP feeds that you can include in your broadcast.
   */
  sources: Source[]
  encoding: Encoding
  rendering: Rendering
  /**
   * Listen to all events whose payload.projectId matches this Project
   *
   * This is an abstraction over {@link Studio.Subscribe}
   */
  subscribe: Events.Subscribe
  /**
   * Use this method to join the WebRTC {@link Room}
   */
  joinRoom: (settings?: { displayName?: string }) => Promise<Room>
  /**
   * @private
   */
  scene: Scene
  /**
   * Field to store arbitrary data. Not used by the SDK.
   */
  props: Props
  hostDisplayName: string
}

/**
 * A **Destination** is a location that your users can broadcast to. It could be channel on a platform like Twitch or YouTube, or any other RTMP destination.
 * @category Core
 */
export type Destination = {
  /**
   * Alpha-numeric ID. Example: `"1234a56b7890cd12e34f5gh6"`
   */
  id: string
  enabled: boolean
  /**
   * {@link DestinationAddress}
   */
  address: DestinationAddress
  /**
   * Field to store arbitrary data. Not used by the SDK.
   */
  props: Props
}

/**
 * An RTMP **Source** is an RTMP video feed that you can include in your broadcast.
 * @category Core
 */
export type Source = {
  /**
   * Alpha-numeric ID. Example: `"1234a56b7890cd12e34f5gh6"`
   */
  id: string
  address: LiveApiModel.SourceAddress
  /**
   * Field to store arbitrary data. Not used by the SDK.
   */
  props: Props
}

/**
 * See MDN docs for more information on {@link https://developer.mozilla.org/en-US/docs/Web/API/MediaDeviceInfo **MediaDeviceInfo**}
 * @category Devices
 */
export type Webcam = MediaDeviceInfo & {
  kind: 'videoinput'
}
/**
 * See MDN docs for more information on {@link https://developer.mozilla.org/en-US/docs/Web/API/MediaDeviceInfo **MediaDeviceInfo**}
 * @category Devices
 */
export type Microphone = MediaDeviceInfo & {
  kind: 'audioinput'
}
/**
 * See MDN docs for more information on {@link https://developer.mozilla.org/en-US/docs/Web/API/MediaDeviceInfo **MediaDeviceInfo**}
 * @category Devices
 */
export type Speakers = MediaDeviceInfo & {
  kind: 'audiooutput'
}
/**
 * @category Devices
 */
export type Devices = {
  webcams: Webcam[]
  microphones: Microphone[]
  speakers: Speakers[]
}

/**
 * A **Participant** is the host or a guest of a {@link Room **Room**}. Anyone who can add a webcam, microphone, or screenshare to your broadcast is a Participant.
 * @category WebRTC
 */
export interface Participant {
  id: string
  /**
   * Boolean indicating whether participant is the local user
   */
  isSelf: boolean
  displayName: string
  /**
   * Indicates the strength of the participant's connection.
   */
  connectionQuality: ConnectionQuality
  /**
   * Indicates if the Participant is currently speaking, based on input from their microphone.
   */
  isSpeaking: boolean
  /**
   * The timestamp that the participant joined the room.
   */
  joinedAt: Date
  /**
   * The permission role of the participant.
   * https://www.api.stream/docs/api/auth/#permission-roles
   */
  role: LiveApiModel.Role
  /**
   * Array of {@link Track} IDs belonging to the Participant.
   */
  trackIds: string[]
  /**
   * Metadata to store on the participant. Opaque to the SDK.
   *  Change to a participant's metadata propagates immediately to remote connections.
   */
  meta: { [prop: string]: any }
}

/**
 * An Audio or Video track, which can be sent from one {@link Participant} to other Participants in a {@link Room **Room**}.
 * Examples of Tracks would include a webcam feed, a microphone feed, or video from screenshare.
 * @category WebRTC
 */
export interface Track {
  id: string
  isMuted: boolean // Applies to both audio and video
  /**
   * See MDN docs for more information on {@link https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack MediaStreamTrack}
   */
  mediaStreamTrack: MediaStreamTrack
  /**
   * ID of {@link Participant} who is publisher of the track
   */
  participantId: string
  type: TrackSource
}

// Import everything we need from Livekit
import ConnectionQuality = Livekit.ConnectionQuality
import TrackSource = Livekit.Track.Source
import VideoCaptureOptions = Livekit.VideoCaptureOptions
import VideoResolution = Livekit.VideoResolution
import AudioCaptureOptions = Livekit.AudioCaptureOptions
import ScreenShareCaptureOptions = Livekit.ScreenShareCaptureOptions

export type { ChatObject, ConnectionQuality, TrackSource }

export type {
  VideoCaptureOptions,
  VideoResolution,
  AudioCaptureOptions,
  ScreenShareCaptureOptions,
}

/**
 * The WebRTC **Room** is a virtual meeting place for {@link Participant **Participants**}, who can send video/audio streams (ie, {@link Track **Tracks**}) to each other in real time.
 *
 * *Note: The Room model includes several "Hooks". For more detailed information, including examples, on how to use these hooks, please see the entry for {@link Room.useParticipants useParticipants}.*
 * @category WebRTC
 */
export interface Room {
  id: string
  /**
   * identity of the local {@link Participant **Participant**}.
   */
  participantId: string
  /**
   * Create webcam {@link Track} and publish, replacing a Camera if it already exists
   * @category Media
   */
  setCamera: (options?: VideoCaptureOptions) => Promise<Track>
  /**
   * Create audio {@link Track} and publish, replacing a Microphone if it already exists
   * @category Media
   */
  setMicrophone: (options?: AudioCaptureOptions) => Promise<Track>
  /**
   * Create webcam/audio {@link Track Tracks} and publish.
   * @category Media
   */
  addCamera: (options?: VideoCaptureOptions) => Promise<Track>
  /**
   * Create screenshare/audio {@link Track Tracks} and publish.
   * Always returns a screenshare video Track. Whether or not an audio Track is also returned depends on the user's browser and whether they choose to share audio.
   * @category Media
   */
  addScreen: (options?: ScreenShareCaptureOptions) => Promise<{
    screen: Track
    audio?: Track
  }>
  /**
   * This method is used to mute/unmute {@link Track Tracks} belonging to the *local* {@link Participant}.
   * Method will not work on tracks belonging to remote participants. To mute a Track belonging to a remote Participant, see the {@link Room.muteTrackAsAdmin muteTrackAsAdmin} method.
   * @category Media
   *
   * @param id - {@link Track} id which you wish to enable/disable
   */
  setTrackEnabled: (id: string, enabled: boolean) => void
  /**
   * Enables/disables the camera for the local {@link Participant}
   * @category Media
   */
  setCameraEnabled: (
    enabled: boolean,
  ) => Promise<void | Livekit.LocalTrackPublication>
  /**
   * Enables/disables the microphone for the local {@link Participant}
   * @category Media
   */
  setMicrophoneEnabled: (
    enabled: boolean,
  ) => Promise<void | Livekit.LocalTrackPublication>

  /**
   * Remove a {@link Track}. Only works for local tracks.
   * @category Media
   */
  removeTrack: (id: string) => void
  /**
   * Watches for changes on the {@link Track Tracks} in a room, and runs a callback whenever the Tracks change.
   * Examples of events on which this callback would fire include (but are not limited to) a Participant publishing or unpublishing a track, a track being muted, etc.
   * @param cb Callback which will run whenever the Room's tracks are updated. This callback essentially serves as an event listener.
   * @returns Function which, when invoked, stops watching Tracks. Essentially a `removeEventListener`.
   * @category Hooks
   */
  useTracks: (
    /**
     * @param tracks Array of all {@link Track Tracks} in the {@link Room}.
     */
    cb: (tracks: Track[]) => void,
  ) => Disposable
  /**
   * similar to {@link Room.useTracks useTracks}, except we also specify a {@link Track} id. The callback then only uses the track which has the specified track id.
   * @param id A {@link Track} id.
   * @param cb Callback which essentially serves as an event listener.
   * @returns Function which essentially removes the callback as an event listener.
   * @category Hooks
   */
  useTrack: (
    id: string,
    /**
     * @param media The {@link Track} which matches the supplied id.
     */
    cb: (media: Track) => void,
  ) => Disposable
  /**
   * @returns All {@link Track Tracks} in the Room.
   */
  getTracks: () => Track[]
  /**
   * @param id a {@link Track} id
   * @returns {@link Track} With the supplied `id`.
   */
  getTrack: (id: string) => Track
  /**
   * Kick a remote {@link Participant} from your {@link Room}. Only works if local Participant is Room admin.
   * @param identity the identity of the Participant who you wish to kick from the Room.
   * @category Admin
   */
  kickParticipant: (identity: string) => void
  /**
   * Mute a remote {@link Track}. Only works if local {@link Participant} is Room admin.
   * @category Admin
   */
  muteTrackAsAdmin: (trackId: string) => void
  /**
   * Watches for changes on the {@link Participant Participants} in a room, and runs a callback whenever the Participants change.
   * Examples of events on which this callback would fire include (but are not limited to) a Participant joining or leaving the room, a track being published or unpublished, etc.
   * @example
   * Here is an example of how this function (and the other hooks in this section) might be used in a vue component
   *
   * ###### Vue
   * ```typescript
   * export default {
   *   data() {
   *     return {
   *       participants: [],
   *       dispose: () => {},
   *     }
   *   },
   *   beforeMount() {
   *     this.dispose = useParticipants((participants) => {
   *       this.participants = participants
   *     })
   *   }
   *   beforeUnmount() {
   *     // Calling this.dispose will remove the event listeners that were added by `useParticipants` in `beforeMount`
   *     this.dispose()
   *   }
   * }
   * ```
   * @example
   * These hooks work well with react hooks. Here is an example of how one might use this hook (and the other hooks in this section) within in a react component.
   *
   * ###### React
   * ```jsx
   * import React, { useEffect, useState } from 'react'
   *
   * const ParticipantList = () => {
   *   const [participants, setParticipants] = useState([])
   *   useEffect(() => {
   *     const dispose = useParticipants(setParticipants)
   *     // It is important to return dispose within useEffect in order to clean up our event listeners
   *     return dispose
   *   })
   *   return (
   *     <div>
   *       {participants.map((participant) => (
   *         <div>
   *           {participant.displayName}
   *         </div>
   *       ))}
   *     </div>
   *   )
   * }
   * ```
   * @example
   * We also could have written the `useEffect` block more concisely as such:
   *
   * ```typescript
   * useEffect(() => useParticipants(setParticipants))
   * ```
   * @param cb Callback which will run whenever the Room's participants are updated. This callback essentially serves as an event listener.
   * @returns Function which, when invoked, stops watching Participants. Essentially a `removeEventListener`.
   * @category Hooks
   */
  useParticipants: (
    /**
     * @param participants Array of all {@link Participant Participants} in the {@link Room}
     */
    cb: (participants: Participant[]) => void,
  ) => Disposable
  /**
   * Sends chat message to entire Room, or a private message (if specified) from local participant.
   *
   * To display these messages, see: {@link Room.useChatMessage useChatMessage}
   *
   * @category Message
   */
  sendChatMessage: (data: {
    /**
     * Content of the chat message
     */
    message: string
    /**
     * *Optional*. Identities of the recipient participants. If left undefined, the message will be sent to all participants in the Room. (default: `undefined`).
     */
    recipients?: string[]
    /**
     * *Optional*. Arbitrary data that can be sent as part of the message.
     */
    metadata?: object | string
  }) => Promise<void>
  /**
   * Send arbitrary data from the local {@link Participant} to other participants in the {@link Room}. This method can be used in conjunction with the {@link Room.onData onData} method to build a custom system of events for your app.
   * @param data The data that is being sent to other Participants. This should be in the form of a "stringifiable" object/array, as `JSON.stringify` will be used on this parameter before it is sent to the other participants.
   * @param recipientIds *Optional*. Array of IDs belonging to Participants who should receive the data. If left undefined, message will be sent to all Participants in the Room. (default: `undefined`)
   * @category Message
   */
  sendData: (data: any, recipientIds?: string[]) => Promise<void>
  /**
   * Handle data that is sent by other {@link Participant Participants} in the room. This method can be used in conjunction with the {@link Room.sendData sendData} method to build a custom system of events for your app.
   * @param cb Event listener which will be called when data is received.
   * @category Message
   */
  onData: (
    /**
     * @param data The data that is received. This will be equal to the `data` parameter from the corresponding invokation of {@link Room.sendData sendData} which triggers this event.
     * @param senderId ID of the {@link Participant} who sent the message.
     */
    cb: (data: any, senderId: string) => void,
  ) => void
  /**
   * Disconnect from the room.
   */
  disconnect: () => void
  /**
   * Handle disconnection from the room.
   */
  onDisconnected: (cb: () => void) => void
  /**
   * Calls back with a list of active speaker IDs
   *  ordered from loudest to quietest.
   *
   * Callback will be invoked any time the list of speakers changes.
   */
  useActiveSpeakers: (cb: (participantIds: string[]) => void) => Disposable
  /**
   * similar to {@link Room.useParticipants useParticipants}, except we also specify a {@link Participant} id. The callback then only uses the Participant which has the specified Participant id.
   * @param id A {@link Participant} id.
   * @param cb Callback which essentially serves as an event listener that is called whenever the Participant is updated.
   * @returns Function which essentially removes the callback as an event listener.
   * @category Hooks
   */
  useParticipant: (
    /**
     * `id` of a {@link Participant}
     */
    id: string,
    /**
     * @param participant the {@link Participant} with the supplied id.
     */
    cb: (participant: Participant) => void,
  ) => Disposable
  
  /* Defining a function that returns a Participant. */
  getHost: () => Participant
  /**
   * @returns Array containing all current {@link Participant Participants} in the room
   */
  getParticipants: () => Participant[]
  /**
   * @param id A {@link Participant} id.
   * @returns The participant with the supplied id.
   */
  getParticipant: (id: string) => Participant
  /**
   * Metadata to store on the participant. Opaque to the SDK.
   *  Change to a participant's metadata propagates immediately to remote connections.
   */
  setParticipantMetadata: (id: string, meta: { [prop: string]: any }) => void
  /**
   * Listens to changes on the {@link Room Room's} chat history, and runs callback when changes occur. This hook is useful for displaying chat messages.
   *
   * To send a chat message, see: {@link Room.sendChatMessage sendChatMessage}
   * @param cb Callback which essentially serves as an event listener, is called whenever there is a chat event.
   * @returns Function which essentially removes the callback as an event listener.
   * @category Hooks
   */
  useChatHistory: (
    /**
     * @param chatHistory Array of {@link ChatObject ChatObjects} in ascending chronological order (ie, most recent message is last in the array).
     */
    cb: (chatHistory: ChatObject[]) => void,
  ) => Disposable
}

/**
 * The Studio SDK's **User** model is rather minimal, as Users should be managed by your own service.
 * @category Core
 */
export type User = {
  /**
   * Unique alpha-numeric ID. Example: `"1234a56b7890cd12e34f5gh6"`.
   * Corresponds to Live API `collection_id`.
   */
  id: string
  /**
   * Array of Projects belonging to the User.
   */
  projects: Project[]
  /**
   * Array of Sources belonging to the User.
   */
  sources: Source[]
  /**
   * Arbitrary data stored on the user. Opaque to the SDK.
   */
  props: Props
  /**
   * Name associated with an access token, if any
   */
  name: string
}

/**
 * The root of the initialized SDK.
 *
 * Created by a call to **{@link init init()}**.
 *
 * Typically, this should be followed by a call to {@link Studio.load Studio.load()}.
 *
 * ```typescript
 * import SDK from `@api.stream/studio-kit`
 *
 * // Get a Studio instance
 * const studio = await SDK.init()
 *
 * // Invoke studio.load() to load the current user's projects
 * const { projects } = await SDK.load(accessToken)
 * ```
 *
 * ----
 * _Note: If the user is acccessing a project using a guest access token,
 * loading the user is not neccessary. The associated project will be
 * accessible via {@link Studio.initialProject}._
 * @category Core
 */
export interface Studio {
  /**
   * Actions which can be taken by a user. See the Command namespace for more information.
   */
  Command: typeof Command
  /**
   * The project associated with a guest access token.
   *
   * ----
   * This is relevant only to a guest's workflow.
   *
   * If an access token is not detected from the URL or passed in
   * explicitly to {@link init init()}, this field will be empty.
   */
  initialProject?: Project
  /**
   * @private @internal
   */
  compositor: Compositor.CompositorInstance
  /**
   * Subscribe to all {@link EventMap Events} emitted by the intialized Studio.
   *
   * View the {@link EventMap} to see the `payload` associated with each event.
   *
   * ```typescript
   * studio.subscribe((event, payload) => {
   *   if (event === 'BroadcastStarted') {
   *     setIsLive(true)
   *   } else if (event === 'BroadcastStopped') {
   *     setIsLive(false)
   *   } else if (event === 'BroadcastError') {
   *     setErrorMessage(payload.error)
   *   }
   * })
   * ```
   *
   * Clean up the subscription by invoking the returned {@link Disposable}.
   */
  subscribe: Events.Subscribe
  /**
   * Subscribe to a single {@link EventMap} emitted by the intialized Studio.
   *
   * ```typescript
   * studio.on('ProjectAdded', (payload) => {
   *   // Perhaps we'll add the project to local state
   * })
   * ```
   *
   * Clean up the subscription by invoking the returned {@link Disposable}.
   */
  on: Events.On
  /**
   * Create a token that is valid only for demo purposes.
   *
   * ----
   * _Note: In a production system, this token must be granted as part of the user
   * login flow (wherein a partner front-end logs into a partner backend,
   * which in turn connects to the Lightstream backend to obtain an appropriate
   * access token, which is then returned by the partner backend to the partner
   * front-end for SDK use)._
   *
   * Pass into {@link Studio.load} to receive the assocaited demo {@link User}.
   */
  createDemoToken: (options: {
    serviceName: string
    userId: string
    name: string
  }) => Promise<string>
  /**
   * Create an access token valid for another user to interact
   * with the project as a guest.
   *
   * This access token should be passed into {@link init init()} at the entrypoint
   * of the guest experience.
   */
  createGuestToken: (options?: GuestOptions) => Promise<string>
  /**
   * Similar to {@link createGuestToken}, creates a guest access token.
   * This token is embedded into a shortened link, which the host
   * may distribute to invite guests to their stream
   * (typically as WebRTC {@link Participant Participants}).
   */
  createGuestLink: (baseUrl: string, options?: GuestOptions) => Promise<string>
  /**
   * Create a link with an embedded access token.
   * This link resolves to a URL demonstrating the stream output.
   *
   * This preview link does not require the project to be live.
   */
  createPreviewLink: (options?: {
    projectId?: string
    /** requested duration of token before it expires */
    maxDuration?: number | undefined
  }) => Promise<string>
  /**
   * Load the {@link User} associated with the supplied access token.
   *
   * ----
   * **Emits {@link UserLoaded}**
   */
  load: (accessToken: string, size?: { x: number; y: number }) => Promise<User>
  /**
   * Renders a project into the supplied HTML Element.
   */
  render: typeof render
  /**
   * SDK version
   */
  version: string
}

// TODO: This should accept the compositor object itself
//  and should not rely on CoreContext
export type CompositorSettings = {
  projectId: string
  containerEl: HTMLElement
  /**
   * Indicates whether the compositor should have interactive Drag'n'drop
   * controls. This is recommended for the host/owner of a {@link Project}.
   *
   * _Note: If the user's access token does not grant permissions for
   * updating a project, it may result in issues._
   */
  dragAndDrop?: boolean
  /**
   * @deprecated - Use onElementDoubleClick()
   * Indicates whether the compositor should allow the user to
   * double-click on an element to make it fill the canvas.
   */
  dblClickShowcase?: boolean
  /**
   * Determine whether a node is a candidate for dragging.
   */
  checkDragTarget?: (node: SceneNode) => boolean
  /**
   * Determine whether a node is a candidate for dropping.
   *  A drop target's children will be affected
   *  - the element itself will not.
   */
  checkDropTarget?: (node: SceneNode) => boolean
  /**
   * Handle double click of a valid drag target.
   */
  onElementDoubleClick?: (node: SceneNode) => boolean
}

/**
 * @category Core
 */
export type GuestOptions = {
  projectId?: string
  displayName?: string
  /**
   * Requested duration of token before it expires.
   * Measured in milliseconds.
   * @default 172800000 (48 hours)
   **/
  maxDuration?: number | undefined
  role?: Role | `${Role}`
}

/**
 * Represents a function that may be invoked to clean up its corresponding functionality.
 *
 * Event subscriptions and state observers (e.g. {@link useParticipants})
 * return Disposables.
 */
export type Disposable = () => void

/**
 * Represents arbitrary data that may be stored on {@link User} or {@link Project}
 */
export type Props = { [prop: string]: any }

export type LogLevel = 'Debug' | 'Info' | 'Warn' | 'Error'

export interface IframeProps {
  url?: string
  src?: string
  allowFullScreen?: boolean
  position?:
    | 'relative'
    | 'absolute'
    | 'fixed'
    | 'sticky'
    | 'static'
    | 'inherit'
    | 'initial'
    | 'unset'
  display?: 'block' | 'none' | 'inline'
  height?: string
  width?: string
  overflow?: string
  target?: string
  styles?: object
  name?: string
  onLoad?: () => void
  frameBorder?: number
  id?: string
  className?: string
  children?: React.ReactNode
  iframeRef?: React.Ref<HTMLIFrameElement>
}
