/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { Compositor, init, SDK } from '@api.stream/studio-kit'
import React, { useContext, useEffect, useState } from 'react'
import config from '../../config'
import { projects } from '../host/host'

type AppContext = {
  isHost: boolean
  setToken: (token: string) => void
  studio: SDK.Studio
  project: SDK.Project
}

export const AppContext = React.createContext<AppContext>({
  isHost: false,
} as AppContext)

export const AppProvider = ({
  isHost,
  children,
}: {
  isHost: boolean
  children: React.ReactChild
}) => {
  const [studio, setStudio] = useState<SDK.Studio>()
  const [project, setProject] = useState<SDK.Project>()
  const [room, setRoom] = useState<SDK.Room>()
  const [token, setToken] = useState()

  useEffect(() => {
    init({
      env: config.env,
      logLevel: config.logLevel,
    }).then(setStudio)
  }, [])

  useEffect(() => {
    if (!studio) return

    // If the SDK detects a token in the URL, it will return the project
    //  associated with it (e.g. guest view)
    setProject(studio.initialProject)
  }, [studio])

  useEffect(() => {
    if (!token || !studio || project) return
    // Log in
    studio
      .load(token)
      .then(async (user) => {
        // If there's a project, return it - otherwise create one
        let project = user.projects[0]
        if (!project) {
          project = await studio.Command.createProject({
            settings: projects[projectType].settings,
          })
        }
        const activeProject = await studio.Command.setActiveProject({
          projectId: project.id,
        })
        const room = await activeProject.joinRoom({
          displayName: localStorage.userName,
        })

        setRoom(room)
        setProject(activeProject)
      })
      .catch((e) => {
        console.warn(e)
        setToken(null)
        localStorage.removeItem('token')
      })
  }, [studio, token])

  if (!studio) {
    return <div>Loading SDK...</div>
  }

  if (!project) {
    return <div>Loading project...</div>
  }

  return (
    <AppContext.Provider
      value={{
        isHost,
        setToken,
        studio,
        project,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
