/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import config from '../../config'
import type { ApiStream, LiveApiModel } from '@api.stream/sdk'
import type { Request, Command, Compositor } from './namespaces'
import { LogLevel, Metadata } from './types'
import { on, subscribe, trigger } from './events'
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

export type User = {
  name: string
  props: Metadata
}

export type Project = {
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
  user: User
  projects: Project[]
  collectionId: string
  activeProjectId: string
  accessToken?: string
}

export default CoreContext
