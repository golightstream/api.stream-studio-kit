/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { Helpers, SDK } from '@api.stream/studio-kit'
import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { AppContext } from './context'
import Style from './shared.module.css'

const { Room } = Helpers
const { useStudio } = Helpers.React


export const Participants = ({room , projectCommands ,studio} : {room:any,projectCommands:any ,studio:any}) => {

  const { isHost } = useContext(AppContext)
  const [participants, setParticipants] = useState<SDK.Participant[]>([])

  // Listen for room participants
  useEffect(() => {
    if (!room) return
    return room.useParticipants((participants:any) => {
      setParticipants(participants)
      // Prune non-existent guests from the project
      if (isHost) projectCommands.pruneParticipants()
    })
  }, [room])




  return (
    <div className={Style.column}>
      {participants.map((x) => (
        <div key={x.id} style={{ marginBottom: 10 }}>
          <Participant participant={x} room={room} projectCommands={projectCommands} />
        </div>
      ))}
    </div>
  )
}

type ParticipantProps = {
  participant: SDK.Participant
  room?: any
  projectCommands?:any
  studio?: any
}
export const ParticipantCamera = ({
  participant,
  webcam,
  microphone,
  projectCommands,
  room
}: ParticipantProps & { webcam: SDK.Track; microphone: SDK.Track }) => {
  const { isHost } = useContext(AppContext)
  const { id, displayName } = participant
  const ref = useRef<HTMLVideoElement>()
  const [srcObject] = useState(new MediaStream([]))
  const isEnabled = webcam?.mediaStreamTrack && !webcam?.isMuted

  useEffect(() => {
    // Replace the tracks on the existing MediaStream
    Room.updateMediaStreamTracks(srcObject, {
      video: webcam?.mediaStreamTrack,
      audio: microphone?.mediaStreamTrack,
    })
  }, [webcam?.mediaStreamTrack, microphone?.mediaStreamTrack])

  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = srcObject
    }
  }, [ref?.current, srcObject, isEnabled])

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
      {isHost && <HostControls participant={participant} room={room} projectCommands={projectCommands} type="camera" />}
    </div>
  )
}

export const ParticipantScreenshare = ({
  participant,
  screenshare,
}: ParticipantProps & { screenshare: SDK.Track }) => {
  const { isHost } = useContext(AppContext)
  const { projectCommands } = useStudio()
  const { id, displayName } = participant
  const ref = useRef<HTMLVideoElement>()
  const [srcObject] = useState(new MediaStream([]))

  useEffect(() => {
    // Replace the tracks on the existing MediaStream
    Room.updateMediaStreamTracks(srcObject, {
      video: screenshare?.mediaStreamTrack,
    })
  }, [screenshare?.mediaStreamTrack])

  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = srcObject
    }
  }, [ref?.current, srcObject])

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
      {isHost && <HostControls participant={participant} type="screen" />}
    </div>
  )
}

export const Participant = ({ participant , room , projectCommands}: ParticipantProps) => {
  const [tracks, setTracks] = useState([])
  const screenshare = tracks.find((x) => x.type === 'screen_share')
  const webcam = tracks.find((x) => x.type === 'camera')
  const microphone = tracks.find((x) => x.type === 'microphone')

  useEffect(() => {
    if (!room) return
    setTracks(participant.trackIds.map(room.getTrack).filter(Boolean))
  }, [participant?.trackIds, room])

  return (
    <>
      <ParticipantCamera
        projectCommands={projectCommands}
        participant={participant}
        webcam={webcam}
        room={room}
        microphone={microphone}
      />
      {screenshare && (
        <div style={{ marginTop: 10 }}>
          <ParticipantScreenshare
            participant={participant}
            screenshare={screenshare}
          />
        </div>
      )}
    </>
  )
}

const HostControls = ({
  participant,
  type,
  projectCommands,
  room
}: ParticipantProps & { type: 'screen' | 'camera' }) => {
  const { id } = participant

  // Get the initial props in case the participant is on stream
  const projectParticipant = useMemo(
    () => projectCommands?.getParticipantState(id, type),
    [],
  )


  const [onStream, setOnStream] = useState(Boolean(projectParticipant))
  const [isMuted, setIsMuted] = useState(projectParticipant?.isMuted ?? false)
  const [volume, setVolume] = useState(projectParticipant?.volume ?? 1)
  const [isShowcase, setIsShowcase] = useState(false)

  // Monitor whether the participant has been removed from the stream
  //  from some other means (e.g. dragged off canvas by host)
  useEffect(() => {
    return projectCommands?.useParticipantState(
      id,
      (x:any) => {
        setOnStream(Boolean(x))
      },
      type,
    )
  }, [])

  // Monitor the project's showcase to determine whether this
  //  participant/type is active
  useEffect(
    () =>
      projectCommands?.useShowcase((showcase:any) => {
        setIsShowcase(showcase.participantId === id && showcase.type === type)
      }),

    [],
  )

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
                projectCommands?.addParticipant(id, { isMuted, volume }, type)
              } else {
                projectCommands?.removeParticipant(id, type)
              }
              setOnStream(checked)
            }}
          />
          On stream
        </label>
         <label>
          <input
            type="checkbox"
            checked={onStream}
            style={{ marginTop: 0, marginBottom: 0 }}
            onChange={(e) => {
              const checked = e.target.checked
              if (checked) {
                 room.setLocalParticipantMetadata(room?.participantId , { ...participant.meta , isMirrored: true })
              } else {
                room.setLocalParticipantMetadata(room?.participantId , { ...participant.meta , isMirrored: false })
              }
              setOnStream(checked)
            }}
          />
          On Mirror
        </label>

        <label style={{ opacity: onStream ? 1 : 0.5 }}>
          <input
            type="checkbox"
            style={{ marginTop: 0, marginBottom: 0 }}
            disabled={!onStream}
            checked={isShowcase}
            onChange={() => {
              if (isShowcase) {
                projectCommands?.setShowcase(null)
              } else {
                projectCommands?.setShowcase(id, type)
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
                projectCommands?.setParticipantVolume(id, value)
                setVolume(value)

                // Unmute when user changes the volume slider
                if (isMuted) {
                  projectCommands?.setParticipantMuted(id, false)
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
                projectCommands?.setParticipantMuted(id, !checked)
                setIsMuted(!checked)
              }}
            />
          </>
        )}
      </span>
    </div>
  )
}
