/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { IframeProps } from '../../types'
import React from 'react'
import APIKitAnimation from '../../../compositor/html/html-animation'
import { APIKitAnimationTypes } from '../../../animation/core/types'

const Iframe = ({
  url,
  allowFullScreen,
  position,
  display,
  height,
  width,
  overflow,
  styles,
  onLoad,
  id,
  frameBorder,
  className,
  name,
  target,
  iframeRef,
  children,
  src,
}: IframeProps) => {
  const defaultProps = Object.assign({
    src: src || url,
    target: target || null,
    style: {
      position: position || null,
      display: display || 'block',
      overflow: overflow || null,
      ...styles,
    },
    name: name || null,
    className: className || null,
    id: id || null,
    onLoad: onLoad || null,
    height: height || '100%',
    width: width || '100%',
    allow: 'autoplay',
  })
  let props = Object.create(null)
  for (let prop of Object.keys(defaultProps)) {
    if (defaultProps[prop] != null) {
      props[prop] = defaultProps[prop]
    }
  }

  for (let i of Object.keys(props.style)) {
    if (props.style[i] == null) {
      delete props.style[i]
    }
  }

  if (allowFullScreen) {
    if ('allow' in props) {
      const currentAllow = props.allow.replace('fullscreen', '')
      props.allow = `fullscreen ${currentAllow.trim()}`.trim()
    } else {
      props.allow = 'fullscreen'
    }
  }

  if (frameBorder >= 0) {
    if (!props.style.hasOwnProperty('border')) {
      props.style.border = frameBorder
    }
  }
  return (
    <React.Fragment>
      {children ? (
        <iframe ref={iframeRef} {...props}>
          {children}
        </iframe>
      ) : (
        <iframe ref={iframeRef} {...props} />
      )}
    </React.Fragment>
  )
}

export default Iframe
