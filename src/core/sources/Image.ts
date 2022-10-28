/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { Source } from '../../compositor/sources'
import { Compositor, SDK } from '../namespaces'

type Props = {
  src?: string
  meta?: { [prop: string]: any }
}

type Value = HTMLImageElement

export const ImageSource = {
  type: 'Image',
  // valueType: HTMLImageElement,
  // TODO: Validate
  props: {},
  init({ on }) {
    return {
      onChange(value, props) {
        value.src = props.src
        return {
          isActive: true,
          value,
        }
      },
      getValue(props) {
        const image = new Image()
        image.src = props.src

        return {
          isActive: true,
          value: image,
        }
      },
    }
  },
} as Compositor.Source.SourceDeclaration<Props, Value>

export const Declaration = ImageSource

export type ImageSource = Source<Props, Value>
