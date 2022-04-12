/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
/**
 * Events are emitted as a result of {@link Commands} or other
 * external forces, indicating that state should change.
 *
 * **{@link EventMap}** for a full list of events.
 *
 * Subscribe to events using {@link Studio.subscribe subscribe()} or {@link Studio.on on()}.
 *
 * @module Events
 */

import { SDK } from './namespaces'
import { LiveApiModel } from '@api.stream/sdk'
import { Disposable, ProjectBroadcastPhase } from './types'
import { log } from './context'

let currentSubId = 0
const subscribers = new Map<number, any>()

function createSubscribe<Obj extends { [index: string]: any }>() {
  return function (
    cb: <Key extends keyof Obj>(
      name: Key,
      /**
       * {payload} currently does not have type validation. Please refer to {@link EventMap}
       *
       * TODO: We'll have to change the format of this callback to { name, payload }
       *  in order to preserve type safety - in its current state payload: Obj[Key]
       *  resolves to a union of all possible payloads (effectively yielding "never")
       */
      payload: any,
    ) => void,
  ): Disposable {
    if (typeof cb !== 'function') return

    const id = ++currentSubId
    subscribers.set(id, cb)

    return () => {
      subscribers.delete(id)
    }
  }
}

function createOn<Obj extends { [index: string]: any }>() {
  return function <Key extends keyof Obj>(
    name: Key,
    cb: (...args: Obj[Key] extends undefined ? [] : [Obj[Key]]) => void,
  ) {
    return subscribe((e, payload) => {
      // @ts-ignore
      if (name === e) return cb(payload)
    })
  }
}

function createTrigger<Obj extends { [index: string]: any }>() {
  return function <Key extends keyof Obj>(
    name: Key,
    ...args: Obj[Key] extends undefined ? [] : [Obj[Key]]
  ) {
    let action = { type: name, payload: args[0] } as any
    log.debug('Event:', action)
    subscribers.forEach((x) => x(action.type, action.payload))
  }
}

/** @private */
export type ActionMap<M extends { [index: string]: any }> = {
  [Key in keyof M]: {
    type: Key
    payload: M[Key]
  }
}

/**
 *  @private A union of all available events structured as `{ type, payload }`
 */
export type Events = ActionMap<EventMap>[keyof ActionMap<EventMap>]

/** @private Global event bus */
export const trigger = createTrigger<EventMap>()
/** @private */
export const subscribe = createSubscribe<EventMap>()
/** @private */
export const on = createOn<EventMap>()

/** @private Global event bus */
export const triggerInternal = createTrigger<InternalEventMap>()
/** @private */
export const subscribeInternal = createSubscribe<InternalEventMap>()

/** @private */
export type On = typeof on
/** @private */
export type Subscribe = typeof subscribe
/** @private */
export type Trigger = typeof trigger

/**
 * A list of all external events available for subscription.
 *
 * Subscribe to events using {@link Studio.subscribe subscribe()} or {@link Studio.on on()}.
 */
export interface EventMap {
  /**
   * @category User
   * @local
   */
  UserLoaded: SDK.User
  /**
   * @category User
   */
  UserChanged: {
    user: SDK.User
  }
  /**
   * @category Project
   */
  ProjectAdded: {
    project: SDK.Project
  }
  /**
   * @category Project
   * @private
   * @deprecated Use ProjectChanged
   */
  ProjectMetaUpdated: {
    projectId: SDK.Project['id']
    meta: SDK.Metadata
  }
  /**
   * @category Project
   */
  ProjectChanged: {
    project: SDK.Project
  }
  /**
   * @category Project
   */
  ProjectRemoved: {
    projectId: SDK.Project['id']
  }
  /**
   * @category Project
   * @local
   */
  RoomJoined: {
    projectId: SDK.Project['id']
    room: SDK.Room
  }
  /**
   * @category Project
   * @local
   */
  ActiveProjectChanged: {
    projectId: SDK.Project['id']
  }
  /**
   * @category Broadcast
   */
  BroadcastStarted: {
    projectId: SDK.Project['id']
  }
  /**
   * @category Broadcast
   */
  BroadcastStopped: {
    projectId: SDK.Project['id']
  }
  /**
   * @category Broadcast
   */
  BroadcastError: {
    projectId: SDK.Project['id']
    error: LiveApiModel.ProjectBroadcastError
  }
  /**
   * @category Destination
   */
  DestinationAdded: {
    projectId: SDK.Project['id']
    destination: SDK.Destination
  }
  /**
   * @category Destination
   */
  DestinationRemoved: {
    projectId: SDK.Project['id']
    destinationId: SDK.Destination['id']
  }
  /**
   * @category Destination
   * @private
   * @deprecated Use DestinationChanged
   */
  DestinationEnabled: {
    projectId: SDK.Project['id']
    destinationId: SDK.Destination['id']
  }
  /**
   * @category Destination
   * @private
   * @deprecated Use DestinationChanged
   */
  DestinationDisabled: {
    projectId: SDK.Project['id']
    destinationId: SDK.Destination['id']
  }
  /**
   * @category Destination
   */
  DestinationChanged: {
    projectId: SDK.Project['id']
    destination: SDK.Destination
  }
  /**
   * @category Source
   */
  SourceAdded: {
    source: SDK.Source
  }
  /**
   * @category Source
   */
  SourceChanged: {
    source: SDK.Source
  }
  /**
   * @category Source
   */
  SourceRemoved: {
    source: SDK.Source['id']
  }
}

/**
 * @private
 * @internal
 */
export interface InternalEventMap {
  UserChanged: LiveApiModel.Collection
  ProjectAdded: LiveApiModel.Project
  ProjectChanged: {
    project: LiveApiModel.Project
    phase: ProjectBroadcastPhase
  }
  ProjectRemoved: LiveApiModel.Project['projectId']
  ActiveProjectChanged: {
    projectId: LiveApiModel.Project['projectId']
  }
  DestinationAdded: LiveApiModel.Destination
  DestinationChanged: LiveApiModel.Destination
  DestinationRemoved: LiveApiModel.Destination['destinationId']
  SourceAdded: LiveApiModel.Source
  SourceChanged: LiveApiModel.Source
  SourceRemoved: LiveApiModel.Source['sourceId']
  NodeAdded: {
    projectId: LiveApiModel.Project['projectId']
    nodeId: SDK.SceneNode['id']
  }
  NodeChanged: {
    projectId: LiveApiModel.Project['projectId']
    nodeId: SDK.SceneNode['id']
  }
  NodeRemoved: {
    projectId: LiveApiModel.Project['projectId']
    nodeId: SDK.SceneNode['id']
  }
}
