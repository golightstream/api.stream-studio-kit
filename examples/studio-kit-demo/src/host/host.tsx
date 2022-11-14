/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import React, { useEffect, useRef, useState } from 'react'
// TODO: Change import to @api.stream/studio-kit
import {
  init,
  Helpers,
  SDK,
  Sources,
  Components,
  Compositor,
} from '@api.stream/studio-kit'
import { ControlPanel, DeviceSelection } from '../shared/control-panel'
import { DEFAULT_LAYOUT, getLayout, layouts } from '../layout-examples'
import { Chat } from '../shared/chat'
import Style from '../shared/shared.module.css'
import config from '../../config'

import ReCAPTCHA from 'react-google-recaptcha'
import axios from 'axios'
import { nanoid } from 'nanoid'
import { Column, Flex, Row } from '../ui/Box'
import { Component, Renderer } from '../components'
import { useRoot } from '../shared/hooks'
import { BackgroundSelect, BannerSelect, SourceList } from '../shared/sources'

const { useStudio } = Helpers.React

const getUrl = () =>
  window.location.protocol + '//' + window.location.host + '/'

// Determine whether this is running on API.stream
const isLiveURL = () => {
  return ['live.api.stream', 'live.stream.horse', 'localhost'].some((x) =>
    location.host.includes(x),
  )
}

const storage = {
  userName: localStorage.getItem('userName') || '',
}

export const sources = {
  Image: [
    {
      src: getUrl() + 'bg.png',
    },
  ],
  Video: [
    {
      src: 'https://assets.mixkit.co/videos/preview/mixkit-stars-in-space-1610-large.mp4',
    },
    {
      src: 'https://assets.mixkit.co/videos/preview/mixkit-curvy-road-on-a-tree-covered-hill-41537-large.mp4',
    },
  ],
  Banner: [
    {
      headerText: 'Header',
      bodyText: 'Some banner text',
      meta: {
        title: 'Short',
      },
    },
    {
      bodyText: 'This is a banner without a header. It has more text.',
      meta: {
        title: 'Long',
      },
    },
  ],
}

export const projects = {
  Sceneless: {
    settings: {
      type: 'Sceneless',
      props: {
        layout: getLayout(DEFAULT_LAYOUT).layout,
        layoutProps: getLayout(DEFAULT_LAYOUT).props,
      },
      sources,
    },
  },
  MultiScene: {
    settings: {
      type: 'MultiScene',
      props: {},
      sources,
    },
  },
}

export const generateId = () => (Math.random() * 1e20).toString(36)

const Login = (props: {
  onLogin: (result: {
    token: string
    userName: string
    projectType: keyof typeof projects
  }) => void
}) => {
  const { onLogin } = props
  const [userName, setUserName] = useState(storage.userName)
  const [projectType, setProjectType] =
    useState<keyof typeof projects>('Sceneless')
  const [recaptchaToken, setRecaptchaToken] = useState<string>()

  const login = async (e: any) => {
    e.preventDefault()

    let token: string
    // If this demo is running on API.stream, use captcha login
    if (isLiveURL()) {
      const http = axios.create({
        baseURL: location.host.includes('localhost')
          ? 'https://live.stream.horse/live/v2'
          : `https://${location.host}/live/v2`,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json; charset=utf-8',
        },
      })
      let res = await http.post(`/demo/token`, {
        serviceId: 'DEMO_STUDIOKIT',
        serviceUserId: nanoid(21),
        displayName: userName,
        recaptchaToken: recaptchaToken,
      })
      token = res.data.accessToken as string
    }
    // If you are running this demo locally, you will need to obtain an access token
    // as described here: https://www.api.stream/docs/api/auth/
    else {
      // For R&D purposes, you may use a trial access token in your frontend.
      // This is NOT permitted in production
      const APISTREAM_API_KEY = 'abc123' // CHANGEME
      const http = axios.create({
        baseURL: `https://${location.host}/live/v2`,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json; charset=utf-8',
          'X-Api-Key': `${APISTREAM_API_KEY}`,
        },
      })
      let res = await http.post(`/authentication/token`, {
        serviceUserId: nanoid(21),
        displayName: userName,
      })
      token = res.data.accessToken as string
    }

    onLogin({ token, userName, projectType })
  }

  return (
    <form
      className={Style.column}
      onSubmit={login}
      style={{ width: 310, alignItems: 'flex-end' }}
    >
      <div className={Style.column}>
        <label>Username</label>
        <input
          type="text"
          autoFocus={true}
          defaultValue={userName}
          style={{ width: 302 }}
          onChange={(e) => {
            setUserName(e.target.value)
          }}
        />
        <label>Project type</label>
        <select
          defaultValue={projectType}
          style={{ width: 302 }}
          onChange={(e) =>
            setProjectType(e.target.value as keyof typeof projects)
          }
        >
          {Object.keys(projects).map((x) => (
            <option value={x}>{x}</option>
          ))}
        </select>
        <div style={{ marginTop: 10, height: 78 }}>
          <ReCAPTCHA
            theme="dark"
            sitekey={config.recaptchaKey}
            onChange={(token: string) => {
              setRecaptchaToken(token)
            }}
          />
        </div>
      </div>
      <button
        disabled={!recaptchaToken}
        onClick={login}
        style={{ marginTop: 8, width: 70 }}
      >
        Log in
      </button>
    </form>
  )
}

