/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { Compositor, SDK } from '../namespaces'

type SourceDeclaration = Compositor.Source.SourceDeclaration

type Props = {
  headerText?: string
  bodyText?: string
  // Opaque to the SDK
  meta: {
    [prop: string]: any
  }
}

type Value = {
  headerText?: string
  bodyText?: string
}

export type Banner = {
  id: string
  props: Props
}

export type BannerSource = {
  id: string
  value: Value
  props: Props
}

export const Banner = {
  type: 'Banner',
  // valueType: Object,
  // TODO: Validate
  props: {},
  init({}) {
    return {
      onChange(value, props) {
        value.headerText = props.headerText
        value.bodyText = props.bodyText

        return {
          isActive: true,
          value,
        }
      },
      getValue(props) {
        const value = {
          headerText: props.headerText,
          bodyText: props.bodyText,
        }

        return {
          isActive: true,
          value,
        }
      },
    }
  },
} as Compositor.Source.SourceDeclaration<Props, Value>

export const Declaration = Banner
