/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import ReactDOM from 'react-dom'
import React from 'react'
import { Compositor } from '../namespaces'
import APIKitAnimation from '../../compositor/html/html-animation'
import { APIKitAnimationTypes } from '../../animation/core/types'

export const Logo = {
  name: 'LS-Logo',
  sourceType: 'Logo',
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

    const Logo = ({ source }: { source: any }) => {
      const { src, meta, logoPosition } = source?.value || {}
      const { id } = source || {}

      return (
        <APIKitAnimation
          type="logo"
          id={id}
          enter={APIKitAnimationTypes.FADE_IN}
          exit={APIKitAnimationTypes.FADE_OUT}
          duration={400}
        >
          {src && (
            <div className="logo wrapper">
              <img
                style={{ ...initialProps?.style, ...meta?.style }}
                src={src}
              />
            </div>
          )}
        </APIKitAnimation>
      )
    }

    const render = () => ReactDOM.render(<Logo source={source} />, root)

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

export const Declaration = Logo