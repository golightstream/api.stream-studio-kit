/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import ReactDOM from 'react-dom'
import React from 'react'
import { isMatch } from 'lodash-es'
import { useEffect, useRef } from 'react'
import { CoreContext } from '../context'
import { Compositor } from '../namespaces'
import { getRoom } from '../webrtc/simple-room'
import { RoomParticipantSource } from '../sources'

type Props = {
  volume: number
  isMuted: boolean
  isHidden: boolean
}

export const RoomParticipant = {
  name: 'LS-Room-Participant',
  sourceType: 'RoomParticipant',
  props: {
    isMuted: {
      type: Boolean,
      required: false,
      default: false,
    },
    volume: {
      type: Number,
      required: false,
      default: 1,
    },
  },
  useSource(sources, props) {
    // TODO: Filter source.isActive to ensure we're getting the best match
    return sources.find((x) => isMatch(x.props, props.sourceProps))
  },
  create({ onUpdate, onNewSource, trigger }, initialProps) {
    const root = document.createElement('div')

    Object.assign(root.style, {
      position: 'relative',
    })

    let source: any
    let props = initialProps

    const Participant = ({
      props,
      source,
    }: {
      props: Props
      source: RoomParticipantSource
    }) => {
      const { volume = 1, isHidden = false } = props
      const ref = useRef<HTMLVideoElement>()

      // TODO: Transforms should not rely on external state
      const room = getRoom(CoreContext.state.activeProjectId)
      const isSelf = source?.id === room?.participantId

      // Mute audio if explicitly isMuted by host,
      //  or the participant is our local participant
      const muteAudio = isSelf || props.isMuted

      // Hide video if explicitly isHidden by host or
      //  if the participant is sending no video
      const hasVideo = !props.isHidden && source?.props.videoEnabled

      useEffect(() => {
        if (!ref.current) return
        ref.current.play().catch((e) => {
          document.addEventListener('click', () => ref.current?.play(), {
            once: true,
          })
        })
        if (source?.value && source?.value !== ref.current.srcObject) {
          ref.current.srcObject = source.value
        } else if (!source?.value) {
          ref.current.srcObject = null
        }
      }, [ref.current, source?.value])

      useEffect(() => {
        if (!ref.current) return
        ref.current.volume = volume
      }, [ref.current, volume])

      return (
        <div
          style={{
            position: 'relative',
            display: 'flex',
            height: '100%',
            width: '100%',
          }}
        >
          <div
            style={{
              background: '#222',
              position: 'absolute',
              height: '100%',
              width: '100%',
              fontSize: '43px',
              color: 'rgba(255,255,255,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: hasVideo ? '0' : '1',
            }}
          >
            <div
              style={{
                borderRadius: '50%',
                background: '#555',
                width: '70px',
                height: '70px',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: '1em',
              }}
            >
              {source?.props.displayName.slice(0, 1) || ''}
            </div>
          </div>
          <video
            ref={ref}
            autoPlay={true}
            muted={muteAudio}
            disablePictureInPicture={true}
            playsInline={true}
            style={{
              left: '50%',
              top: '50%',
              position: 'relative',
              transform: 'translate3d(-50%, -50%, 0)',
              height: '100%',
              opacity: hasVideo ? '1' : '0',
              objectFit: source?.props.type === 'screen' ? 'contain' : 'cover',
              background: 'rgba(0,0,0,0.6)',
            }}
          />
          {source?.props.displayName && (
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                height: 30,
                background:
                  'linear-gradient(90deg, rgba(0,0,0,0.5) 30px, rgba(77,75,78,0) 120px)',
                borderLeft: '5px solid #26ad80',
                padding: '0 0 0 10px',
                color: 'rgba(255,255,255,0.9)',
                fontWeight: 'bold',
                lineHeight: '30px',
                width: '100%',
              }}
            >
              {source.props.displayName}
            </div>
          )}
        </div>
      )
    }

    const render = () =>
      ReactDOM.render(<Participant source={source} props={props} />, root)

    onUpdate((_props) => {
      props = _props
      render()
    })

    onNewSource((_source) => {
      source = _source
      render()
    })

    return {
      root,
    }
  },
} as Compositor.Transform.TransformDeclaration
