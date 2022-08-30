/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import ReactDOM from 'react-dom'
import React from 'react'
import { Compositor } from '../namespaces'
import Iframe from './components/Iframe'
import { Image } from './components/Image'
import CoreContext from '../context'
import { getProject } from '../data'

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
      const iframeRef = React.useRef<HTMLIFrameElement>(null)
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
          iframeRef.current.style.opacity = "1";
        }
      }
      return (
        <React.Fragment>
          {meta?.type === 'html-overlay' && (
            <Iframe
              url={src}
              frameBorder={0}
              iframeRef={iframeRef}
              height={height}
              width={width}
              onLoad={resizeIframe}
              styles={{ ...meta?.style , opacity : 0 }}
            />
          )}
          {meta?.type === 'image-overlay' && (
            <Image source={source} initialProps={initialProps} />
          )}
        </React.Fragment>
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
