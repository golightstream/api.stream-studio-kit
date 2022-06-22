/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { Compositor } from '../namespaces'

type Props = {
  tagName: keyof HTMLElementTagNameMap
  // e.g. Element.attribute.width
  attributes: { [name: string]: string }
  // e.g. Element.style / Element.textContent
  fields: { [name: string]: any }
}

export const Video = {
  name: 'LS-Video',
  sourceType: 'LS-Video',
  create({ onUpdate }) {
    const el = document.createElement('video')

    onUpdate(({ attributes = {}, fields = {} }: Props) => {
      Object.keys(attributes).forEach((attr) => {
        el.setAttribute(attr, attributes[attr])
      })
      if (attributes['muted']) {
        el.onloadedmetadata = () => {
          el.muted = true
          el.play()
        }
      }

      el.loop = Boolean(attributes['loop'])

      Object.keys(fields).forEach((field) => {
        Object.assign(el[field as keyof HTMLElement], fields[field])
      })
    })

    return {
      root: el,
    }
  },
} as Compositor.Transform.TransformDeclaration
