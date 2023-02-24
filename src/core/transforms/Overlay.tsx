/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import ReactDOM from 'react-dom'
import React, { useEffect } from 'react'
import { Compositor } from '../namespaces'
import Iframe from './components/Iframe'
import { Image } from './components/Image'
import CoreContext from '../context'
import { getProject } from '../data'
import { APIKitAnimationTypes } from '../../animation/core/types'
import APIKitAnimation from '../../compositor/html/html-animation'

export const Overlay = {
  name: 'LS-Overlay',
  sourceType: 'Overlay',
  props: {
    id: {
      type: String,
      required: true,
    },
  },
  useSource(sources, props) {
    return sources.find((x) => x.props.type === props.id)
  },
  create({ onUpdate, onNewSource }, initialProps) {
    const root = document.createElement('div')
    let source: any

    const IFrame = ({ source }: { source: any }) => {
      const { src, meta, height, width } = source?.value || {}
      const { id } = source || {}
      const iframeRef = React.useRef<HTMLIFrameElement>(null)
      const [startAnimation, setStartAnimation] = React.useState(false)

      React.useEffect(() => {
        setStartAnimation(false)
      }, [id])

      useEffect(() => {
        if (iframeRef.current) {
          iframeRef.current.style.removeProperty('transformOrigin')
          iframeRef.current.style.removeProperty('transform')
          iframeRef.current.style.opacity = '0'
        }
      }, [src])

      const resizeIframe = () => {
        if (iframeRef.current) {
          const project = getProject(CoreContext.state.activeProjectId)
          const root = project.compositor.getRoot()
          const { x: rootWidth, y: rootHeight } = root.props.size
          let iframeWidth = iframeRef.current.clientWidth
          let iframeHeight = iframeRef.current.clientHeight

          let scale

          if (iframeWidth && iframeHeight) {
            scale = Math.min(rootWidth / iframeWidth, rootHeight / iframeHeight)
          } else {
            // It's possible the container will have no size defined (width/height=0)
            scale = 1
          }

          iframeRef.current.style.willChange = `transform`
          // @ts-ignore
          iframeRef.current.style.transformOrigin = '0 0'
          iframeRef.current.style.transform = `scale(${scale}) translateZ(0)`
          iframeRef.current.style.opacity = '1'
          setStartAnimation(true)
        }
      }
      return (
        <APIKitAnimation
          id={id}
          type="image"
          enter={APIKitAnimationTypes.FADE_IN}
          exit={APIKitAnimationTypes.FADE_OUT}
          duration={400}
        >
          <div
            style={{ opacity: startAnimation ? 1 : 0, width: '100%', height: '100%' }}
            className={`image-transition`}
          >
            {meta?.type === 'html-overlay' && (
              <Iframe
                url={src}
                frameBorder={0}
                iframeRef={iframeRef}
                height={height}
                width={width}
                onLoad={resizeIframe}
                styles={{ ...meta?.style, opacity: 0 }}
              />
            )}
            {meta?.type === 'image-overlay' && (
              <Image
                source={source}
                initialProps={initialProps}
                setStartAnimation={setStartAnimation}
              />
            )}
          </div>
        </APIKitAnimation>
      )
    }

    const render = () => ReactDOM.render(<IFrame source={source} />, root)

    onUpdate(() => {
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
