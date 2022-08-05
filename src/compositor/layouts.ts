/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { DataNode, SceneNode } from './compositor'
import * as CSS from 'csstype'

// TODO: Make this generic to HTML/Canvas when canvas compositing is supported
type LayoutProps = Partial<DataNode['props']>

// A string representation of percent/px (e.g. 100px/10%), or a number (px)
type Size = { x: string | number; y: string | number }
// A string representation of percent/px (e.g. 100px/10%), or a number (px)
type Position = { x: string | number; y: string | number }
// Any valid CSS duration unit (ms/s, etc)
type Duration = string | number

type Transition = {
  delay?: Duration
  offset?: Position
  scale?: { x?: number; y?: number }
  opacity?: number
  timingFn?: CSS.StandardProperties['transitionTimingFunction'] | 'exit'
}

export type LayoutChild = HTMLElement & {
  data: ChildPosition
}

export type LayoutArgs = {
  props: LayoutProps
  children: SceneNode[]
  size: { x: number; y: number }
}

export type ChildPosition = {
  position: Position
  size: Size
  opacity: number
  borderRadius: number
  zIndex: number
  entryTransition: Transition
  exitTransition: Transition
  // The child node's current offset from the topmost Layer
  rootOffset?: { x: number; y: number }
}

export type ChildPositionIndex = {
  [nodeId: string]: ChildPosition
}

export type LayoutResult = ChildPositionIndex | HTMLElement

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
