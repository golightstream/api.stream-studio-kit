import { trigger } from './../events'
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

let interval: NodeJS.Timer

export const Video = {
  name: 'LS-Video',
  sourceType: 'LS-Video',
  create({ onUpdate, trigger }) {
    const el = document.createElement('video')

    if (interval) {
      clearInterval(interval)
    }

    onUpdate(
      
      ({ attributes = {}, fields = {}, sourceProps = {}, id }: Props) => {

        if (interval) {
          clearInterval(interval)
        }

        Object.keys(attributes).forEach((attr) => {
          el.setAttribute(attr, attributes[attr])
        })
        
        if (attributes['muted']) {
          el.onloadedmetadata = () => {
            el.muted = true
            el.play()
          }
        }

        el.onended = () => {
          if(interval) {
            clearInterval(interval)
          }
          trigger('VideoEnded', { id: sourceProps.id, category: id })
        }

        if (attributes['src']) {
      
          interval = setInterval(() => {
            if (el.duration) {
              const timePending = el.duration - el.currentTime
              trigger('VideoTimeUpdate', {
                category: id,
                id: sourceProps.id,
                time: Math.floor(timePending),
              })
            }
          }, 1000)
        }

        el.loop = Boolean(attributes['loop'])

        Object.keys(fields).forEach((field) => {
          Object.assign(el[field as keyof HTMLElement], fields[field])
        })
      },
    )

    return {
      root: el,
    }
  },
} as Compositor.Transform.TransformDeclaration
