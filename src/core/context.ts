/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import config from '../../config'
import type { ApiStream, LiveApiModel } from '@api.stream/sdk'
import type { Request, Command, Compositor, SDK } from './namespaces'
import { LogLevel, Props } from './types'
import {
  on,
  onInternal,
  subscribe,
  subscribeInternal,
  trigger,
  triggerInternal,
} from './events'
import log from 'loglevel'

const connectionId = (Math.random() * 1e20).toString(36)

const version = (SDK_VERSION || 'dev') as string

/** @private */
export const CoreContext = {
  config: null as ReturnType<typeof config>,
  // TODO: Rename to client
  clients: null as ApiStream,
  Request: {} as typeof Request,
  Command: {} as typeof Command,
  on,
  subscribe,
  /** @private @internal */
  onInternal,
  /** @private @internal */
  subscribeInternal,
  /** @private @internal */
  trigger,
  /** @private @internal */
  triggerInternal,
  /** @private @internal */
  state: {} as AppState,
  compositor: {} as Compositor.CompositorInstance,
  connectionId,
  version,
  /** @private @internal */
  rendererVersion: version,
  log,
  logLevel: null as LogLevel,
}

export { log }

export const setAppState = (state: AppState) => {
  Object.keys(state).forEach((name: keyof AppState) => {
    // @ts-ignore
    CoreContext.state[name] = state[name]
  })
}

export type InternalUser = {
  id: string
  name: string
  props: Props
  metadata: { [prop: string]: any }
}

export type InternalProject = {
  // ID comes from vapi
  id: string
  compositor: Compositor.Project
  // Video API props
  videoApi: {
    project: LiveApiModel.Project
    broadcastId?: string
    phase?: LiveApiModel.ProjectBroadcastPhase
  }
  // Layout API props
  layoutApi: {
    layoutId: string
  }
  sfuToken?: string
  role?: SDK.Role
  /**
   * @private The room
   */
  isInitial?: boolean
  /**
   * @private
   * @deprecated
   */
  roomId?: string
  // From Vapi project metadata
  props: Props
}

export type InternalSource = LiveApiModel.Source

export type AppState = {
  user: InternalUser
  projects: InternalProject[]
  // TODO: InternalSources[]
  sources: any[]
  activeProjectId: string
  accessToken?: string
}

export default CoreContext
