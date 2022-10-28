/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { InternalEventMap } from '../core/events'
import { Disposable, Room } from '../core/types'
import type { NodeId, PropsDefinition, SceneNode } from './compositor'
import type { Source } from './sources'

// TODO: Make this generic to HTML/Canvas when canvas compositing is supported

export type TransformDeclaration<S extends Source = Source, Props = {}> = {
  name: string
  sourceType?: string // TODO: keyof SourceType
  useSource?: (sources: S[], nodeProps: Props & SceneNode['props']) => S
  tagName?: string
  props?: PropsDefinition
  create?: (
    context: TransformContext<S, Props>,
    initialProps: Props,
  ) => TransformElementBase
}

export type TransformElementBase = {
  root: HTMLElement
}

export type TransformElement = TransformElementBase & {
  role: string
  nodeId: string
  sourceType: string
  proxySource: string
  transformName: string
  // The source currently in use by the element
  source?: Source
  sourceValue?: any
  _onNewSourceHandlers: Function[]
  _onUpdateHandlers: Function[]
  _onRemoveHandlers: Function[]
  // Disposable event listeners associated with this element
  _disposables: Disposable[]
}

export type TransformMap = {
  [name: string]: TransformDeclaration<Source>
}
export type DefaultTransformMap = {
  [sourceType: string]: TransformDeclaration<Source>['name']
}

export type TransformSettings = {
  defaultTransforms?: DefaultTransformMap
}

export type TransformRegister = (
  declaration: TransformDeclaration<Source> | TransformDeclaration<Source>[],
) => void

export type TransformElementGetter = (node: SceneNode) => TransformElement

export type TransformContext<S extends Source, Props = {}> = {
  /** Listens for all events emitted by the compositor */
  onEvent?: (
    event: string,
    cb: (payload: any) => void,
    nodeId?: string,
  ) => Disposable
  /** Called anytime the Source value returned by useSource is different */
  onNewSource?: (cb: (source: S) => void) => void
  /** Called anytime the Source value itself has been modified */
  // onSourceModified?: (cb: (source: S) => void) => void
  /** Called anytime the Node associated with the element has been updated */
  onUpdate?: (cb: (nodeProps: Props) => void) => void
  /** Called when the Node associated with the element has been removed */
  onRemove?: (cb: (nodeProps: Props) => void) => void
}
