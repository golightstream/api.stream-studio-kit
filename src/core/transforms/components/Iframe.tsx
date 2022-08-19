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
  onMouseOver,
  onMouseOut,
  scrolling,
  id,
  frameBorder,
  ariaHidden,
  sandbox,
  allow,
  className,
  title,
  ariaLabel,
  ariaLabelledby,
  name,
  target,
  loading,
  importance,
  referrerPolicy,
  allowpaymentrequest,
  allowtransparency,
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
    scrolling: scrolling || null,
    allowpaymentrequest: allowpaymentrequest || null,
    allowtransparency: allowtransparency || null,
    importance: importance || null,
    sandbox: sandbox || null,
    loading: loading || null,
    name: name || null,
    className: className || null,
    referrerPolicy: referrerPolicy || null,
    title: title || null,
    allow: allow || null,
    id: id || null,
    'aria-labelledby': ariaLabelledby || null,
    'aria-hidden': ariaHidden || null,
    'aria-label': ariaLabel || null,
    onLoad: onLoad || null,
    onMouseOver: onMouseOver || null,
    onMouseOut: onMouseOut || null,
    height : height || '100%',
    width : width || '100%',
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
    <APIKitAnimation
      id={id}
      type="image"
      enter={APIKitAnimationTypes.FADE_IN}
      exit={APIKitAnimationTypes.FADE_OUT}
      duration={400}
    >
      {children ? (
        <iframe ref={iframeRef} {...props}>
          {children}
        </iframe>
      ) : (
        <iframe ref={iframeRef} {...props} />
      )}
    </APIKitAnimation>
  )
}

export default Iframe
