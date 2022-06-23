/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { CoreContext } from '../core/context'
import { asArray, pick } from '../logic'
import type { PropsDefinition, CompositorInstance } from './compositor'

type SourceMethods = Pick<
  CompositorInstance,
  | 'getSource'
  | 'removeSource'
  | 'updateSource'
  | 'setSourceActive'
  | 'triggerEvent'
> & { addSource: (source: NewSource) => void }

export type SourceDeclaration = {
  /** The type to declare support for (e.g. 'MediaStreamVideo') */
  type: string
  /** 
   * The value-type constructor of a Source (e.g. MediaStream) 
   *  Used for run-time validation.
   * 
   * This is an approximation of the actual type 
   *  definition of Source.value
  */
  valueType: any
  /** The properties associated with an individual Source */
  props?: PropsDefinition
  init?: (methods: SourceMethods) => void
}

export type Source = {
  id: string
  // TODO: Determine if sources should be referenced by name or type
  name?: string // 'rtmp' | 'image' | 'webcam' | 'audio-clip' | 'text' | ...
  type: string // 'MediaStreamVideo' | 'HLSMedia' | 'DOMVideo' | 'DOMImage' | ...
  /** Indicates whether a source is ready to be rendered to the page */
  isActive: boolean
  /** Properties matching the schema supplied to SourceDeclaration for this Source type */
  props: { [prop: string]: any }
  value: any // MediaStreamTrack | Image | String | ...
}

export type NewSource = {
  id: string
  value: any
  isActive?: boolean
  props: { [prop: string]: any }
}

export type SourceMap = {
  [type: string]: SourceDeclaration
}
export const sourceTypes = {} as SourceMap

export const registerSource = (
  declaration: SourceDeclaration | SourceDeclaration[],
) => {
  asArray(declaration).forEach((x) => {
    // TODO: Validation / ensure type isn't already registered
    // TODO: Dispose of existing sources if a new one is registered with the same type
    x.init?.({
      ...pick(CoreContext.compositor, [
        'getSource',
        'removeSource',
        'updateSource',
        'setSourceActive',
        'setSourceInactive',
        'triggerEvent',
      ]),
      addSource: (source: NewSource) =>
        CoreContext.compositor.addSource(x.type, source),
    } as SourceMethods)
    sourceTypes[x.type] = x
  })
}
