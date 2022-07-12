/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { Compositor } from '../namespaces'

type Props = {
  id: string

  tagName: keyof HTMLElementTagNameMap
  // e.g. Element.attribute.width
  attributes: { [name: string]: string }

  sourceProps: { [name: string]: string }
  // e.g. Element.style / Element.textContent
  fields: { [name: string]: any }
}

export const Video = {
  name: 'LS-Video',
  sourceType: 'LS-Video',
  create({ onUpdate, trigger, onEvent, onRemove }) {
    onRemove(() => {
      clearInterval(interval)
    })

    const el = document.createElement('video')

    let interval: NodeJS.Timer

    onUpdate(
      ({ attributes = {}, fields = {}, sourceProps = {}, id }: Props) => {
        if (
          el.src !== attributes['src'] ||
          (el.id !== attributes['id'] && attributes['id'])
        ) {
          if (interval) {
            clearInterval(interval)
          }

          Object.keys(attributes).forEach((attr) => {
            el.setAttribute(attr, attributes[attr])
          })

          el.onloadedmetadata = () => {
            if (attributes['muted']) {
              el.muted = true
              el.play()
            } else {
              el.muted = false
            }
          }

          interval = setInterval(() => {
            if (el.duration) {
              const timePending = el.duration - el.currentTime
              trigger('VideoTimeUpdate', {
                category: id,
                id: sourceProps?.id,
                time: Math.floor(timePending),
              })
            }
          }, 1000)

          el.loop = Boolean(attributes['loop'])

          el.onended = () => {
            if (interval) {
              clearInterval(interval)
            }
            trigger('VideoEnded', { id: sourceProps?.id, category: id })
          }

          Object.keys(fields).forEach((field) => {
            Object.assign(el[field as keyof HTMLElement], fields[field])
          })
        }
      },
    )

    return {
      root: el,
    }
  },
} as Compositor.Transform.TransformDeclaration
