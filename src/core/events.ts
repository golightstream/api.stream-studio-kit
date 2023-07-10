
/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
/**
 * Events are emitted as a result of {@link Commands} or other
 * external forces, indicating that state should change.
 *
 * **{@link ExternalEventMap}** for a full list of events.
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
const subscribersInternal = new Map<number, any>()

function createSubscribe<Obj extends { [index: string]: any }>(
  options: {
    internal?: boolean
  } = {},
) {
  return function (
    cb: <Key extends keyof Obj>(
      name: Key,
      /**
       * {payload} currently does not have type validation. Please refer to {@link ExternalEventMap}
       *
       * TODO: We'll have to change the format of this callback to { name, payload }
       *  in order to preserve type safety - in its current state payload: Obj[Key]
       *  resolves to a union of all possible payloads (effectively yielding "never")
       */
      payload: any,
    ) => void,
  ): Disposable {
    if (typeof cb !== 'function') return
    const watchers = options.internal ? subscribersInternal : subscribers

    const id = ++currentSubId
    watchers.set(id, cb)

    return () => {
      watchers.delete(id)
    }
  }
}

function createOn<Obj extends { [index: string]: any }>(
  options: {
    internal?: boolean
  } = {},
) {
  return function <Key extends keyof Obj>(
    name: Key,
    cb: (...args: Obj[Key] extends undefined ? [] : [Obj[Key]]) => void,
  ) {
    const _subscribe = options.internal ? subscribeInternal : subscribe
    return _subscribe((e, payload) => {
      // @ts-ignore
      if (name === e) return cb(payload)
    })
  }
}

function createTrigger<Obj extends { [index: string]: any }>(
  options: {
    internal?: boolean
  } = {},
) {
  const watchers = options.internal ? subscribersInternal : subscribers
  return async function <Key extends keyof Obj>(
    name: Key,
    ...args: Obj[Key] extends undefined ? [] : [Obj[Key]]
  ) {
    let action = { type: name, payload: args[0] } as any
    const eventType = Boolean(options.internal) ? 'Internal' : 'External'
    log.info(`${eventType} Event:`, action)
    await Promise.all(
      Array.from(watchers.values()).map((x) => x(action.type, action.payload)),
    )
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
export type Events =
  ActionMap<ExternalEventMap>[keyof ActionMap<ExternalEventMap>]

/** @private Global event bus */
export const trigger = createTrigger<ExternalEventMap>()
/** @private */
export const subscribe = createSubscribe<ExternalEventMap>()
/** @private */
export const on = createOn<ExternalEventMap>()

/** @private Global event bus */
export const triggerInternal = createTrigger<InternalEventMap>({
  internal: true,
})
/** @private */
export const subscribeInternal = createSubscribe<InternalEventMap>({
  internal: true,
})
/** @private */
export const onInternal = createOn<InternalEventMap>({ internal: true })

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
export interface ExternalEventMap {
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
    meta: SDK.Props
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
    broadcastId: string
  }
  /**
   * @category Broadcast
   */
  BroadcastStopped: {
    projectId: SDK.Project['id']
    broadcastId: string
  }
  /**
   * @category Broadcast
   */
  BroadcastError: {
    projectId: SDK.Project['id']
    broadcastId: string
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
  DestinationChanged: {
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
   * @private
   * @deprecated Use ProjectChanged
   */
  DestinationSet: {
    projectId: SDK.Project['id']
    rtmpUrl: string
    rtmpKey: string
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

  /**
   * @category Source
   */
  ProjectSourceAdded: {
    source: SDK.Source
    projectId: string
  }

  /**
   * @category Source
   */
  ProjectSourceRemoved: {
    sourceId: string
    projectId: string
  }

  /**
   * @category Source
   */
  ProjectSourceChanged: {
    source: SDK.Source
    projectId: string
  }

  /* This is a custom event that is triggered by the video player when the video time updates. */
  VideoTimeUpdate: {
    id: string
    category: string
    time: number
  }

  /* This is a custom event that is triggered by the video player when the video time updates. */
  VideoEnded: {
    id: string
    category: string
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
    broadcastId?: string
    phase?: ProjectBroadcastPhase
  }
  ProjectRemoved: {
    projectId: LiveApiModel.Project['projectId']
  }
  ProjectSourceAdded: {
    projectId: LiveApiModel.Project['projectId']
    source: LiveApiModel.Source
  }
  ProjectSourceRemoved: {
    projectId: LiveApiModel.Project['projectId']
    sourceId: LiveApiModel.Source['sourceId']
  }
  ActiveProjectChanged: {
    projectId: LiveApiModel.Project['projectId']
  }
  DestinationAdded: LiveApiModel.Destination
  DestinationChanged: LiveApiModel.Destination
  DestinationRemoved: {
    projectId: LiveApiModel.Project['projectId']
    destinationId: LiveApiModel.Destination['destinationId']
  }
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
  // TODO: remove this code after a while when this version of sdk (1.1.58) is adopted by all users
  OverlayMetadataUpdate: {
    projectId: LiveApiModel.Project['projectId']
    metadata: LiveApiModel.Project['metadata']
    sourceId: LiveApiModel.Source['sourceId']
    role: SDK.Role
    doTrigger: boolean
  }
  BackgroundMetadataUpdate: {
    projectId: LiveApiModel.Project['projectId']
    metadata: LiveApiModel.Project['metadata']
    sourceId: LiveApiModel.Source['sourceId']
    role: SDK.Role
    doTrigger: boolean
  }
}
