/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import ReactDOM from 'react-dom'
import React, { useEffect } from 'react'
import { Compositor } from '../namespaces'
import APIKitAnimation from '../../compositor/html/html-animation'
import { APIKitAnimationTypes } from '../../animation/core/types'
import { getProject } from '../data'
import CoreContext from '../context'

export type LogoProps = {
  src?: string
  type?: 'logo'
  // Opaque to the SDK
  [prop: string]: any
}

export type LogoSource = {
  id: string
  sourceProps: LogoProps
  sourceType: string
}

export const Logo = {
  name: 'LS-Logo',
  sourceType: 'Logo',
  create({ onUpdate }, { sourceProps }: { sourceProps: LogoProps }) {
    const root = document.createElement('div')

    const project = getProject(CoreContext.state.activeProjectId)
    const projectRoot = project.compositor.getRoot()

    /* Set the rootWidth to the width of the projectRoot. */
    const { x: rootWidth } = projectRoot.props.size
    const scalar = (rootWidth ?? 1280) / 1920
    const scale = (px: number) => px * scalar + 'px'

    const Logo = ({ source }: { source: LogoSource }) => {
      const { src, meta } = source?.sourceProps || {}
      const { id } = source || {}
      const [startAnimation, setStartAnimation] = React.useState(false)

      useEffect(() => {
        setStartAnimation(false)
      }, [id])

      const { offsetX = 40, offsetY = 40, height = 135, width = 240 } = props

      return (
        <APIKitAnimation
          type="logo"
          id={id}
          enter={APIKitAnimationTypes.FADE_IN}
          exit={APIKitAnimationTypes.FADE_OUT}
          duration={400}
        >
          <div
            style={{
              opacity: startAnimation ? 1 : 0,
              width: '100%',
              height: '100%',
            }}
            className={`logo-transition`}
          >
            {src && (
              <div
                className="logo wrapper"
                style={{
                  padding: `${scale(offsetY)} ${scale(offsetX)}`,
                }}
              >
                <img
                  style={{
                    height: '100%',
                    width: '100%',
                    maxHeight: height ? scale(height) : 'none',
                    maxWidth: width ? scale(width) : 'none',
                    ...sourceProps?.meta?.style,
                    ...meta?.style,
                  }}
                  src={src}
                  onLoad={() => setStartAnimation(true)}
                />
              </div>
            )}
          </div>
        </APIKitAnimation>
      )
    }

    const render = (source: LogoSource) =>
      ReactDOM.render(<Logo source={source} />, root)

    onUpdate((props) => {
      render({ ...props })
    })

    return {
      root,
    }
  },
} as Compositor.Transform.TransformDeclaration
