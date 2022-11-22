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
    const root = document.createElement('div')
    let el = document.createElement(tagName || 'div') as HTMLElement
    root.append(el)

    Object.assign(el.style, {
      width: '100%',
      height: '100%',
      // Random background color
      background: '#' + Math.floor(Math.random() * 16777215).toString(16),
    })

    onUpdate(({ tagName, attributes = {}, fields = {} }: Props) => {
      if (tagName && el?.tagName.toLowerCase() !== tagName?.toLowerCase()) {
        el.remove()
        el = document.createElement(tagName || 'div')
        root.append(el)
        Object.assign(el.style, {
          width: '100%',
          height: '100%',
          // Random background color
          background: '#' + Math.floor(Math.random() * 16777215).toString(16),
        })
      }

      Object.keys(attributes).forEach((attr) => {
        el.setAttribute(attr, attributes[attr])
      })

      Object.keys(fields).forEach((field) => {
        Object.assign(el[field as keyof HTMLElement], fields[field])
      })
    })

    return {
      root,
    }
  },
} as Compositor.Transform.TransformDeclaration<null, Props>

export const Declaration = Element