const Top = ({
  studio,
  project,
}: {
  studio: SDK.Studio
  project: SDK.Project
}) => {
  const destination = project.destinations[0]
  const destinationAddress = destination?.address.rtmpPush
  const [rtmpUrl, setRtmpUrl] = useState(destinationAddress?.url)
  const [streamKey, setStreamKey] = useState(destinationAddress?.key)
  const [isLive, setIsLive] = useState(false)
  const [guestUrl, setGuestUrl] = useState('')

  // Generate project links
  useEffect(() => {
    studio.createGuestLink(getUrl() + 'guest/').then(setGuestUrl)
  }, [])

  // Listen for project events
  useEffect(() => {
    return project.subscribe((event, payload) => {
      if (event === 'BroadcastStarted') {
        setIsLive(true)
      } else if (event === 'BroadcastStopped') {
        setIsLive(false)
      }
    })
  }, [])

  return (
    <Column>
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
            onClick={async () => {
              await studio.Command.setDestination({
                projectId: project.id,
                rtmpKey: streamKey,
                rtmpUrl,
              })
              studio.Command.startBroadcast({
                projectId: project.id,
              })
            }}
          >
            Go Live
          </button>
        ) : (
          <button
            onClick={() => {
              studio.Command.stopBroadcast({
                projectId: project.id,
              })
            }}
          >
            End broadcast
          </button>
        )}
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
    </Column>
  )
}

const Bottom = () => {
  return (
    <Row>
      <DeviceSelection />
      <div
        style={{
          marginTop: 12,
          marginLeft: 20,
        }}
      >
        <ControlPanel />
      </div>
    </Row>
  )
}

export const HostView = () => {
  const { studio, project, room, setProject, setRoom, setStudio } = useStudio()
  const [token, setToken] = useState<string>(localStorage['token'])
  const [failure, setFailure] = useState<string>(null)
  const [projectType, setProjectType] = useState<keyof typeof projects>(
    localStorage['projectType'],
  )
  const root = useRoot<Components.Project.Interface>(project?.scene)

  // Store as a global for debugging in console
  window.SDK = useStudio()

  // @ts-ignore Debug helper
  window.component = root

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

  useEffect(() => {
    if (room) {
      room.sendData({ type: 'UserJoined' })
    }
  }, [room])

  if (project && room && root) {
    return (
      <Column>
        <Top studio={studio} project={project} />
        <Row align="stretch">
          <Column gap={10} marginTop={10}>
            <Component component={root.children[0]} />
            <Column>
              <label>Banner</label>
              <Flex padding={8} style={{ background: 'rgba(0, 0, 0, 0.2)' }}>
                <BannerSelect component={root} />
              </Flex>
            </Column>
          </Column>
          <Renderer scene={project.scene} />
          <Chat />
        </Row>
        <Bottom />
      </Column>
    )
  }

  if (studio && !token) {
    return (
      <Login
        onLogin={({ userName, token, projectType }) => {
          setProjectType(projectType)
          setToken(token)
          localStorage.setItem('userName', userName)
          localStorage.setItem('token', token)
          localStorage.setItem('projectType', projectType)
        }}
      />
    )
  }
  if (failure) {
    return <div>Failed to initialize: `{failure}`</div>
  }
  return <div>Loading...</div>
}
