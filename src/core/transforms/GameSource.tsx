/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { createRoot } from 'react-dom/client'
import React, { useLayoutEffect, useState, useEffect, useRef } from 'react'
import { isMatch } from 'lodash-es'
import { CoreContext } from '../context'
import { Compositor } from '../namespaces'
import * as Sources from '../sources'
import { getProject } from '../data'

type Props = {
  volume: number
  isMuted: boolean
  isHidden: boolean
  sink: string
}

export const GameSource = {
  name: 'LS-Game-Source',
  sourceType: 'GAME',
  props: {},
  useSource(sources, props) {
    return sources.find((x) => isMatch(x.props, props.sourceProps))
  },
  create({ onUpdate, onNewSource, onRemove }, initialProps) {
    const root = document.createElement('div')
    // TODO: Transforms should not rely on external state
    const project = getProject(CoreContext.state.activeProjectId)
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

    const GameSourceLayer = ({
      props,
      source,
    }: {
      props: Props
      source: Sources.GameSource
    }) => {
      const ref = useRef<HTMLVideoElement>()
      const { volume = 1, isHidden = false } = props || {}
      const [labelSize, setLabelSize] = useState<0 | 1 | 2 | 3>(0)

      const muteAudio = props?.isMuted

      const hasVideo = !props?.isHidden && source?.props?.videoEnabled

      useEffect(() => {
        if (!ref.current) return
        ref.current.play().catch((e) => {
          document.addEventListener('click', () => ref.current?.play(), {
            once: true,
          })
        })

        if (source?.value && source?.value !== ref.current.srcObject) {
          ref.current.srcObject = source?.value
        } else if (!source?.value) {
          ref.current.srcObject = null
        }
      }, [ref.current, source?.value])

      useEffect(() => {
        if (!props && ref.current) {
          ref.current.srcObject = null
          ref.current = null
        }
      }, [props])

      useLayoutEffect(() => {
        if (!ref.current) return

        const calculate = () => {
          const rect = ref.current
          if (rect) {
            setLabelSize(
              getSize(rect.clientWidth, {
                width: project.compositor.getRoot().props.size.x,
                height: project.compositor.getRoot().props.size.y,
              }),
            )
          }
        }

        const resizeObserver = new ResizeObserver((entries) => {
          calculate()
        })

        calculate()
        resizeObserver?.observe(ref.current)

        return () => {
          if (ref.current) {
            resizeObserver?.unobserve(ref.current)
            ref.current.srcObject = null
          }
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
            {Boolean(source) && (
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
                Game Source
              </div>
            )}
          </div>
          <div
            style={{
              position: 'relative',
              display: 'flex',
              height: '100%',
              width: '100%',
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
                objectFit: 'cover',
                background: 'rgba(0,0,0,0.6)',
              }}
            />
          </div>
        </div>
      )
    }

    const _root = createRoot(root)

    const render = () =>
      _root.render(<GameSourceLayer source={source} props={props} />)

    onUpdate((_props) => {
      props = _props
      render()
    })

    onNewSource((_source) => {
      source = _source
      render()
    })

    onRemove((_props) => {
      props = _props
      render()
    })

    return {
      root,
    }
  },
} as Compositor.Transform.TransformDeclaration
