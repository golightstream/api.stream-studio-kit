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
    sourceType : 'LS-Video',
    create() {
        const el = document.createElement('video')
        return {
            root: el,
            onUpdate({ attributes = {}, fields = {}  }: Props) {
                Object.keys(attributes).forEach((attr) => {
                    el.setAttribute(attr, attributes[attr])
                })
                if(attributes["muted"]) {
                    el.onloadedmetadata = () => {
                        el.muted = true;
                        el.play()
                    }
                }
                Object.keys(fields).forEach((field) => {
                    Object.assign(el[field as keyof HTMLElement], fields[field])
                })
            },
        }
    },
} as Compositor.Transform.TransformDeclaration
