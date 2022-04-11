/* --------------------------------------------------------------------------------------------- 
 * Copyright (c) Infiniscene, Inc. All rights reserved. 
 * Licensed under the MIT License. See License.txt in the project root for license information. 
 * -------------------------------------------------------------------------------------------- */
import { useContext, useEffect, useRef, useState } from 'react'
import { init, Helpers, SDK } from '@golightstream/studio-sdk'
import { ControlPanel, DeviceSelection } from '../shared/control-panel'
import { Participant } from '../shared/participant'
import Style from '../shared/shared.module.css'
import { Chat } from '../shared/chat'
import config from '../../config'

const { Room } = Helpers
const { useStudio } = Helpers.React

const DEFAULT_GUEST_NAME = 'Guest-' + Math.floor(Math.random() * 1e4)

const Project = () => {
  const { studio, project, room } = useStudio()
  const renderContainer = useRef()
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

  useEffect(() => {
    studio.render({
      containerEl: renderContainer.current,
      projectId: project.id,
      dragAndDrop: false, // Disable controls for guests
    })
  }, [renderContainer.current])

  return (
    <div className={Style.column} style={{ marginLeft: 10 }}>
      <div ref={renderContainer}></div>
      {isLive && <div style={{ fontWeight: 'bold' }}>You're live!</div>}
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
  )
}

export const GuestView = () => {
  const { studio, project, room, setStudio, setProject, setRoom } = useStudio()
  const [joining, setJoining] = useState(false)
  const [displayName, setDisplayName] = useState(DEFAULT_GUEST_NAME)
  const [participant, setParticipant] = useState<SDK.Participant>()
  const [error, setError] = useState<string>()

  // Store as a global for debugging in console
  window.SDK = useStudio()

  // Listen for room participants
  useEffect(() => {
    if (!room) return
    return room.useParticipant(room.participantId, setParticipant)
  }, [room])

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
    if (!project) return
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
      })
  }, [project])

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
    <div
      className={Style.row}
      style={{ marginTop: 14, background: '#242533', padding: 10 }}
    >
      <div className={Style.column}>
        {participant && <Participant participant={participant} />}
      </div>
      <Project />
      <div style={{ marginLeft: 10 }}>
        <Chat />
      </div>
    </div>
  )
}
