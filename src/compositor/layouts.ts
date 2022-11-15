/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { DataNode, SceneNode } from './compositor'
import * as CSS from 'csstype'

// TODO: Make this generic to HTML/Canvas when canvas compositing is supported
type LayoutProps = Partial<DataNode['props']>

export type Transition = {
  /** ms or s */
  delay?: string
  /** ms or s */
  duration?: string
  offset?: { x: string | number; y: string | number }
  scale?: { x?: number; y?: number }
  opacity?: number
  timingFn?: CSS.StandardProperties['transitionTimingFunction'] | 'exit'
}

export type LayoutChild = HTMLElement & {
  data: ChildRenderPosition
}

export type LayoutArgs = {
  props: LayoutProps
  children: SceneNode[]
  size: { x: number; y: number }
}

export type ChildLayoutPosition = {
  position?: { x: string | number; y: string | number }
  size?: { x: string | number; y: string | number }
  opacity?: number
  borderRadius?: number
  zIndex?: number
  insertionTransition?: Transition
  removalTransition?: Transition
  entryTransition?: Transition
  exitTransition?: Transition
}

export type ChildRenderPosition = {
  /** The X/Y offset of the element's parent compared to the root node */
  globalOffset: { x: number; y: number }
  position: { x: number; y: number }
  size: { x: number; y: number }
  opacity: number
  borderRadius: number
  zIndex: number
  insertionTransition: Transition
  removalTransition: Transition
  entryTransition?: Transition
  exitTransition?: Transition
}
export type ChildRenderPositionIndex = {
  [nodeId: string]: ChildRenderPosition
}

export type LayoutResult = ChildRenderPositionIndex | HTMLElement

export type LayoutDefinition = ({
  props,
  children,
  size,
}: LayoutArgs) => LayoutResult

export type LayoutMap = {
  [name: string]: LayoutDeclaration
}

// Layouts might not be defined until runtime, so we can't provide a full list
export type LayoutName =
  | 'Grid'
  | 'Free'
  | 'Column'
  | 'Row'
  | 'Presentation'
  | 'Layered'
  | string

export type LayoutDeclaration = {
  name: LayoutName
  props?: any
  layout: LayoutDefinition
}

export type LayoutRegister = (
  declaration: LayoutDeclaration | LayoutDeclaration[],
) => void
