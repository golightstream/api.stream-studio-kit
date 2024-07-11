/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { init, Helpers, SDK } from '@api.stream/studio-kit'
import { Participants } from '../shared/participant'
import { ControlPanel, DeviceSelection } from '../shared/control-panel'
import { DEFAULT_LAYOUT, getLayout, layouts } from './layout-examples'
import { Chat } from '../shared/chat'
import Style from '../shared/shared.module.css'
import config from '../../config'

import ReCAPTCHA from 'react-google-recaptcha'
import axios from 'axios'
import { nanoid } from 'nanoid'
import { Banner } from '../../../../types/src/helpers/sceneless-project'
import { MediadataProps, MediaHeader, MediaRow } from './components/tile'
import { BackgroundProps } from '../../../../types/src/core/transforms/Background'
import { OverlayProps } from '../../../../types/src/core/transforms/Overlay'
import { backgrounds, logos, overlays, videooverlays } from './data'
import { LogoProps } from '../../../../types/src/core/transforms/Logo'

const { ScenelessProject } = Helpers
const { useStudio } = Helpers.React

const getUrl = () =>
  window.location.protocol +
  '//' +
  window.location.host +
  window.location.pathname

// Determine whether this is running on API.stream
const isLiveURL = () => {
  return ['live.api.stream', 'live.stream.horse', 'localhost'].some((x) =>
    location.host.includes(x),
  )
}

const storage = {
  userName: localStorage.getItem('userName') || '',
}

export const generateId = () => (Math.random() * 1e20).toString(36)

