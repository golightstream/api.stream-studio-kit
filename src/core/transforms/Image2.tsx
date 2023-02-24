/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import ReactDOM from 'react-dom'
import React from 'react'
import { Compositor } from '../namespaces'
import APIKitAnimation from '../../compositor/html/html-animation'
import { APIKitAnimationTypes } from '../../animation/core/types'

export const Image2 = {
  name: 'LS-Image-2',
  sourceType: 'Image2',
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

    const Image = ({ source }: { source: any }) => {
      const { src, meta } = source?.value || {}
      const { id } = source || {}
      const [startAnimation, setStartAnimation] = React.useState(false)

      React.useEffect(() => {
        setStartAnimation(false)
      }, [id])

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
            {src && (
              <img
                style={{ ...initialProps?.style, ...meta?.style }}
                src={src}
                onLoad={() => setStartAnimation(true)}
              />
            )}
          </div>
        </APIKitAnimation>
      )
    }

    const render = () => ReactDOM.render(<Image source={source} />, root)

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
