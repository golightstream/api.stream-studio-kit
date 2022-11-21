import React, { CSSProperties } from 'react'
import { Flex } from '../ui/Box'
import * as IconMap from './icons'

export type IconName = keyof typeof IconMap

const nudge = (props: Partial<IconProps>): CSSProperties => {
  if (
    !(props.nudgeUp || props.nudgeDown || props.nudgeRight || props.nudgeLeft)
  )
    return

  return {
    position: 'relative',
    top: props.nudgeDown,
    left: props.nudgeRight,
    right: props.nudgeLeft,
    bottom: props.nudgeUp,
  }
}

type IconProps = {
  name: IconName

  width?: number | string
  height?: number | string

  nudgeUp?: number
  nudgeDown?: number
  nudgeLeft?: number
  nudgeRight?: number

  color?: string
}

const Icon = ({ name, width, height, color, ...props }: IconProps) => {
  return (
    <Flex
      style={{
        ...nudge(props),
        display: 'flex',
        flexBasis: width || 'auto',
        flexShrink: 0,
        width: width || '1em',
        height: height || (width ? 'fit-content' : '1em'),
        fill: 'currentColor',
        color: color || 'white',
      }}
    >
      {IconMap[name]}
    </Flex>
  )
}

export default Icon
