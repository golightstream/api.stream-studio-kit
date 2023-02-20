/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import React, { useEffect, useRef, useState } from 'react'
import { init, Helpers } from '../../../../'
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
  const renderContainer = useRef()
  const destination = project.destinations[0]
  const destinationAddress = destination?.address.rtmpPush
  const { Command } = studio

  const [rtmpUrl, setRtmpUrl] = useState(destinationAddress?.url)
  const [streamKey, setStreamKey] = useState(destinationAddress?.key)
  const [previewUrl, setPreviewUrl] = useState('')
  const [guestUrl, setGuestUrl] = useState('')
  const [isLive, setIsLive] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)
  const [banners, setBanners] = React.useState<Banner[]>(
    studio.compositor.getSources('Banner'),
  )

  const [projectedLoaded, setProjectedLoaded] = useState(false)
  // Get custom layout name from metadata we store
  const layout = project.props.layout
  const background = projectCommands.getBackgroundMedia()
  const overlay = projectCommands.getImageOverlay()

  const overlays = [
    {
      id: '123',
      url: 'https://www.pngmart.com/files/12/Twitch-Stream-Overlay-PNG-Transparent-Picture.png',
    },
    {
      id: '124',
      url: 'https://www.pngmart.com/files/12/Stream-Overlay-Transparent-PNG.png',
    },
  ]

  const logos = [
    {
      id: '128',
      url: 'https://www.pngmart.com/files/12/Twitch-Stream-Overlay-PNG-Transparent-Picture.png',
    },
    {
      id: '129',
      url: 'https://www.pngmart.com/files/12/Stream-Overlay-Transparent-PNG.png',
    },
  ]

  const videooverlays = [
    {
      id: '125',
      url: 'https://assets.mixkit.co/videos/preview/mixkit-stars-in-space-1610-large.mp4',
    },
    {
      id: '126',
      url: 'https://assets.mixkit.co/videos/preview/mixkit-curvy-road-on-a-tree-covered-hill-41537-large.mp4',
    },
    {
      id: '127',
      url: 'https://assets.mixkit.co/videos/preview/mixkit-curvy-road-on-a-tree-covered-hill-41537-large.mp4',
    },
  ]

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

  useEffect(() => {
    studio.compositor.subscribe((event, payload) => {
      if (event === 'VideoTimeUpdate') {
        console.log(payload)
      }
    })
  }, [])

  React.useEffect(() => {
    return projectCommands.useLayerState('Background', (props) => {
      console.log(props)
    })
  }, [])

  React.useEffect(() => {
    return projectCommands.useLayerState('Overlay', (props) => {
      console.log(props)
    })
  }, [])

  React.useEffect(() => studio.compositor.useSources('Banner', setBanners), [])
  // Generate project links
  useEffect(() => {
    studio.createPreviewLink().then(setPreviewUrl)
    studio.createGuestLink(getUrl() + 'guest/').then(setGuestUrl)
  }, [])

  useEffect(() => {
    studio.render({
      containerEl: renderContainer.current,
      projectId: project.id,
      dragAndDrop: true,
    })
  }, [renderContainer.current])

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
        >
          <div>
            <span>
              Overlays
              <ul style={{ listStyle: 'none' }}>
                {overlays.map((overlay) => (
                  <li
                    key={overlay.id}
                    onClick={() => {
                      //   if (selectedImage !== overlay.id) {
                      setSelectedImage(overlay.id)
                      projectCommands.addImageOverlay(overlay.id, {
                        src: overlay.url,
                      })
                      // } else {
                      //   projectCommands.removeImageOverlay2()
                      //   setSelectedImage(null)
                      // }
                    }}
                  >
                    <img width="40px" height="50px" src={overlay.url} />
                  </li>
                ))}
              </ul>
              <input
                type="button"
                value="Remove Image Overlay"
                onClick={() => {
                  projectCommands.removeImageOverlay()
                }}
              />
              <input
                type="button"
                value="Remove Video Overlay"
                onClick={() => {
                  projectCommands.removeVideoOverlay()
                }}
              />
              <input
                type="button"
                value="Remove Custom Overlay"
                onClick={() => {
                  projectCommands.removeCustomOverlay()
                }}
              />
              <input
                type="button"
                value="Get Image Overlay"
                onClick={() => {
                  console.log(projectCommands.getImageOverlay())
                }}
              />
              <input
                type="button"
                value="Get Video Overlay"
                onClick={() => {
                  console.log(projectCommands.getVideoOverlay())
                }}
              />
              <input
                type="button"
                value="Get Custom Overlay"
                onClick={() => {
                  console.log(projectCommands.getCustomOverlay())
                }}
              />
            </span>
          </div>
          <div>
            <span>
              Video clips
              <ul style={{ listStyle: 'none' }}>
                {videooverlays.map((overlay) => (
                  <li
                    key={overlay.id}
                    onClick={() => {
                      setSelectedVideo(overlay.id)
                      projectCommands.addVideoOverlay(overlay.id, {
                        src: overlay.url,
                        loop: true,
                      })
                    }}
                  >
                    <video width="40px" height="50px" src={overlay.url} />
                  </li>
                ))}
              </ul>
            </span>
          </div>
          <div>
            <span>
              Logos
              <ul style={{ listStyle: 'none' }}>
                {logos.map((logo) => (
                  <li
                    key={logo.id}
                    onClick={() => {
                      setSelectedImage(logo.id)
                      projectCommands.addLogo(logo.id, {
                        src: logo.url,
                      })
                    }}
                  >
                    <img width="40px" height="50px" src={logo.url} />
                  </li>
                ))}
                <input
                  type="button"
                  value="Remove Logo"
                  onClick={() => {
                    projectCommands.removeLogo()
                  }}
                />
                <input
                  type="button"
                  value="Get Logo"
                  onClick={() => {
                    console.log(projectCommands.getLogo())
                  }}
                />
              </ul>
            </span>
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
            <label>Background URL</label>
            <input
              type="text"
              defaultValue={background}
              onChange={(e) => {
                if (/\.(gif|jpe?g|tiff?|png|webp|bmp)$/i.test(e.target.value)) {
                  //          projectCommands.setBackgroundImage(e.target.value)
                  projectCommands.setBackgroundImage(generateId(), {
                    src: e.target.value,
                  })
                } else {
                  //            projectCommands.setBackgroundVideo(e.target.value)
                  // projectCommands.setBackgroundVideo(generateId(), {
                  //   src: e.target.value,
                  //   loop: true,
                  // })

                  projectCommands.addCustomOverlay(generateId(), {
                    src: 'https://rainmaker.gg/overlay/609c76dcae6381152444d16d5709fe62/12',
                    width: 1920,
                    height: 1080,
                  })

                  // projectCommands.addCustomOverlay(generateId(), {
                  //   src: 'https://rainmaker.gg/overlay/609c76dcae6381152444d16d5709fe62/12',
                  //   width: 1920,
                  //   height: 1080,
                  // })
                }
              }}
            />
            <input
              type="button"
              defaultValue="Remove Background"
              onClick={() => {
                const backgroundVideo = projectCommands.removeBackgroundImage()
                console.log(backgroundVideo)
              }}
            />
            <input
              type="button"
              defaultValue="Clear"
              onClick={() => {
                const backgroundVideo = projectCommands.getBackgroundMedia()
                console.log(backgroundVideo)
              }}
            />
          </div>
          <div className={Style.column}>
            <label>CHat Overlay</label>
            <input
              type="button"
              defaultValue={background}
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
            <label>Add Banner</label>
            <input
              type="button"
              defaultValue={background}
              onClick={(e) => {
                projectCommands.addBanner({
                  bodyText: `hey hey hey ${Date.now()}`,
                })
              }}
            />
          </div>
          <div className={Style.column}>
            <label>Set Banner</label>
            <input
              type="button"
              defaultValue={background}
              onClick={(e) => {
                const randomIndex = randomIntFromInterval(0, banners.length - 1)
                projectCommands.setActiveBanner(banners[randomIndex].id)
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
              <ControlPanel room={room} projectCommands={projectCommands} />
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
