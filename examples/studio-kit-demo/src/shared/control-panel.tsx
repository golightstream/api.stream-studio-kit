/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { useEffect, useState } from 'react'
import { Helpers, SDK } from '@api.stream/studio-kit'
import Style from '../shared/shared.module.css'

const { useStudio, useDevices } = Helpers.React

export const DeviceSelection = () => {
  const { webcamId, microphoneId, setWebcamId, setMicrophoneId } = useStudio()
  const devices = useDevices()

  useEffect(() => {
    if (!webcamId) setWebcamId(devices.webcams[0]?.deviceId)
  }, [webcamId, devices])

  useEffect(() => {
    if (!microphoneId) setMicrophoneId(devices.microphones[0]?.deviceId)
  }, [microphoneId, devices])

  return (
    <div>
      <div className={Style.column}>
        <label>Webcam</label>
        <select
          value={webcamId}
          onChange={(e) => {
            setWebcamId(e.target.value)
          }}
        >
          {devices.webcams.map((x) => (
            <option key={x.deviceId} value={x.deviceId}>
              {x.label}
            </option>
          ))}
        </select>
      </div>
      <div className={Style.column}>
        <label>Microphone</label>
        <select
          value={microphoneId}
          onChange={(e) => {
            setMicrophoneId(e.target.value)
          }}
        >
          {devices.microphones.map((x) => (
            <option key={x.deviceId} value={x.deviceId}>
              {x.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

export const ControlPanel = ({
  room,
  projectCommands,
}: {
  room: any
  projectCommands
 :any}) => {

  const [isSharingScreen, setIsSharingScreen] = useState(false)
  const [participant, setParticipant] = useState<SDK.Participant>()

  // Listen for room participants
  useEffect(() => {
    if (!room) return
    return room.useParticipant(room.participantId, setParticipant)
  }, [room])

  useEffect(() => {
    if (!participant) return
    const screenshare = participant.trackIds.find(
      (x) => room.getTrack(x)?.type === 'screen_share',
    )
    if (!screenshare) {
      projectCommands.removeParticipant(room.participantId, 'screen')
    }
    setIsSharingScreen(Boolean(screenshare))
  }, [participant?.trackIds])

  return (
    <div>
      <label>
        <input
          type="checkbox"
          onChange={(e) => {
            
          room.addCamera({
            deviceId:
              '7360456cb5f177a56d708c3dc4981b540ecc5197ec79fb67ee5e573bf434a760',
          })
          }}
        />
       Add Additional Camera
      </label>
      <label>
        <input
          type="checkbox"
          onChange={(e) => {
            const muted = e.target.checked
            room.setMicrophoneEnabled(!muted)
          }}
        />
        Mute microphone
      </label>
      <label>
        <input
          type="checkbox"
          onChange={(e) => {
            const hidden = e.target.checked
            room.setCameraEnabled(!hidden)
          }}
        />
        Hide webcam
      </label>
      <label>
        <input
          type="checkbox"
          checked={isSharingScreen}
          onChange={(e) => {
            const enabled = e.target.checked
            if (enabled) {
              room.addScreen()
            } else {
              room
                .getParticipant(room.participantId)
                .trackIds.forEach((x: any) => {
                  if (room.getTrack(x).type === 'screen_share') {
                    room.removeTrack(x)
                  }
                })
            }
          }}
        />
        Screenshare
      </label>
    </div>
  )
}
