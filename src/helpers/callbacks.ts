/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
/**
 * Utility functions for observing state over time.
 * 
 * These functions accept a callback which will be invoked with 
 * the latest value any time it detects a change.
 * 
 * @module Callbacks
 */

import { getProject } from '../core/data'
import { CoreContext } from '../core/context'
import { getRoom } from '../core/webrtc/simple-room'
import { SDK } from '../core/namespaces'

/**
 * Calls back with the active project's room.
 */
export const useActiveProjectRoom = (cb: (room: SDK.Room) => void) => {
  const project = getProject(CoreContext.state.activeProjectId)
  cb(project ? getRoom(project.roomId) : null)

  return CoreContext.on('RoomJoined', () => {
    const project = getProject(CoreContext.state.activeProjectId)
    cb(project ? getRoom(project.roomId) : null)
  })
}
