/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import React from 'react'
import APIKitAnimation from '../../../compositor/html/html-animation'
import { APIKitAnimationTypes } from '../../../animation/core/types'

export const Image = ({ source, initialProps }: { source: any; initialProps : any }) => {
  const { src, meta } = source?.value || {}
  const { id } = source || {}

  return (
    <APIKitAnimation
      id={id}
      type="image"
      enter={APIKitAnimationTypes.FADE_IN}
      exit={APIKitAnimationTypes.FADE_OUT}
      duration={400}
    >
      {src && (
        <img
          style={{ ...initialProps?.style, ...meta?.style }}
          className="image-transition"
          src={src}
        />
      )}
    </APIKitAnimation>
  )
}

