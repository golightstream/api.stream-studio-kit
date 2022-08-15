/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import React from 'react'
import { CSSTransition, SwitchTransition } from 'react-transition-group'
import { Direction } from '../../animation/core'
import { Animations } from '../../animation'

export interface AnimationProps {
  id: string
  type: string
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
    type,
  } = props

  const keyId = id ? `${type}-${id}` : `${type}-api-kit-animation`

  return (
    <div
      style={{
        height: '100%',
        width: '100%',
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: renderStyle(type, enter, exit, duration, direction),
        }}
      />
      <SwitchTransition mode={'out-in'}>
        <CSSTransition
          key={keyId}
          addEndListener={(node: HTMLElement, done: any) => {
            node.addEventListener('transitionend', done, false)
          }}
          classNames={{
            enter: `${type}-default-enter`,
            enterActive: enter,
            exit: `${type}-default-leave`,
            exitActive: exit,
          }}
          timeout={duration}
        >
          <div
            style={{
              height: '100%',
              width: '100%',
            }}
          >
            {children}
          </div>
        </CSSTransition>
      </SwitchTransition>
    </div>
  )
}

const renderStyle = (
  type: string,
  enter: keyof typeof Animations,
  exit: keyof typeof Animations,
  duration: number,
  direction: Direction,
) => {
  return `
        body {
          margin: 0;
          padding: 0;
        }
        
        ${Animations[enter]}
        
        ${Animations[exit]}

        .${type}-transition {
          transition: opacity ${duration}ms ease-out};
        }

        .${type}-default-enter {
          opacity: 0;
        }

        .${type}-default-enter.${enter} {
          animation-direction: ${direction};
          animation-duration: ${duration / 1000}s;
          animation-fill-mode: both;
          animation-timing-function: ease-out;
        }

        .${type}-default-leave {
          opacity: 1;
        }

        .${type}-default-leave.${exit} {
          animation-direction: ${direction};
          animation-duration: ${duration / 1000}s;
          animation-timing-function: ease-out;
          animation-fill-mode: both;
        }
        `
}

export default APIKitAnimation
