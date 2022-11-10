/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import React, {
  ReactNode,
  MouseEvent,
  CSSProperties,
  FocusEventHandler,
  KeyboardEventHandler,
  Component,
  DragEvent,
} from 'react'
import { flexLayout, FlexProps as FlexProperties } from './Flex'

export type BoxProps = {
  children?: ReactNode
  onClick?: MouseEventHandler
  onDoubleClick?: MouseEventHandler
  onMouseDown?: MouseEventHandler
  onMouseEnter?: MouseEventHandler
  onMouseLeave?: MouseEventHandler
  onFocus?: FocusEventHandler
  onBlur?: FocusEventHandler
  onKeyDown?: KeyboardEventHandler
  tabIndex?: number | string
  ref?: any
  forwardedRef?: any
  dataId? : string | number

  //
  // Aliases for common CSS layout properties.
  //

  position?: 'relative' | 'static'
  visibility?: 'visible' | 'hidden'
  overflow?: 'hidden'
  color?: string
  opacity?: number
  lineHeight?: number | string
  fontSize?: number

  height?: string | number
  minHeight?: string | number
  maxHeight?: string | number

  width?: string | number
  minWidth?: string | number
  maxWidth?: string | number

  padding?: number
  paddingTop?: number
  paddingBottom?: number
  paddingRight?: number
  paddingLeft?: number

  margin?: keyof Margin | number
  marginTop?: keyof Margin | number
  marginBottom?: keyof Margin | number
  marginRight?: keyof Margin | number
  marginLeft?: keyof Margin | number

  //
  // Aliases for custom layout properties.
  //

  // If provided this function is called with the current `props` value and the result is merged
  // into the final set of layout styles provided to the element. Use this for creating Box types
  // with customized layout behavior (such as Flex or Grid).
  layout?: (props: any) => CSSProperties

  // Applies the provided padding or margin value to both the left and right edges of the element.
  paddingX?: number
  marginX?: keyof Margin | number

  // Applies the provided padding or margin value to both the top and bottom edges of the element.
  paddingY?: number
  marginY?: keyof Margin | number
} & Partial<typeof defaultProps>

export interface DragAndDropProps extends BoxProps {
  onDragStart?: DragEventHandler
  onDragOver?: DragEventHandler
  onDragEnd?: DragEventHandler
  draggable?: string
}

const defaultProps = {
  tag: 'div' as keyof HTMLElementTagNameMap,
  name: 'Box' as string,
  className: '' as string,
  style: {} as CSSProperties,
}

type MouseEventHandler = (e: MouseEvent<HTMLElement>) => void
type DragEventHandler = (e: DragEvent<HTMLElement>) => void
type Size = 'none' | 'small' | 'medium' | 'large' | 'huge'

/**
 * The Box component is a basic tool for quickly creating style-agnostic layouts. This is meant to
 * enable a pattern where all layout-oriented styles are defined in Javascript and all aesthetic
 * qualities (colors, fonts, etc) are expressed in CSS. The inspiration for this pattern is graphics
 * pipelines such as OpenGL which separate between an object mesh (the layout/shape) and its visual
 * appearance (how the mesh is painted, reacts to light, etc).
 */

//
// Standardized aliases for various common margin sizes. These can be used in place of pixel values
// for any margin property.
//
// { style: { marginLeft: 'medium' } } === { style: { marginLeft: 8 } }
//
type Margin = { [size in Size]: number }
const MARGIN_SIZE: Margin = {
  none: 0,
  small: 4,
  medium: 8,
  large: 18,
  huge: 28,
}
const getMargin = (value: keyof Margin | number) => {
  if (typeof value === 'number') {
    return value
  } else {
    return MARGIN_SIZE[value]
  }
}

class DragAndDrop extends Component<DragAndDropProps> {
  static defaultProps = defaultProps

  render() {
    const { props } = this
    return React.createElement(
      props.tag,
      {
        className: props.className,
        onClick: this.props.onClick,
        onDoubleClick: this.props.onDoubleClick,
        onMouseEnter: this.props.onMouseEnter,
        onMouseLeave: this.props.onMouseLeave,
        onMouseDown: this.props.onMouseDown,
        onKeyDown: props.onKeyDown,
        style: style(props),
        tabIndex: props.tabIndex,
        onFocus: props.onFocus,
        onBlur: props.onBlur,
        ref: props.ref || props.forwardedRef,
        onDragEnd: props.onDragEnd,
        onDragStart: props.onDragStart,
        onDragOver: props.onDragOver,
        draggable: props.draggable,
        'data-id': props.dataId
      },
      props.children,
    ) as any
  }
}

class Box extends Component<BoxProps> {
  static defaultProps = defaultProps

  render() {
    const { props } = this
    return React.createElement(
      props.tag,
      {
        className: props.className,
        onClick: this.props.onClick,
        onDoubleClick: this.props.onDoubleClick,
        onMouseEnter: this.props.onMouseEnter,
        onMouseLeave: this.props.onMouseLeave,
        onMouseDown: this.props.onMouseDown,
        onKeyDown: props.onKeyDown,
        style: style(props),
        tabIndex: props.tabIndex,
        onFocus: props.onFocus,
        onBlur: props.onBlur,
        ref: props.ref || props.forwardedRef,
        'data-id' : props.dataId
      },
      
      props.children,
    ) as any
  }
}

/**
 * Layout and style compilation.
 */

//
// Maps the current props to the current value of the `style` property used to create the element.
// All custom CSS aliases are resolved here.
//
const style = (props: BoxProps): CSSProperties =>
  Object.assign(
    {
      height: props.height,
      minHeight: props.minHeight,
      maxHeight: props.maxHeight,

      width: props.width,
      minWidth: props.minWidth,
      maxWidth: props.maxWidth,

      fontSize: props.fontSize,
      overflow: props.overflow,
      opacity: props.opacity,
      color: props.color,
      lineHeight: props.lineHeight,
      position: props.position,
      visibility: props.visibility,
    },
    margin(props),
    padding(props),
    props.layout ? props.layout(props) : {},
    props.style,
  )

const margin = (props: BoxProps): CSSProperties => {
  if (props.margin) return { margin: getMargin(props.margin) }

  return {
    marginTop: getMargin(props.marginY || props.marginTop),
    marginBottom: getMargin(props.marginY || props.marginBottom),
    marginRight: getMargin(props.marginX || props.marginRight),
    marginLeft: getMargin(props.marginX || props.marginLeft),
  }
}

const padding = (props: BoxProps): CSSProperties => {
  if (props.padding) return { padding: props.padding }

  return {
    paddingTop: props.paddingY || props.paddingTop,
    paddingBottom: props.paddingY || props.paddingBottom,
    paddingRight: props.paddingX || props.paddingRight,
    paddingLeft: props.paddingX || props.paddingLeft,
  }
}

export type FlexProps = FlexProperties & BoxProps
const Flex = (props: FlexProps) => <Box {...props} layout={flexLayout} />

const Row = (props: FlexProps) => (
  <Flex align="center" {...props} direction="row" />
)

const Column = (props: FlexProps) => <Flex {...props} direction="column" />

export { Flex, Row, Column , DragAndDrop }

export default Box
