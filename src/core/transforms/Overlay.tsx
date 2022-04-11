/* --------------------------------------------------------------------------------------------- 
 * Copyright (c) Infiniscene, Inc. All rights reserved. 
 * Licensed under the MIT License. See License.txt in the project root for license information. 
 * -------------------------------------------------------------------------------------------- */
import { Compositor } from '../namespaces'

export const Overlay = {
  name: 'LS-Overlay',
  props: {
    url: {},
  },
  create() {
    const el = document.createElement('iframe')

    return {
      root: el,
      onUpdate({ url }) {
        el.setAttribute('src', url)
        Object.assign(el.style, {
          width: '100%',
          height: '100%',
        })
      },
    }
  },
} as Compositor.Transform.TransformDeclaration
