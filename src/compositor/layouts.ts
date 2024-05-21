/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { DataNode, SceneNode } from './compositor'
import type { LayoutProps } from '../core/layouts/index'
import * as CSS from 'csstype'

export { LayoutProps }

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

export type LayoutArgs<T extends Record<string, any> = {}> = {
  props: T
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

export type LayoutDefinition<T extends Record<string, any> = {}> = ({
  props,
  children,
  size,
}: LayoutArgs<T>) => LayoutResult

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

export type LayoutDeclaration<T extends Record<string, any> = {}> = {
  name: LayoutName
  props?: T
  layout: LayoutDefinition<T>
}

export type LayoutRegister<T extends Record<string, any> = {}> = (
  declaration: LayoutDeclaration<T> | LayoutDeclaration<T>[],
) => void
