/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { useContext, useEffect, useRef, useState } from 'react'
import { init, Helpers, SDK } from '../../../../'
import { ControlPanel, DeviceSelection } from '../shared/control-panel'
import Style from '../shared/shared.module.css'
import { Chat } from '../shared/chat'
import config from '../../config'
import { Column, Row } from '../ui/layout/Box'
import { Renderer } from '../components'

const { Room } = Helpers
const { useStudio } = Helpers.React

const DEFAULT_GUEST_NAME = 'Guest-' + Math.floor(Math.random() * 1e4)

const Top = ({
  studio,
  project,
}: {
  studio: SDK.Studio
  project: SDK.Project
}) => {
  const [isLive, setIsLive] = useState(false)

  useEffect(() => {
    Room.ensureDevicePermissions()
  })

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
    <Column style={{ marginLeft: 10 }}>
      {isLive && <div style={{ fontWeight: 'bold' }}>You're live!</div>}
      <Row>
        <DeviceSelection />
        <div
          style={{
            marginLeft: 20,
            marginTop: 12,
          }}
        >
          <ControlPanel />
        </div>
      </Row>
    </Column>
  )
}

export const GuestView = () => {
  const { studio, project, room, setStudio, setProject, setRoom } = useStudio()
  const [joining, setJoining] = useState(false)
  const [displayName, setDisplayName] = useState(DEFAULT_GUEST_NAME)
  const [error, setError] = useState<string>()
  const [inRoom, setInRoom] = useState<boolean>(false)

  // Store as a global for debugging in console
  window.SDK = useStudio()

  // Initialize studio
  useEffect(() => {
    if (!joining) return
    if (!studio) {
      init({
        env: config.env,
        logLevel: config.logLevel,
      })
        .then(setStudio)
        .catch((e) => {
          console.warn(e)
          setError(e.message)
        })
    }
  }, [joining])

  // Initialize project
  useEffect(() => {
    if (!studio) return

    if (studio.initialProject) {
      // If the SDK detects a token in the URL, it will return the project
      //  associated with it (e.g. guest view)
      setProject(studio.initialProject)
    } else {
      setError('Invalid token')
    }
  }, [studio])

  // Initialize room
  useEffect(() => {
    if (!project || inRoom) return
    setInRoom(true)
    project
      .joinRoom({
        displayName,
      })
      .then((room) => {
        setJoining(false)
        setRoom(room)
      })
      .catch((e) => {
        setError(e.message)
        setInRoom(false)
      })
  }, [project, room])

  if (error) {
    return <div>{error}</div>
  }

  if (joining) {
    return <div>Joining as {displayName}...</div>
  }

  if (!room) {
    return (
      <form
        className={Style.column}
        style={{ width: 316, alignItems: 'flex-end' }}
        onSubmit={(e) => {
          e.preventDefault()
          setJoining(true)
        }}
      >
        <div className={Style.column}>
          <label>Display Name</label>
          <input
            type="text"
            autoFocus={true}
            defaultValue={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value)
            }}
          />
        </div>
        <DeviceSelection />
        <button
          style={{ marginTop: 8, width: 70 }}
          onClick={() => {
            setJoining(true)
          }}
        >
          Join
        </button>
      </form>
    )
  }

  return (
    <Column>
      <Top project={project} studio={studio} />
      <Row align="flex-start">
        <Renderer project={project} />
        <Column style={{ marginLeft: 10 }}>
          <Chat />
        </Column>
      </Row>
    </Column>
  )
}
