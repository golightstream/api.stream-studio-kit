/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import React, { CSSProperties } from 'react'
import * as IconMap from './icon-map'
import * as Color from './colors'

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

type Props = {
  // An icon will inherit its container's color unless specified
  color?: Color.Type
  colorWeight?: number

  width?: number | string
  height?: number | string

  marginLeft?: number
  marginTop?: number
  marginBottom?: number
  marginRight?: number
  nudgeUp?: number
  nudgeDown?: number
  nudgeLeft?: number
  nudgeRight?: number
}

const SVGWrapper = ({
  children,
  width,
  height,
  color,
  colorWeight = 0,
  marginLeft,
  marginTop,
  marginRight,
  marginBottom,
  ...props
}: Props & { children: JSX.Element }) => {
  let colorStyle = 'inherit'
  if (color) {
    colorStyle = Color[color](colorWeight)
  }

  return (
    <div
      style={{
        ...nudge(props),
        display: 'flex',
        justifyContent: 'center',
        flexBasis: width || 'auto',
        flexShrink: 0,
        width: width || '1em',
        height: height || (width ? 'fit-content' : '1em'),
        fill: 'currentColor',
        color: colorStyle,
        marginLeft,
        marginTop,
        marginBottom,
        marginRight
      }}
    >
      {children}
    </div>
  )
}

type IconProps = Props & { name: IconName }
const Icon = ({ name, ...props }: IconProps) => {
  return <SVGWrapper {...props}>{IconMap[name]}</SVGWrapper>
}

type SVGProps = Props & { svg: JSX.Element }
const SVG = ({ svg, ...props }: SVGProps) => {
  return <SVGWrapper {...props}>{svg}</SVGWrapper>
}

export { SVGWrapper, Icon, SVG }
export default Icon
