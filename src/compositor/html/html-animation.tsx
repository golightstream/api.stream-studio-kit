/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import React from 'react'
import { CSSTransition, TransitionGroup } from 'react-transition-group'
import { Direction } from '../../animation/core'
import { Animations } from '../../animation'

export interface AnimationProps {
  id: string
  enter: keyof typeof Animations
  exit: keyof typeof Animations
  children: React.ReactNode
  style?: React.CSSProperties
  delay?: string
  hover?: boolean
  viewport?: boolean
  disabled?: boolean
  tag?: string
  className?: string
  onClick?: Function
  direction?: Direction
  iterationCount?: number
  duration?: number
}

const APIKitAnimation: React.FC<AnimationProps> = (props: AnimationProps) => {
  const {
    enter,
    exit,
    children,
    tag = 'div',
    direction = 'normal',
    duration = 500,
    id,
  } = props

  return (
    <div>
      <style
        dangerouslySetInnerHTML={{
          __html: renderStyle(enter, exit, duration, direction),
        }}
      />
      <TransitionGroup>
        <CSSTransition
          key={id}
          classNames={{
            enter: 'default-enter',
            enterActive: enter,
            exit: 'default-leave',
            exitActive: exit,
          }}
          timeout={duration}
        >
          {children ? children : <span />}
        </CSSTransition>
      </TransitionGroup>
    </div>
  )
}

const renderStyle = (
  enter: keyof typeof Animations,
  exit: keyof typeof Animations,
  duration: number,
  direction: Direction,
) => {
  return `
         
        ${Animations[enter]}
        
        ${Animations[exit]}

        .default-enter {
          opacity: 0;
          position: absolute;
        }

        .default-enter.${enter} {
          animation-direction: ${direction};
          animation-duration: ${duration / 1000}s;
          animation-fill-mode: both;
          animation-timing-function: ease-out;
          opacity: 1;
        }

        .default-leave {
          opacity: 1;
        }

        .default-leave.${exit} {
          animation-direction: ${direction};
          animation-duration: ${duration / 1000}s;
          animation-timing-function: ease-out;
          animation-fill-mode: both;
        }
        `
}

export default APIKitAnimation
