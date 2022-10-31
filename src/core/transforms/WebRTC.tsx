/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import ReactDOM from 'react-dom'
import React, { useLayoutEffect, useState } from 'react'
import { isMatch } from 'lodash-es'
import { useEffect, useRef } from 'react'
import { CoreContext } from '../context'
import { Compositor, Sources } from '../namespaces'
import { getRoom } from '../webrtc/simple-room'
import { getProject } from '../data'

export type Props = {
  volume: number
  isMuted: boolean
  isHidden: boolean
}

export const RoomParticipant = {
  name: 'RoomParticipant',
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
  create({ onUpdate, onNewSource }, initialProps) {
    const root = document.createElement('div')

    Object.assign(root.style, {
      position: 'relative',
    })

    let source: any
    let props = initialProps

    const getSize = (
      width: number,
      canvas: { width: number; height: number },
    ) => {
      const widthAsPercentage = width / canvas.width

      if (widthAsPercentage >= 0.5) {
        return 3
      } else if (widthAsPercentage > 0.25) {
        return 2
      } else if (widthAsPercentage > 0.15) {
        return 1
      }
      return 0
    }

    const Participant = ({
      props,
      source,
    }: {
      props: Props
      source: Sources.WebRTC.RoomParticipantSource
    }) => {
      const { volume = 1, isHidden = false } = props
      const [labelSize, setLabelSize] = useState<0 | 1 | 2 | 3>(0)
      const ref = useRef<HTMLVideoElement>()
      // TODO: Transforms should not rely on external state
      const project = getProject(CoreContext.state.activeProjectId)
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

      useLayoutEffect(() => {
        if (!ref.current) return

        const calculate = () => {
          const rect = ref.current
          setLabelSize(
            getSize(rect.clientWidth, {
              width: project.compositor.getRoot().props.size.x,
              height: project.compositor.getRoot().props.size.y,
            }),
          )
        }

        const resizeObserver = new ResizeObserver((entries) => {
          calculate()
        })
        calculate()
        resizeObserver.observe(ref.current)

        return () => {
          resizeObserver.unobserve(ref.current)
        }
      }, [ref.current, project])

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
            {source?.props.displayName && (
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
            )}
          </div>
          <div
            style={{
              position: 'relative',
              display: 'flex',
              height: '100%',
              width: '100%',
              ...(Boolean(source?.props?.mirrored) && {
                transform: 'scaleX(-1)',
              }),
            }}
          >
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
                objectFit:
                  source?.props.type === 'screen' ? 'contain' : 'cover',
                background: 'rgba(0,0,0,0.6)',
              }}
            />
          </div>
          {source?.props.displayName && (
            <div
              className="NameBannerContainer"
              style={{
                width: '100%',
                height: '100%',
                position: 'absolute',
              }}
            >
              <div
                className="NameBanner"
                data-size={labelSize}
                style={{
                  padding: '12px 30px',
                  width: 'fit-content',
                  height: 'fit-content',
                  top: '100%',
                  transform: 'translateY(-100%)',
                  left: 0,
                }}
              >
                {/* {headerText && (
                  <div
                    className="Banner-header"
                    style={{ marginBottom: 6, fontSize: '60px' }}
                  >
                    {headerText}
                  </div>
                )} */}
                {
                  <div className="NameBanner-body">
                    {source.props.displayName}
                  </div>
                }
              </div>
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

export const Declaration = RoomParticipant
