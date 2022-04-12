/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import config from '../../config'
import type { ApiStream, LiveApiModel } from '@api.stream/sdk'
import type { Request, Command, Compositor, SDK } from './namespaces'
import { Disposable, LogLevel, Metadata } from './types'
import {
  on,
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
  on,
  subscribe,
  compositor: {} as Compositor.CompositorInstance,
  Request: {} as typeof Request,
  Command: {} as typeof Command,
  /** @private @internal */
  trigger,
  /** @private @internal */
  triggerInternal,
  state: {} as AppState,
  connectionId,
  version,
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
  props: Metadata
}

export type InternalProject = {
  // ID comes from vapi
  id: string
  compositor: Compositor.Project
  // Video API props
  videoApi: {
    project: Omit<LiveApiModel.Project, 'metadata'>
    phase?: LiveApiModel.ProjectBroadcastPhase
  }
  // Layout API props
  layoutApi: {
    layoutId: string
  }
  sfuToken?: string
  isInitial?: boolean
  roomId?: string
  // From Vapi project metadata
  props: Metadata
}

export type AppState = {
  user: InternalUser
  projects: InternalProject[]
  // TODO: InternalSources[]
  sources: any[]
  activeProjectId: string
  accessToken?: string
}

export default CoreContext
