/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { init, Helpers, SDK } from '@api.stream/studio-kit'
import { Participants } from '../shared/participant'
import Style from '../shared/shared.module.css'
import { ControlPanel, DeviceSelection } from '../shared/control-panel'
import { DEFAULT_LAYOUT, getLayout, layouts } from './layout-examples'
import { Chat } from '../shared/chat'
import config from '../../config'

const { ScenelessProject } = Helpers
const { useStudio } = Helpers.React

const getUrl = () =>
  window.location.protocol +
  '//' +
  window.location.host +
  window.location.pathname

const storage = {
  userName: localStorage.getItem('userName') || '',
  // Use the service name in memory or generate a new (pseudo)-random
  serviceName:
    localStorage.getItem('serviceName') ||
    'Example-' + Math.floor(Math.random() * 1e6),
}

const Login = (props: {
  onLogin: ({
    token,
    userName,
    serviceName,
  }: {
    token: string
    userName: string
    serviceName: string
  }) => void
}) => {
  const { studio } = useStudio()
  const { onLogin } = props
  const [userName, setUserName] = useState(storage.userName)
  const [serviceName, setServiceName] = useState(storage.serviceName)

  const login = async (e: any) => {
    e.preventDefault()
    const token = await studio.createDemoToken({
      // Replace this with a unique identifier of your service.
      //  It has been randomized for the purposes of this demo.
      serviceName,
      userId: userName,
      name: userName,
    })
    onLogin({ token, userName, serviceName })
  }

  return (
    <form
      className={Style.column}
      onSubmit={login}
      style={{ width: 316, alignItems: 'flex-end' }}
    >
      <div className={Style.column}>
        <label>Service identifier</label>
        <input
          type="text"
          autoFocus={true}
          defaultValue={serviceName}
          onChange={(e) => {
            setServiceName(e.target.value)
          }}
        />
      </div>
      <div className={Style.column}>
        <label>Username</label>
        <input
          type="text"
          autoFocus={true}
          defaultValue={userName}
          onChange={(e) => {
            setUserName(e.target.value)
          }}
        />
      </div>
      <button onClick={login} style={{ marginTop: 8, width: 70 }}>
        Login
      </button>
    </form>
  )
}

