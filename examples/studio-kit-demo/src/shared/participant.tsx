/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { init, Helpers, Component, Source, SDK, Compositor } from '../../../../'
import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { AppContext } from './context'
import Style from './shared.module.css'
import { useRoot } from './hooks'

const { Room } = Helpers
const { useStudio } = Helpers.React

type Participant = Source.WebRTC.RoomParticipantSource
type NodeInterface = Compositor.Component.NodeInterface

export const Participants = ({ component }: { component: NodeInterface }) => {
  const { execute, sources } = component
  const { isHost } = useContext(AppContext)
  const [participants, setParticipants] = useState<Participant[]>([])

  // Listen for room participants
  useEffect(() => {
    sources.useAll('RoomParticipant', setParticipants)
  }, [])

  return (
    <div className={Style.column}>
      {participants.map((x) => (
        <div key={x.id} style={{ marginBottom: 10 }}>
          <Participant participant={x} component={component} />
        </div>
      ))}
    </div>
  )
}

type ParticipantProps = {
  participant: Participant
  component: NodeInterface
}
export const ParticipantCamera = ({
  participant,
  component,
}: ParticipantProps) => {
  const { isHost } = useContext(AppContext)
  const { displayName } = participant.props
  const ref = useRef<HTMLVideoElement>()
  const isEnabled = participant.value && !participant.props.videoEnabled

  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = participant.value
    }
  }, [ref?.current, participant.value])

  return (
    <div
      className={Style.column}
      style={{
        padding: 6,
        borderRadius: 3,
        background: '#000000cc',
        border: '1px solid rgba(255, 255, 255, 0.2)',
      }}
    >
      <div>{displayName}</div>
      <div
        style={{
          height: 160,
          width: (160 * 16) / 9,
          position: 'relative',
        }}
      >
        <div
          // Background to show when webcam is not enabled
          style={{
            background: '#222',
            height: '100%',
            width: '100%',
            position: 'absolute',
            zIndex: -1,
          }}
        />
        {isEnabled && (
          <video
            // Mute because audio is only communicated through the compositor
            muted={true}
            autoPlay={true}
            ref={ref}
            style={{
              background: 'transparent',
              objectFit: 'cover',
              height: '100%',
              width: '100%',
            }}
          />
        )}
      </div>
      {isHost && (
        <HostControls participant={participant} component={component} />
      )}
    </div>
  )
}

export const ParticipantScreenshare = ({
  participant,
  component,
}: ParticipantProps) => {
  const { isHost } = useContext(AppContext)
  const { displayName } = participant.props
  const ref = useRef<HTMLVideoElement>()

  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = participant.value
    }
  }, [ref?.current, participant.isActive])

  return (
    <div
      className={Style.column}
      style={{
        padding: 6,
        borderRadius: 3,
        background: '#000000cc',
        border: '1px solid rgba(255, 255, 255, 0.2)',
      }}
    >
      <div>{displayName} (Screen)</div>
      <div
        style={{
          height: 160,
          width: (160 * 16) / 9,
          position: 'relative',
        }}
      >
        <video
          // Mute because audio is only communicated through the compositor
          muted={true}
          autoPlay={true}
          ref={ref}
          style={{
            background: 'transparent',
            objectFit: 'cover',
            height: '100%',
            width: '100%',
          }}
        />
      </div>
      {isHost && (
        <HostControls participant={participant} component={component} />
      )}
    </div>
  )
}

export const Participant = ({ participant, component }: ParticipantProps) => {
  return (
    <>
      {participant.props.type === 'screen' ? (
        <ParticipantScreenshare
          participant={participant}
          component={component}
        />
      ) : (
        <ParticipantCamera participant={participant} component={component} />
      )}
    </>
  )
}

const HostControls = ({ participant, component }: ParticipantProps) => {
  const { id } = participant
  const { type } = participant.props

  // Get the initial props in case the participant is on stream
  const projectParticipant = useMemo(
    () => component.execute.getParticipantProps(id, type),
    [component],
  )

  const [onStream, setOnStream] = useState(Boolean(projectParticipant))
  const [isMuted, setIsMuted] = useState(projectParticipant?.isMuted ?? false)
  const [volume, setVolume] = useState(projectParticipant?.volume ?? 1)
  const [isShowcase, setIsShowcase] = useState(false)

  // Monitor whether the participant has been removed from the stream
  //  from some other means (e.g. dragged off canvas by host)
  useEffect(() => {
    return component.execute.useParticipantProps(id, type, (x) => {
      setOnStream(Boolean(x))
    })
  }, [])

  // Monitor the project's showcase to determine whether this
  //  participant/type is active
  // TODO:
  // useEffect(
  //   () =>
  //     projectCommands.useShowcase((showcase) => {
  //       setIsShowcase(showcase.participantId === id && showcase.type === type)
  //     }),

  //   [],
  // )

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        marginTop: 4,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* <video onCanPlayThrough={function() {
          this.muted = true ,
          this.play()
        }} /> */}
        <label>
          <input
            type="checkbox"
            checked={onStream}
            style={{ marginTop: 0, marginBottom: 0 }}
            onChange={(e) => {
              const checked = e.target.checked
              if (checked) {
                component.execute.addParticipant(
                  participant.props.participantId,
                  { isMuted, volume },
                  participant.props.type,
                )
              } else {
                component.execute.removeParticipant(id, type)
              }
              setOnStream(checked)
            }}
          />
          On stream
        </label>

        <label style={{ opacity: onStream ? 1 : 0.5 }}>
          <input
            type="checkbox"
            style={{ marginTop: 0, marginBottom: 0 }}
            disabled={!onStream}
            checked={isShowcase}
            onChange={() => {
              if (isShowcase) {
                // projectCommands.setShowcase(null)
              } else {
                // projectCommands.setShowcase(id, type)
              }
            }}
          />
          Showcase
        </label>
      </div>
      <span>
        {type === 'camera' && (
          <>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              style={{ opacity: isMuted ? 0.4 : 1 }}
              onChange={(e) => {
                const value = Number(e.target.value)
                projectCommands.setParticipantVolume(id, value)
                setVolume(value)

                // Unmute when user changes the volume slider
                if (isMuted) {
                  projectCommands.setParticipantMuted(id, false)
                  setIsMuted(false)
                }
              }}
            />
            <input
              type="checkbox"
              // Invert because "checked" means "enabled" (not muted) in this case
              checked={!isMuted}
              onChange={(e) => {
                const checked = e.target.checked
                projectCommands.setParticipantMuted(id, !checked)
                setIsMuted(!checked)
              }}
            />
          </>
        )}
      </span>
    </div>
  )
}