const Login = (props: {
  onLogin: ({ token, userName }: { token: string; userName: string }) => void
}) => {
  const { onLogin } = props
  const [userName, setUserName] = useState(storage.userName)
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

    onLogin({ token, userName })
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

const Project = () => {
  const { studio, project, room, projectCommands } = useStudio()
  const [sources, setSources] = useState(project.sources)
  const renderContainer = useRef()
  const destination = project.destinations[0]
  const destinationAddress = destination?.address.rtmpPush
  const { Command } = studio

  const [rtmpUrl, setRtmpUrl] = useState(destinationAddress?.url)
  const [streamKey, setStreamKey] = useState(destinationAddress?.key)
  const [previewUrl, setPreviewUrl] = useState('')
  const [guestUrl, setGuestUrl] = useState('')
  const [isLive, setIsLive] = useState(false)
  const [banners, setBanners] = React.useState<Banner[]>(
    studio.compositor.getSources('Banner'),
  )
  // Get custom layout name from metadata we store
  const layout = project.props.layout
  const [background, setBackground] = useState(
    projectCommands.getBackgroundMedia(),
  )
  const [logo, setLogo] = useState(projectCommands.getLogo())
  const [overlay, setOverlay] = useState(projectCommands.getImageOverlay())
  const [videoOverlay, setVideoOverlay] = useState(
    projectCommands.getVideoOverlay(),
  )

  // Listen for project events
  React.useEffect(() => {
    return project.subscribe((event, payload) => {
      if (event === 'ProjectSourceAdded') {
        console.log('new source', payload.source)
        setSources([...sources, payload.source])
      } else if (event === 'ProjectSourceRemoved') {
        const source = sources.find((s) => s.id === payload.sourceId)
        setSources(sources.filter((s) => s.id !== payload.sourceId))
        if (source.address?.dynamic?.id === 'integration') {
          projectCommands.removeGameSource(payload.sourceId)
        } else {
          projectCommands.removeRTMPSource(payload.sourceId)
        }
      }
    })
  })

  useEffect(() => {
    return project.subscribe((event, payload) => {
      if (event === 'BroadcastStarted') {
        setIsLive(true)
      } else if (event === 'BroadcastStopped') {
        setIsLive(false)
      }
    })
  }, [])

  useEffect(() => {
    studio.compositor.subscribe((event, payload) => {
      if (event === 'VideoTimeUpdate') {
        console.log(payload)
      }
    })
  }, [])

  React.useEffect(() => {
    /* A hook that is listening to the state of the layer. */
    return projectCommands.useLayerState(
      'Background',
      (layerProps: BackgroundProps) => {
        setBackground(layerProps[0]?.id)
      },
    )
  }, [])

  React.useEffect(() => {
    /* A hook that is listening to the state of the layer. */
    return projectCommands.useLayerState('Logo', (layerProps: LogoProps) => {
      setLogo(layerProps[0]?.id)
    })
  }, [])

  React.useEffect(() => {
    return projectCommands.useLayerState(
      'Overlay',
      (layerProps: OverlayProps) => {
        /* Finding the image overlay and video overlay. */
        const imageOverlay = layerProps.find(
          (l: any) => l?.sourceProps?.type === 'image',
        )
        const videoOverlay = layerProps.find(
          (l: any) => l?.sourceProps?.type === 'video',
        )
        /* Setting the image overlay and video overlay. */
        setOverlay(imageOverlay?.id)
        setVideoOverlay(videoOverlay?.id)
      },
    )
  }, [])

  React.useEffect(() => studio.compositor.useSources('Banner', setBanners), [])
  // Generate project links
  useEffect(() => {
    studio.createPreviewLink().then(setPreviewUrl)
    studio.createGuestLink(getUrl() + 'guest/').then(setGuestUrl)
  }, [])

  useEffect(() => {
    if (project.id) {
      studio.render({
        containerEl: renderContainer.current,
        projectId: project.id,
        interactive: true,
      })
    }
  }, [project.id])

  const handleOverlayClick = (data: MediadataProps, type: string) => {
    switch (type) {
      case 'image':
        data.id === overlay
          ? projectCommands.removeImageOverlay()
          : projectCommands.addImageOverlay(data.id, { src: data.url })
        break
      case 'video':
        data.id === videoOverlay
          ? projectCommands.removeVideoOverlay()
          : projectCommands.addVideoOverlay(data.id, { src: data.url })
        break
    }
  }

  const handleBackgroundClick = (data: MediadataProps, type: string) => {
    switch (type) {
      case 'image':
        data.id === background
          ? projectCommands.removeBackgroundImage()
          : projectCommands.setBackgroundImage(data.id, { src: data.url })
        break
      case 'video':
        data.id === background
          ? projectCommands.removeBackgroundVideo()
          : projectCommands.setBackgroundVideo(data.id, { src: data.url })
        break
    }
  }

  const handleLogoClick = (data: MediadataProps, type: string) => {
    switch (type) {
      case 'image':
        data.id === logo
          ? projectCommands.removeLogo()
          : projectCommands.addLogo(data.id, { src: data.url })
        break
    }
  }
  function randomIntFromInterval(min: number, max: number) {
    // min and max included
    return Math.floor(Math.random() * (max - min + 1) + min)
  }

  if (!room) return null

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
      <div style={{ display: 'flex' }}>
        <div className={Style.column} style={{ width: 316, display: 'flex' }}>
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
                  await Command.setDestination({
                    projectId: project.id,
                    rtmpKey: streamKey,
                    rtmpUrl,
                  })
                  Command.startBroadcast({
                    projectId: project.id,
                    dynamicSources: {
                      'integration': {
                        rtmpPull: {
                          url: 'rtmp://ingest.stream.horse/apistream/g4mp1ZBJHY'
                        },
                      },
                    }
                  })
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
                }}
              >
                End broadcast
              </button>
            )}
          </div>
          <div
            style={{
              display: 'flex',
              marginLeft: '20%',
              marginTop: '-2%',
              position: 'absolute',
            }}
          ></div>
        </div>
        <div style={{ display: 'flex', gap: '20px', marginLeft: '50px' }}>
          <div>
            <MediaHeader title="Banners" />
            <div className={Style.column}>
              <input
                type="button"
                value="Add Banner"
                onClick={(e) => {
                  projectCommands.addBanner({
                    bodyText: `hey hey hey ${Date.now()}`,
                  })
                }}
              />
            </div>
            <div className={Style.column}>
              <input
                type="button"
                value="Set Banner"
                onClick={(e) => {
                  const randomIndex = randomIntFromInterval(
                    0,
                    banners.length - 1,
                  )
                  projectCommands.setActiveBanner(banners[randomIndex].id)
                }}
              />
            </div>
          </div>
          <div className={Style.column}>
            <MediaHeader title="Chat Overlays" />
            <input
              type="button"
              value="Add chat Banner"
              onClick={(e) => {
                projectCommands.addChatOverlay(generateId(), {
                  message: JSON.parse(
                    '[{"type":"text","text":"is now live! Streaming Mobile Legends: Bang Bang: My Stream "},{"type":"emoticon","text":"SirUwU","data":{"type":"direct","url":"https://static-cdn.jtvnw.net/emoticons/v2/301544927/default/light/2.0"}},{"type":"text","text":" Hey hey hey!!! this is going live "},{"type":"emoticon","text":"WutFace","data":{"type":"direct","url":"https://static-cdn.jtvnw.net/emoticons/v2/28087/default/light/2.0"}},{"type":"text","text":" , so lets go"}]',
                  ),
                  username: 'Maddygoround',
                  metadata: {
                    platform: 'twitch',
                    variant: 0,
                    avatar:
                      'https://inf2userdata0wus.blob.core.windows.net/content/62cc383fec1b480054cc2fde/resources/video/EchoBG.mp4/medium.jpg',
                  },
                })
              }}
            />
          </div>
          <div className={Style.column}>
            <MediaHeader title="Custom Overlays" />
            <input
              type="button"
              value="Add Custom Overlay"
              onClick={(e) => {
                projectCommands.addCustomOverlay(generateId(), {
                  src: 'https://rainmaker.gg/overlay/609c76dcae6381152444d16d5709fe62/12',
                  width: 1920,
                  height: 1080,
                })
              }}
            />
          </div>
          <div>
            <MediaHeader title="Sources" />
            <div className={Style.column}>
              <input
                type="button"
                value="Add RTMP Source"
                onClick={(e) => {
                  projectCommands.createSource({
                    displayName: `RTMP source: ${Math.ceil(
                      Math.random() * 10000,
                    )}`,
                    address: {
                      rtmpPush: {
                        enabled: true,
                      },
                    },
                  })
                }}
              />
            </div>
            <div className={Style.column}>
              {sources
                .filter((source) => !source.address.dynamic)
                .map((source) => {
                  return (
                    <div key={source.id}>
                      <div>
                        id: {source.id}, participantId:{' '}
                        {source.preview?.webrtc?.participantId}
                      </div>
                      <div>
                        url: {source.address.rtmpPush.baseUrl} key:{' '}
                        {source.address.rtmpPush.key}
                      </div>
                      <input
                        type="button"
                        value="Delete"
                        onClick={(e) => {
                          projectCommands.deleteSource(source.id)
                        }}
                      />
                      <input
                        type="button"
                        value="Add to stream"
                        onClick={(e) => {
                          projectCommands.addRTMPSource(source.id, {})
                        }}
                      />
                      <input
                        type="button"
                        value="Remove from stream"
                        onClick={(e) => {
                          projectCommands.removeRTMPSource(source.id)
                        }}
                      />
                    </div>
                  )
                })}
            </div>
          </div>

          <div>
            <MediaHeader title="Sources" />
            <div className={Style.column}>
              <input
                type="button"
                value="Add Game Source"
                onClick={(e) => {

                  projectCommands.createGameSource({
                    displayName: `Game source: ${Math.ceil(
                      Math.random() * 10000,
                    )}`,
                    address: {
                      dynamic: {
                        id: 'integration'
                      }
                    }
                  })

                }}
              />
            </div>
            <div className={Style.column}>
              {sources
                .filter((source) => source.address?.dynamic?.id === 'integration')
                .map((source) => {
                  return (
                    <div key={source.id}>
                      <div>
                        id: {source.id}, participantId:{' '}
                        {source.preview?.webrtc?.participantId}
                      </div>
                      <div>url: {source.address?.rtmpPull?.url}</div>
                      <input
                        type="button"
                        value="Delete"
                        onClick={(e) => {
                          projectCommands.deleteSource(source.id)
                        }}
                      />
                      <input
                        type="button"
                        value="Add to stream"
                        onClick={(e) => {
                          projectCommands.addGameSource(source.id, {})
                        }}
                      />
                      <input
                        type="button"
                        value="Remove from stream"
                        onClick={(e) => {
                          projectCommands.removeGameSource(source.id)
                        }}
                      />
                    </div>
                  )
                })}
            </div>
          </div>
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
        <Participants
          room={room}
          projectCommands={projectCommands}
          studio={studio}
        />
        <div
          className={Style.column}
          style={{ marginLeft: 14, marginBottom: 14 }}
        >
          <div className={Style.column}>
            <label>Layout</label>
            <select
              defaultValue={layout}
              onChange={(e) => {
                const { layout, props } = getLayout(e.target.value)
                projectCommands.setLayout(layout, props)

                // Store our custom layout configuration by name
                studio.Command.updateProjectProps({
                  projectId: project.id,
                  props: {
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
              <ControlPanel room={room} projectCommands={projectCommands} />
            </div>
          </div>
        </div>
        <div style={{ marginLeft: 14 }}>
          <Chat />
        </div>
        <div style={{ marginLeft: 14 }}>
          <MediaHeader title="Logos" />
          <MediaRow
            data={logos}
            type="image"
            handleClick={handleLogoClick}
            selected={Boolean(overlay)}
          />
          <MediaHeader title="Backgrounds" />
          <MediaRow
            data={backgrounds}
            handleClick={handleBackgroundClick}
            selected={Boolean(background)}
          />
          <MediaHeader title="Video Overlays" />
          <MediaRow
            selected={Boolean(videoOverlay)}
            data={videooverlays}
            type="video"
            handleClick={handleOverlayClick}
          />
          <MediaHeader title="Image Overlays" />
          <MediaRow
            data={overlays}
            type="image"
            handleClick={handleOverlayClick}
            selected={Boolean(overlay)}
          />
        </div>
      </div>
      <div className={Style.column}>
        <label>Preview URL</label>
        <input
          // @ts-ignore
          onClick={(e) => e.target.select()}
          value={previewUrl || ""}
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
      rendererVersion: '3.0.7-test',
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

        setRoom(room)
        setProject(activeProject)
      })
      .catch((e) => {
        console.warn(e)
        setToken(null)
        localStorage.removeItem('token')
      })
  }, [studio, token, project])

  useEffect(() => {
    if (room) {
      room.sendData({ type: 'UserJoined' })
    }
  }, [room])

  useEffect(() => {
    if (!projectCommands || !room) return
    // Prune non-existent participants from the project
    console.log('participants: ', room.getParticipants())
    projectCommands.pruneParticipants()
  }, [projectCommands, room])

  if (project && room) {
    return <Project />
  }
  if (studio && !token) {
    return (
      <Login
        onLogin={({ userName, token }) => {
          setToken(token)
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
