/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import React, { useEffect, useRef, useState } from 'react'
import { init, Helpers, Component, Source, SDK, Command } from '../../../../'
import { Participants } from '../shared/participant'
import { ControlPanel, DeviceSelection } from '../shared/control-panel'
import { DEFAULT_LAYOUT, getLayout, layouts } from '../layout-examples'
import Style from '../shared/shared.module.css'
import { Chat } from '../shared/chat'

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

export const ScenelessProject = ({ project, Command }: { project: SDK.Project; Command: any }) => {
  const { execute, source } =
    project.scene.component() as Component.ScenelessProject.Interface
  const renderContainer = useRef()

  // Debug helpers
  // @ts-ignore
  window.project = project

  // Get custom layout name from metadata we store
  const layout = project.props.layout
  // const background = projectCommands.getBackgroundMedia()
  // const overlay = projectCommands.getImageOverlay()

  // Sources
  const [images, setImages] = useState<Source.Image.ImageSource[]>([])
  const [videos, setVideos] = useState<Source.Video.VideoSource[]>([])
  const background = execute.getBackground()

  useEffect(() => {
    source.useAll('Image', setImages)
    source.useAll('Video', setVideos)
  }, [source])

  useEffect(() => {
    project.scene.render({
      containerEl: renderContainer.current,
    })
  }, [renderContainer.current])

  if (!project.scene.getRoot()) return null

  return (
    <div className={Style.column}>
      <div className={Style.column} style={{ width: 316, display: 'flex' }}>
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
                    style={{
                      border: `1px solid ${
                        background?.id === overlay.id ? 'white' : 'black'
                      }`,
                    }}
                    onClick={() => {}}
                  >
                    <img width="40px" height="50px" src={overlay.url} />
                  </li>
                ))}
              </ul>
            </span>
          </div>
          <div>
            <span>
              Video clips
              <ul style={{ listStyle: 'none' }}>
                {videos.map((overlay) => (
                  <li
                    key={overlay.id}
                    style={{
                      border: `1px solid ${
                        background?.id === overlay.id ? 'white' : 'black'
                      }`,
                    }}
                    onClick={() => {
                      execute.setBackground({ type: 'Video', id: overlay.id })
                    }}
                  >
                    <video width="40px" height="50px" src={overlay.props.src} />
                  </li>
                ))}
              </ul>
            </span>
          </div>
          <div>
            <span>
              Images
              <ul style={{ listStyle: 'none' }}>
                {images.map((overlay) => (
                  <li
                    key={overlay.id}
                    onClick={() => {
                      execute.setBackground({ type: 'Image', id: overlay.id })
                    }}
                  >
                    <img width="40px" height="50px" src={overlay.props.src} />
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
                      if (selectedImage !== logo.id) {
                        setSelectedImage(logo.id)
                        // projectCommands.addLogo(logo.id, {
                        //   src: logo.url,
                        // })
                      } else {
                        // projectCommands.removeLogo(selectedImage)
                        setSelectedImage(null)
                      }
                    }}
                  >
                    <img width="40px" height="50px" src={logo.url} />
                  </li>
                ))}
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
        <Participants />
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
                execute.setLayout(layout, props)

                // Store our custom layout configuration by name
                Command.updateProjectMeta({
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
    </div>
  )
}
