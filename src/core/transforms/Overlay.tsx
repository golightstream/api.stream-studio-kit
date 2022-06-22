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
  create({ onUpdate }) {
    const el = document.createElement('iframe')

    onUpdate(({ url }) => {
      el.setAttribute('src', url)
      Object.assign(el.style, {
        width: '100%',
        height: '100%',
      })
    })

    return {
      root: el,
    }
  },
} as Compositor.Transform.TransformDeclaration
