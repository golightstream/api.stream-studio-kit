/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import ReactDOM, { createPortal } from 'react-dom'
import ReactDOMServer from 'react-dom/server'
import React from 'react'
import { Compositor } from '../namespaces'
import Iframe from './components/Iframe'
import { Image } from './components/Image'

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

      return (
        <React.Fragment>
          {meta?.type === 'html-overlay' && (
            <Iframe
              url={src}
              frameBorder={0}
              iframeRef={iframeRef}
              styles={{ ...initialProps?.style, ...meta?.style }}
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
