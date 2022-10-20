/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { Compositor } from '../namespaces'

export const Square = {
  name: 'LS-Square',
  props: {
    color: {
      default: 'green',
    },
  },
  create({ onUpdate }) {
    const el = document.createElement('div')

    onUpdate(({ color }) => {
      Object.assign(el.style, {
        width: '100%',
        height: '100%',
        background: color || 'red',
      })
    })

    return {
      root: el,
    }
  },
} as Compositor.Transform.TransformDeclaration

export const Declaration = Square