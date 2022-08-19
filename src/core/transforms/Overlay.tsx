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
const PADDING = 0

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
      const { src, meta } = source?.value || {}
      const iframeRef = React.useRef<HTMLIFrameElement>(null)
      const resizeIframe = () => {
        if (iframeRef.current) {
          const project = getProject(CoreContext.state.activeProjectId)
          const root = project.compositor.getRoot()
          const { x: rootWidth, y: rootHeight } = root.props.size
          let { width, height } = iframeRef.current.getBoundingClientRect()
          const containerRatio = width / height
          const compositorRatio = rootWidth / rootHeight

          let scale
          if (width && height) {
            if (compositorRatio > containerRatio) {
              // If compositor ratio is higher, width is the constraint
              scale = width / (rootWidth + PADDING * 2)
            } else if (compositorRatio < containerRatio) {
              // If compositor ratio is lower, height is the constraint
              scale = height / (rootHeight + PADDING * 2)
            } else {
              // If compositor ratio is equal, width is the constraint
              scale = height / (rootHeight + PADDING * 2)
            }
          }

          iframeRef.current.style.willChange = `transform`
          // @ts-ignore
          iframeRef.current.style.minWidth = '1920px';
          iframeRef.current.style.minHeight = '1080px';
          iframeRef.current.style.transformOrigin = '0 0'
          iframeRef.current.style.transform = `scale(${scale}) translateZ(0)`
        }
      }
      return (
        <React.Fragment>
          {meta?.type === 'html-overlay' && (
            <Iframe
              url={src}
              frameBorder={0}
              iframeRef={iframeRef}
              // onLoad={resizeIframe}
              styles={{ ...initialProps.style,  ...meta?.style }}
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