const Project = () => {
  const { studio, project, room, projectCommands } = useStudio()
  const renderContainer = useRef()
  const destination = project.destinations[0]
  const destinationAddress = destination?.address.rtmpPush
  const { Command } = studio

  const [rtmpUrl, setRtmpUrl] = useState(destinationAddress?.url)
  const [streamKey, setStreamKey] = useState(destinationAddress?.key)
  const [previewUrl, setPreviewUrl] = useState('')
  const [guestUrl, setGuestUrl] = useState('')
  const [isLive, setIsLive] = useState(false)
  const [pendingLive, setPendingLive] = useState(false)

  // Get custom layout name from metadata we store
  const layout = project.props.layout
  const background = projectCommands.getBackgroundImage()

  // Listen for project events
  useEffect(() => {
    return project.subscribe((event, payload) => {
      if (event === 'BroadcastStarted') {
        setIsLive(true)
        setPendingLive(false)
      } else if (event === 'BroadcastStopped') {
        setIsLive(false)
        setPendingLive(false)
      } else if (event === 'BroadcastError') {
        console.warn('Broadcast error:', payload.error)
        setIsLive(false)
        setPendingLive(false)
      }
    })
  }, [])

  // Generate project links
  useEffect(() => {
    studio.createPreviewLink().then(setPreviewUrl)
    studio
      .createGuestLink(getUrl() + 'guest/', { role: SDK.Role.ROLE_GUEST })
      .then(setGuestUrl)
  }, [])

  useEffect(() => {
    studio.render({
      containerEl: renderContainer.current,
      projectId: project.id,
      dragAndDrop: true,
    })
  }, [renderContainer.current])

  return (
    <div className={Style.column}>
      <div style={{ fontSize: 11, marginBottom: 14 }}>
        Logged in as {localStorage.userName}
        <div>
          <a
            onClick={() => {
              // Clear the session and reload
              localStorage.removeItem('token')
              window.location.reload()
            }}
          >
            Log out
          </a>
        </div>
      </div>
      <div className={Style.column} style={{ width: 316 }}>
        <label>RTMP Url</label>
        <input
          type="text"
          defaultValue={rtmpUrl}
          onChange={(e) => {
            setRtmpUrl(e.target.value)
          }}
        />
        <label>Stream Key</label>
        <input
          type="text"
          defaultValue={streamKey}
          onChange={(e) => {
            setStreamKey(e.target.value)
          }}
        />
        <div
          className={Style.row}
          style={{ width: '100%', justifyContent: 'flex-end', marginTop: 5 }}
        >
          {!isLive ? (
            <button
              disabled={pendingLive}
              onClick={async () => {
                await Command.setDestination({
                  projectId: project.id,
                  rtmpKey: streamKey,
                  rtmpUrl,
                })
                Command.startBroadcast({
                  projectId: project.id,
                })
                setPendingLive(true)
              }}
            >
              Go Live
            </button>
          ) : (
            <button
              onClick={() => {
                Command.stopBroadcast({
                  projectId: project.id,
                })
                setPendingLive(true)
              }}
            >
              End broadcast
            </button>
          )}
        </div>
      </div>
      <div
        className={Style.row}
        style={{
          marginTop: 14,
          marginBottom: 8,
          background: '#242533',
          padding: 10,
        }}
      >
        <Participants />
        <div
          className={Style.column}
          style={{ marginLeft: 14, marginBottom: 14 }}
        >
          <div className={Style.column}>
            <label>Background URL</label>
            <input
              type="text"
              defaultValue={background}
              onChange={(e) => {
                projectCommands.setBackgroundImage(e.target.value)
              }}
            />
          </div>
          <div className={Style.column}>
            <label>Layout</label>
            <select
              defaultValue={layout}
              onChange={(e) => {
                const { layout, props } = getLayout(e.target.value)
                projectCommands.setLayout(layout, props)

                // Store our custom layout configuration by name
                studio.Command.updateProjectMeta({
                  projectId: project.id,
                  meta: {
                    layout: e.target.value,
                  },
                })
              }}
            >
              {layouts.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>
          <div ref={renderContainer} style={{ width: 840, height: 500 }}></div>
          <div className={Style.row}>
            <DeviceSelection />
            <div
              style={{
                marginLeft: 20,
                marginTop: 12,
              }}
            >
              <ControlPanel />
            </div>
          </div>
        </div>
        <div style={{ marginLeft: 14 }}>
          <Chat />
        </div>
      </div>
      <div className={Style.column}>
        <label>Preview URL</label>
        <input
          // @ts-ignore
          onClick={(e) => e.target.select()}
          value={previewUrl}
          readOnly={true}
          style={{ width: 630 }}
        />
      </div>
      <div className={Style.column}>
        <label>Guest URL</label>
        <input
          // @ts-ignore
          onClick={(e) => e.target.select()}
          value={guestUrl}
          readOnly={true}
          style={{ width: 630 }}
        />
      </div>
    </div>
  )
}

export const HostView = () => {
  const {
    studio,
    project,
    projectCommands,
    room,
    setProject,
    setRoom,
    setStudio,
  } = useStudio()
  const [token, setToken] = useState<string>(localStorage['token'])
  const [failure, setFailure] = useState<string>(null)

  // Store as a global for debugging in console
  window.SDK = useStudio()

  useEffect(() => {
    init({
      env: config.env,
      logLevel: config.logLevel,
    })
      .then(setStudio)
      .catch((e) => {
        console.warn('Failed to initialize', e)
        setFailure(e.message)
      })
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
          const { layout, props } = getLayout(DEFAULT_LAYOUT)
          project = await ScenelessProject.create(
            {
              backgroundImage: getUrl() + 'bg.png',
              layout,
              layoutProps: props,
            },
            // Store our custom layout in metadata for future reference
            { layout: DEFAULT_LAYOUT },
          )
        }
        const activeProject = await studio.Command.setActiveProject({
          projectId: project.id,
        })
        const room = await activeProject.joinRoom({
          displayName: localStorage.userName,
        })

        setProject(activeProject)
        setRoom(room)
      })
      .catch((e) => {
        console.warn(e)
        setToken(null)
        localStorage.removeItem('token')
      })
  }, [studio, token, project])

  useEffect(() => {
    if (!projectCommands || !room) return
    // Prune non-existent participants from the project
    projectCommands.pruneParticipants()
  }, [projectCommands, room])

  if (project && room) {
    return <Project />
  }
  if (studio && !token) {
    return (
      <Login
        onLogin={({ userName, serviceName, token }) => {
          setToken(token)
          // Update storage/session data
          localStorage.setItem('serviceName', serviceName)
          localStorage.setItem('userName', userName)
          localStorage.setItem('token', token)
        }}
      />
    )
  }
  if (failure) {
    return <div>Failed to initialize: `{failure}`</div>
  }
  return <div>Loading...</div>
}
