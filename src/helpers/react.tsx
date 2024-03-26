/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
/**
 * Utilities to assist in implementation to a React-based project
 * implementing a {@link ScenelessProject} workflow.
 *
 * These functions are intended to be helpful and are not necessary to use.
 *
 * @module React
 */
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { SDK } from '../core/namespaces'
import { Callback, ScenelessProject } from './index'
import { watchDevices } from './webrtc'

export const useActiveProjectRoom = (): SDK.Room => {
  const [room, setRoom] = useState<SDK.Room>(null)
  useEffect(() => Callback.useActiveProjectRoom(setRoom), [])
  return room
}

/**
 * React hook which implements {@link Room.watchDevices} and returns
 * the result as a value.
 */
export const useDevices = () => {
  const [devices, setDevices] = useState<SDK.Devices>({
    webcams: [],
    microphones: [],
    speakers: [],
  })

  useEffect(() => {
    return watchDevices(setDevices)
  }, [])

  return devices
}

export type StudioContext = {
  studio: SDK.Studio
  /**
   * _(For convenience)_ Store the contextual SDK {@link Studio}.
   */
  setStudio: (studio: SDK.Studio) => void
  project: SDK.Project
  /**
   * _(For convenience)_ Store the contextual active {@link Project}.
   */
  setProject: (project: SDK.Project) => void
  room: SDK.Room
  /**
   * _(For convenience)_ Store the contextual {@link Room}, once it has been joined.
   */
  setRoom: (room: SDK.Room) => void
  webcamId: string
  /**
   * Set the user's active webcam, which will be sent to other
   * guests and eligible to display on the stream canvas.
   *
   * Delegates to {@link Room.setCamera Room.setCamera()}
   */
  setWebcamId: (deviceId: string) => void
  microphoneId: string
  /**
   * Set the user's active webcam, which will be sent to other
   * guests and eligible to display on the stream canvas.
   *
   * Delegates to {@link Room.setMicrophone Room.setMicrophone()}
   */
  setMicrophoneId: (deviceId: string) => void
  /**
   * An interface of functions important to a project
   * under the {@link ScenelessProject} workflow.
   *
   * Equivalent to
   * ```typescript
   * ScenelessProject.commands(project)
   * ```
   */
  projectCommands: ScenelessProject.Commands
}
export const StudioContext = React.createContext<StudioContext>({
  studio: null,
  project: null,
  room: null,
  webcamId: null,
  microphoneId: null,
  setStudio: () => {},
  setProject: () => {},
  setRoom: () => {},
  setWebcamId: () => {},
  setMicrophoneId: () => {},
  projectCommands: {} as ScenelessProject.Commands,
})

/**
 * React hook which returns the latest {@link StudioContext}.
 *
 * ```typescript
 * const App = () => {
 *   const { studio, project, room } = useStudio()
 *
 *   // Return some React that depends on studio state
 *   return <></>
 * }
 * ```
 */
export const useStudio = () => useContext(StudioContext)

let stored = {
  webcamId: null,
  microphoneId: null,
} as {
  webcamId: string
  microphoneId: string
}
try {
  stored.webcamId = localStorage?.getItem('__LS_webcam')
  stored.microphoneId = localStorage?.getItem('__LS_microphone')
} catch {}

/**
 * StudioContext provider
 *
 * ```typescript
 * <StudioProvider>
 *   <App />
 * </StudioProvider>
 * ```
 */
export const StudioProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const [room, setRoom] = useState<SDK.Room>()
  const [project, setProject] = useState<SDK.Project>()
  const [studio, setStudio] = useState<SDK.Studio>()
  const [webcamId, setWebcamId] = useState<string>(stored.webcamId)
  const [microphoneId, setMicrophoneId] = useState<string>(stored.microphoneId)

  const projectCommands = useMemo(
    () => (project ? ScenelessProject.commands(project) : null),
    [project],
  )

  // Listen for project changes
  useEffect(() => {
    if (!project) return
  }, [project])

  // Set webcam and microphone
  useEffect(() => {
    if (!room) return
    if (webcamId) {
      room
        .setCamera({
          deviceId: webcamId,
        })
        .catch((e) => {
          console.warn(e)
        })
    }
    if (microphoneId) {
      room
        .setMicrophone({
          deviceId: microphoneId,
        })
        .catch((e) => {
          console.warn(e)
        })
    }
  }, [room, webcamId, microphoneId])

  return (
    <StudioContext.Provider
      value={{
        studio,
        project,
        room,
        webcamId,
        microphoneId,
        setStudio,
        setProject,
        setRoom,
        setWebcamId: (id: string) => {
          try {
            localStorage?.setItem('__LS_webcam', id)
          } catch (e) {}
          setWebcamId(id)
        },
        setMicrophoneId: (id: string) => {
          try {
            localStorage?.setItem('__LS_microphone', id)
          } catch (e) {}
          setMicrophoneId(id)
        },
        projectCommands,
      }}
    >
      {children}
    </StudioContext.Provider>
  )
}

