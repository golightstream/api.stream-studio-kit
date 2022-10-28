/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { trigger } from '../events'
import { Compositor } from '../namespaces'
import { VideoSource } from '../sources/Video'

type Props = {
  // e.g. Element.style / Element.textContent
  loop?: boolean
  muted?: boolean
  volume?: number
  fit?: 'cover' | 'contain' | 'stretch'
}

export const Video = {
  name: 'LS-Video',
  sourceType: 'Video',
  create({ onUpdate, onNewSource, onRemove }) {
    const el = document.createElement('video')
    el.autoplay = true
    Object.assign(el.style, {
      width: '100%',
      height: '100%',
    })

    onNewSource((source) => {
      el.src = source.props.src
    })

    onUpdate(({ fit = 'cover', loop = false, muted = false, volume = 1 }) => {
      Object.assign(el.style, {
        objectFit: fit,
      })
      el.loop = loop
      el.muted = muted
      el.volume = volume
    })

    return {
      root: el,
    }
  },
} as Compositor.Transform.TransformDeclaration<VideoSource, Props>

export const Declaration = Video
