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

export const Element = {
  name: 'Element',
  sourceType: 'Element',
  create({ onUpdate }, { tagName }) {
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

      Object.keys(fields).forEach((field) => {
        Object.assign(el[field as keyof HTMLElement], fields[field])
      })
    })

    return {
      root: el,
    }
  },
} as Compositor.Transform.TransformDeclaration

export const Declaration = Element
