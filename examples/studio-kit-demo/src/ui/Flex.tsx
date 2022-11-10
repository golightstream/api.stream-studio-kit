/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { CSSProperties } from 'react'

type SizeOrPercent = number | string
export type FlexProps = {
  key?: string | number
  // Push a child (and all following children) in a certain direction to the "end"
  push?: 'left' | 'right' | 'up' | 'down'
  // The axis along which a flex container will place its children
  direction?: 'row' | 'row-reverse' | 'column' | 'column-reverse'
  // Aligns children opposite to the axis of flex (e.g. controls vertical alignment when direction='row')
  align?: 'stretch' | 'flex-start' | 'flex-end' | 'center' | 'baseline'
  alignSelf?: 'stretch' | 'start' | 'end' | 'center' | 'flex-start' | 'flex-end'
  // Spaces children along the axis of flex
  justify?:
    | 'flex-start'
    | 'flex-end'
    | 'center'
    | 'space-around'
    | 'space-between'
    | 'space-evenly'
  // Sets the initial main size of a flex item (defaults to auto)
  basis?: SizeOrPercent
  // Specifies how much of the remaining space in the flex container should be assigned to the item
  grow?: CSSProperties['flexGrow']
  // Sets the flex shrink factor of a flex item. If the size of all flex items is larger than the flex container, items shrink to fit according to flex-shrink
  shrink?: CSSProperties['flexShrink']
  // Allows flex content to wrap to another line. You should consider each line as a new flex container.
  wrap?: boolean
  // Space between children
  gap?: number
  inline?: boolean
  // override style
  style?: CSSProperties
  dataId? : string | number
}

const PUSH_MAP = {
  left: { marginRight: 'auto' },
  right: { marginLeft: 'auto' },
  up: { marginBottom: 'auto' },
  down: { marginTop: 'auto' },
}

export const flexLayout = (props: FlexProps): CSSProperties =>
  Object.assign(
    {
      display: props.inline ? 'inline-flex' : 'flex',
      flexDirection: props.direction || 'row',
      flexBasis: props.basis || 'auto',
      alignItems: props.align || 'flex-start',
      justifyContent: props.justify || 'auto',
      gap: props.gap || 0,
      flexGrow: props.grow || 0,
      flexShrink: props.shrink || 0,
      flexWrap: (props.wrap ? 'wrap' : 'nowrap') as CSSProperties['flexWrap'],
      ...(props.alignSelf && { alignSelf: props.alignSelf || 'auto' }),
    },
    push(props),
  )

const push = (props: FlexProps) => (props.push ? PUSH_MAP[props.push] : {})
