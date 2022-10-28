/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { Compositor } from '../namespaces'
import { ImageSource } from '../sources/Image'

type Props = {
  fit: 'cover' | 'contain' | 'stretch'
}

export const Image = {
  name: 'LS-Image',
  sourceType: 'Image',
  props: {
    src: {},
    fit: {},
  },
  create({ onUpdate, onNewSource }) {
    const el = document.createElement('img')
    Object.assign(el.style, {
      width: '100%',
      height: '100%',
    })

    onNewSource((source) => {
      el.setAttribute('src', source.props.src)
    })

    onUpdate(({ fit }) => {
      Object.assign(el.style, {
        objectFit: fit,
      })
    })

    return {
      root: el,
    }
  },
} as Compositor.Transform.TransformDeclaration<ImageSource, Props>

export const Declaration = Image

const x = {} as ImageSource
