/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { log } from '../context'
import { Compositor } from '../namespaces'

type Props = {
  tagName: keyof HTMLElementTagNameMap
  // e.g. Element.attribute.width
  attributes: { [name: string]: string }
  // e.g. Element.style / Element.textContent
  fields: { [name: string]: any }
}

export const Element = {
  name: 'Element',
  sourceType: 'Element',
  create({ onUpdate }, { tagName = 'div' }) {
    const el = document.createElement(tagName)

    onUpdate(({ tagName, attributes = {}, fields = {} }: Props) => {
      if (tagName === 'img') {
        if (el?.src !== attributes['src']) {
          Object.keys(attributes).forEach((attr) => {
            el.setAttribute(attr, attributes[attr])
          })
        }
      } else {
        Object.keys(attributes).forEach((attr) => {
          el.setAttribute(attr, attributes[attr])
        })
      }

      Object.keys(fields).forEach((field: keyof HTMLElement) => {
        try {
          if (typeof el[field] === 'object') {
            Object.assign(el[field], fields[field])
          } else {
            el[field] = fields[field]
          }
        } catch (e) {
          log.warn('Cannot assign field to element', { field })
        }
      })
    })

    return {
      root: el,
    }
  },
} as Compositor.Transform.TransformDeclaration
