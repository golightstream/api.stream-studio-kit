/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { Compositor } from '../namespaces'

export const Image = {
  name: 'LS-Image',
  props: {
    src: {},
    fit: {},
  },
  create({ onUpdate }) {
    const el = document.createElement('img')

    onUpdate(({ src, fit }) => {
      el.setAttribute('src', src)
      Object.assign(el.style, {
        width: '100%',
        height: '100%',
        objectFit: fit,
      })
    })

    return {
      root: el,
    }
  },
} as Compositor.Transform.TransformDeclaration
