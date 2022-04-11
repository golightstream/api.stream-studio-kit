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
  create() {
    const el = document.createElement('img')

    return {
      root: el,
      onUpdate({ src, fit }) {
        el.setAttribute('src', src)
        Object.assign(el.style, {
          width: '100%',
          height: '100%',
          objectFit: fit,
        })
      },
    }
  },
} as Compositor.Transform.TransformDeclaration
