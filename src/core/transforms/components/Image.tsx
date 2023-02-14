/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import React from 'react'
import APIKitAnimation from '../../../compositor/html/html-animation'
import { APIKitAnimationTypes } from '../../../animation/core/types'

export const Image = ({
  source,
  initialProps,
  setStartAnimation,
}: {
  source: any
  initialProps: any
  setStartAnimation: (value: boolean) => void
}) => {
  const { src, meta } = source?.value || {}
  const { id } = source || {}

  return (
    <React.Fragment>
      {src && (
        <img
          style={{ ...initialProps?.style, ...meta?.style }}
          className="image-transition"
          src={src}
          onLoad={() => setStartAnimation(true)}
        />
      )}
    </React.Fragment>
  )
}
