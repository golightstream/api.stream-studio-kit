/* --------------------------------------------------------------------------------------------- 
 * Copyright (c) Infiniscene, Inc. All rights reserved. 
 * Licensed under the MIT License. See License.txt in the project root for license information. 
 * -------------------------------------------------------------------------------------------- */
import * as CSS from 'csstype'
import { DataNode, SceneNode } from '../index'
import {
  asArray,
  getElementAttributes,
  asSize,
  asDuration,
  sizeToNum,
} from '../../logic'
import { log } from '../../core/context'

// A string representation of percent/px (e.g. 100px/10%), or a number (px)
type Size = { x: string | number; y: string | number }
// A string representation of percent/px (e.g. 100px/10%), or a number (px)
type Position = { x: string | number; y: string | number }
// Any valid CSS duration unit (ms/s, etc)
type Duration = string | number

type ChildPosition = {
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
type ChildPositionIndex = {
  [nodeId: string]: ChildPosition
}
type Transition = {
  delay?: Duration
  offset?: Position
  scale?: { x?: number; y?: number }
  opacity?: number
  timingFn?: CSS.StandardProperties['transitionTimingFunction'] | 'exit'
}
export type TransitionInfo = {
  entry: Transition
  exit: Transition
}
type LayoutChild = HTMLElement & {
  data: TransitionInfo & {
    borderRadius: number
    dimensions: number
    fit: 'contain' | 'cover'
  }
}
type LayoutProps = Partial<DataNode['props']>
export type LayoutArgs = {
  props: LayoutProps
  children: SceneNode[]
  size: { x: number; y: number }
}
type LayoutResult = ChildPositionIndex | HTMLElement

const TRANSITION_DURATION = 300

// For safety, rely on instanceof check rather than element name
//  i.e. Use this instead of `x.closest('ls-layout')`
const findLayoutUp = (
  start: HTMLElement,
  comparator?: (el: HTMLElement) => boolean,
  failedAttempts = 0,
): null | Layout => {
  const MAX_FAILED_TRAVERSAL_DEPTH = 4
  const parent = start.parentElement
  if (parent instanceof Layout) {
    // Reset failed attempts to find Layout
    failedAttempts = 0
    if (!comparator) return parent // Found any layout
    if (comparator(parent)) return parent // Found layout meeting criteria
  }
  if (parent) {
    // Increment failed attempt count to guard against entire document traversal
    if (failedAttempts > MAX_FAILED_TRAVERSAL_DEPTH) return null
    return findLayoutUp(parent, comparator, failedAttempts + 1)
  }
  return null
}

const TRANSITION_FIELDS = 'opacity, transform, width, height'

// Index of layouts elements themselves
const layoutIndex = {} as {
  [id: string]: Layout
}
const parentIdIndex = {} as {
  [id: string]: string
}
const childIndex = {} as {
  [id: string]: ChildEl
}

let rootLayout: Layout
const get = (id: string): Layout => {
  return layoutIndex[id]
}
const getParent = (id: string): Layout => {
  return layoutIndex[parentIdIndex[id]]
}

let _cid = 1
const ignoredAttributes = ['style', 'id', 'className']

type Op =
  | [type: 'sizeChanged', layoutId: string]
  | [type: 'attributesChanged', layoutId: string]
  | [type: 'childInserted', layoutId: string, childId: string]
  | [type: 'childRemoved', layoutId: string, childId: string]
  | [type: 'childRemoveFinished', layoutId: string, childId: string]
  | [type: 'childAttributesChanged', layoutId: string, childId: string]

// Operations queued for next tick
let tickOps = {} as {
  [layoutId: string]: Op[]
}
const tick = () => {
  nextTick = null
  // @ts-ignore
  if (window.__dragging) {
    nextTick = nextTick || requestAnimationFrame(tick)
    return
  }
  const inserted = new Set<string>()
  const removed = new Set<string>()
  const removeFinished = new Set<string>()

  Object.entries(tickOps).forEach(([layoutId, ops]) => {
    ops.forEach(([type, layoutId, childId]) => {
      switch (type) {
        case 'childInserted': {
          if (removed.has(childId)) {
            removed.delete(childId)
          } else {
            inserted.add(childId)
          }
          break
        }
        case 'childRemoved': {
          if (inserted.has(childId)) {
            inserted.delete(childId)
          } else {
            removed.add(childId)
          }
          break
        }
        case 'childRemoveFinished': {
          removeFinished.add(childId)
          break
        }
      }
    })
  })

  try {
    removed.forEach((x) => {
      const el = childIndex[x]
      // Short-circuit the deletion so we can run remove manually (for transition)
      if (el.nextSiblingEl) {
        el.parentEl?.insertBefore(el, el.nextSiblingEl)
      } else {
        el.parentEl?.append(el)
      }
      el.runRemove()
    })
    removeFinished.forEach((x) => {
      const el = childIndex[x]
      if (el.removed) {
        // This node has finally been removed (exit transition has completed)
        if (el.previousSiblingEl) {
          // @ts-ignore
          el.previousSiblingEl.nextSiblingEl = el.nextSiblingEl
        }
        if (el.nextSiblingEl) {
          // @ts-ignore
          el.nextSiblingEl.previousSiblingEl = el.previousSiblingEl
        }
        return
      }
    })

    // @ts-ignore
    const scale = window.__scale

    Object.entries(tickOps).forEach(([layoutId, ops]) => {
      const layoutEl = layoutIndex[layoutId]
      const rect = layoutEl.getBoundingClientRect()
      const size = {
        x: rect.width / scale,
        y: rect.height / scale,
      }
      layoutEl.updatePositions({
        size,
        inserted,
        removed,
      })
    })
  } catch (e) {
    log.warn('Failed to run Layout ops', e)
  }

  tickOps = {}
}

let nextTick: number
const queueOp = (op: Op) => {
  const [_, nodeId] = op
  const nodeOps = tickOps[nodeId] || []
  tickOps[nodeId] = [...nodeOps, op]
  nextTick = nextTick || requestAnimationFrame(tick)
}

export class Layout extends HTMLElement {
  parentEl: HTMLElement
  slotEl: HTMLElement
  parentLayout: Layout
  nodes: SceneNode[]
  mutationObserver: MutationObserver
  latestSize: { x: number; y: number }
  isFirst: boolean = true
  isUpdating: boolean = false
  cid: number

  constructor() {
    super()
    this.cid = ++_cid
  }

  log(...args: any[]) {
    log.debug(
      ...args,
      {
        id: this.dataset.id,
        parent: this.parentLayout?.dataset.id,
      },
      this,
    )
  }

  connectedCallback() {
    // TODO: Validate (disconnect element if invalid)
    this.parentEl = this.parentElement
    this.parentLayout = findLayoutUp(this)
    this.slotEl = this.closest(`[data-layout-child]`)

    Array.from(this.children).forEach((x) => this.initializeChild(x))

    // TODO: Improve this logic
    if (!rootLayout) rootLayout = this

    // Update indexes
    layoutIndex[this.dataset.id] = this
    parentIdIndex[this.dataset.id] = this.parentLayout?.id

    Object.assign(this.style, {
      width: '100%',
      height: '100%',
      position: 'absolute',
      top: '0px',
      left: '0px',
      pointerEvents: 'none',
      boxSizing: 'border-box',
    })

    // Listen for child add/remove and re-run layout
    //  Also listen for attribute changes
    if (this.mutationObserver) this.mutationObserver.disconnect()
    this.mutationObserver = new MutationObserver((mutations) => {
      if (!this.isConnected) return
      mutations.forEach((x) => {
        if (
          x.type === 'attributes' &&
          !ignoredAttributes.includes(x.attributeName)
        ) {
          queueOp(['attributesChanged', this.dataset.id])
        } else if (x.type === 'childList') {
          x.addedNodes.forEach((child: ChildEl) => {
            const inMemory = childIndex[child.dataset.id]
            if (child.removed) return
            if (!inMemory) {
              this.initializeChild(child)
            } else if (inMemory !== child) {
              this.initializeChild(child)
              child.setAttribute('style', inMemory.getAttribute('style'))
              child.data = inMemory.data
            }
            queueOp(['childInserted', this.dataset.id, child.dataset.id])
          })
          x.removedNodes.forEach((child: ChildEl) => {
            if (child.removed) return
            queueOp(['childRemoved', this.dataset.id, child.dataset.id])
          })
        }
      })
    })
    this.mutationObserver.observe(this, { childList: true, attributes: true })

    if (!this.latestSize) {
      queueOp(['attributesChanged', this.dataset.id])
    }
  }

  disconnectedCallback() {
    // Rules of this method (native API):
    // - When a node is disconnected, its children nodes also become disconnected
    // - A child node will still have the same "parentElement" when the above occurs
  }

  adoptedCallback() {}

  updatePositions(options: {
    size?: { x: number; y: number }
    inserted?: Set<string>
    removed?: Set<string>
  }) {
    if (this.isUpdating) return
    this.isUpdating = true
    const { size, inserted = new Set(), removed = new Set() } = options

    //  Iterate and turn the immediate children into nodes as SceneNode[]
    this.nodes = Array.from(this.children || []).map((x: HTMLElement, i) => {
      const props = getElementAttributes(x)

      return {
        // TODO: Does this work well enough? Think through keying
        id: x.dataset.id,
        props,
        children: [],
      }
    })

    const props = JSON.parse(this.getAttribute('props') || '{}')
    this.latestSize = size

    const layoutArgs = {
      id: this.dataset.id,
      props: props,
      children: this.nodes,
      size,
    }
    let positions = layoutChildren(layoutArgs)

    Promise.all(
      Object.entries(positions).map(async ([id, childPosition]) => {
        const {
          size,
          position,
          zIndex = 1,
          opacity = 1,
          borderRadius = 0,
          entryTransition = {},
          exitTransition = {},
        } = childPosition
        let childEl =
          childIndex[id] ||
          (this.querySelector(
            `[data-layout-child][data-id="${id}"]`,
          ) as ChildEl)

        if (childEl) {
          if (childEl.removed) return
          if (exitTransition) childEl.data.exitTransition = exitTransition
          if (entryTransition) childEl.data.entryTransition = entryTransition

          childEl.data.size = size
          childEl.data.position = position

          // Set shared styles and reset transform
          Object.assign(childEl.style, {
            top: 0,
            left: 0,
            position: 'absolute',
            transformOrigin: '50% 50%',
            transitionDuration: '0ms',
            transitionDelay: '0ms',
            visibility: 'visible',
            boxSizing: 'border-box',
            overflow: 'hidden',
            borderRadius: borderRadius + 'px',
          } as CSS.StandardProperties)

          let delay = '0ms'
          let duration = this.isFirst
            ? asDuration(0)
            : asDuration(TRANSITION_DURATION)

          const withEntry = inserted.has(id)
          if (withEntry) {
            // Run the entry animation by moving the node to its entry position
            Object.assign(childEl.style, {
              transitionProperty: TRANSITION_FIELDS,
              transitionDuration: '0ms',
              transitionTimingFunction: entryTransition.timingFn ?? 'ease',
              transform: `translate3d(calc(${asSize(position?.x)} + ${asSize(
                entryTransition.offset?.x ?? 0,
              )}), calc(${asSize(position?.y)} + ${asSize(
                entryTransition.offset?.y ?? 0,
              )}), 0) scaleX(${entryTransition.scale?.x ?? 1}) scaleY(${
                entryTransition.scale?.y ?? 1
              })`,
              opacity: entryTransition.opacity ?? opacity,
              width: size?.x,
              height: size?.y,
            } as CSS.StandardProperties)
            delay = asDuration(entryTransition.delay ?? 0)
          } else if (childEl.data.rootOffset) {
            // Use a node's global offset to ensure smooth transitions even when
            //  moving from one parent layout to another
            const rootPosition = rootLayout.getBoundingClientRect()
            const parentPosition = this.getBoundingClientRect()

            // @ts-ignore
            const scale = window.__scale

            const parentOffset = {
              x: parentPosition.x / scale - rootPosition.x / scale,
              y: parentPosition.y / scale - rootPosition.y / scale,
            }
            const newOffset = {
              x: childEl.data.rootOffset.x - parentOffset.x,
              y: childEl.data.rootOffset.y - parentOffset.y,
            }

            childEl.style.transform = `translate3d(${asSize(
              newOffset.x,
            )}, ${asSize(newOffset.y)}, 0) scaleX(1) scaleY(1)`
          }

          // Set final styles
          await new Promise((resolve) => window.setTimeout(resolve)) // Defer for layout
          Object.assign(childEl.style, {
            transitionProperty: TRANSITION_FIELDS,
            transitionDuration: duration,
            transitionDelay: delay,
            transform: `translate3d(${asSize(position?.x)}, ${asSize(
              position?.y,
            )}, 0) scaleX(1) scaleY(1)`,
            opacity,
            width: size?.x,
            height: size?.y,
            zIndex,
          } as CSS.StandardProperties)

          // @ts-ignore
          const scale = window.__scale

          const updateRootOffset = () => {
            const rootPosition = rootLayout.getBoundingClientRect()
            const globalPosition = childEl.getBoundingClientRect()
            childEl.data.rootOffset = {
              x: globalPosition.x / scale - rootPosition.x / scale,
              y: globalPosition.y / scale - rootPosition.y / scale,
            }
          }
          updateRootOffset()

          childEl.addEventListener('transitionend', () => {
            updateRootOffset()
          })
        }
      }),
    ).then(() => {
      this.isUpdating = false
    })
    this.isFirst = false

    // TODO: Remove dependence on ls-layout
    Array.from(this.querySelectorAll('ls-layout')).forEach((x: Layout) => {
      if (!positions[x.dataset.id]) return
      const childSize = positions[x.dataset.id].size
      x.updatePositions({
        size: {
          x: sizeToNum(childSize.x, size.x),
          y: sizeToNum(childSize.y, size.y),
        },
      })
    })
  }

  initializeChild(childEl: Partial<ChildEl>) {
    if (!childEl.dataset?.id)
      return log.warn(
        'Layout: Child requires `data-id` at the time it is added to a Layout',
      )

    if (!childEl.mutationObserver) {
      childEl.mutationObserver = new MutationObserver((mutations) => {
        mutations.forEach((x) => {
          if (x.type === 'attributes') {
            if (x.attributeName === 'style') return
            queueOp([
              'childAttributesChanged',
              this.dataset.id,
              childEl.dataset.id,
            ])
          }
        })
      })
      childEl.mutationObserver.observe(childEl as HTMLElement, {
        childList: true,
        attributes: true,
      })
    }

    const data = {
      entryTransition: {
        delay: 0,
        opacity: 0,
        scale: {
          x: 1,
          y: 1,
        },
        offset: {
          x: 0,
          y: 0,
        },
      },
      exitTransition: {
        delay: 0,
        opacity: 0,
        scale: {
          x: 1,
          y: 1,
        },
        offset: {
          x: 0,
          y: 0,
        },
      },
      position: { x: 0, y: 0 },
      size: { x: 0, y: 0 },
      opacity: 0,
      fit: 'cover',
      borderRadius: 0,
      zIndex: 1,
    } as ChildPosition

    childEl.data = data
    childEl.parentEl = childEl.parentElement
    childEl.nextSiblingEl = childEl.nextSibling
    childEl.previousSiblingEl = childEl.previousSibling
    if (childEl.previousSiblingEl) {
      // @ts-ignore
      childEl.previousSiblingEl.nextSiblingEl = childEl
    }
    childEl.toggleAttribute('data-layout-child', true)
    childIndex[childEl.dataset.id] = childEl as ChildEl

    // Set a custom remove method to run the node's exit transition
    childEl.runRemove = async () => {
      childEl.removed = true
      const duration = TRANSITION_DURATION
      await new Promise((resolve) => window.setTimeout(resolve)) // Defer for layout

      // Run the exit animation by moving the node to its exit position
      Object.assign(childEl.style, {
        zIndex: 0,
        transitionDelay: asDuration(0),
        transitionDuration: asDuration(duration),
        transitionProperty: TRANSITION_FIELDS,
        transitionTimingFunction: data.exitTransition.timingFn ?? 'ease',
        transform: `translate3d(calc(${asSize(data.position?.x)} + ${asSize(
          data.exitTransition.offset?.x ?? 0,
        )}), calc(${asSize(data.position?.y)} + ${asSize(
          data.exitTransition.offset?.y ?? 0,
        )}), 0) scaleX(${data.exitTransition.scale?.x ?? 1}) scaleY(${
          data.exitTransition.scale?.y ?? 1
        })`,
        opacity: data.exitTransition.opacity ?? 0,
      } as CSS.StandardProperties)

      childEl.removed = true
      childEl.transition = new Promise<void>((resolve) => {
        const onFinished = () => {
          childEl.transition = null
          childEl.remove()
          queueOp(['childRemoveFinished', this.dataset.id, childEl.dataset.id])
          clearTimeout(timeout)
          resolve()
        }
        // If for one of various reasons the 'transitionend' event does not
        //  fire, remove the element after a timeout with plenty of buffer.
        // TODO: Gracefully convert string transition durations to Number(ms)
        const timeout = window.setTimeout(
          onFinished,
          parseInt(String(duration)) + 600,
        )
        childEl.addEventListener('transitionend', onFinished, {
          once: true,
        })
      })
      return childEl.transition
    }
  }
}

export const ensureLayoutContainer = (size: { x: number; y: number }) => {
  const existing = document.getElementById('__ls-layout-container')
  if (existing) {
    Object.assign(existing.style, {
      width: size.x + 'px',
      height: size.y + 'px',
    })
    return existing
  }

  const container = document.createElement('div')
  container.id = '__ls-layout-container'
  Object.assign(container.style, {
    position: 'fixed',
    // pointerEvents: 'none',
    visibility: 'hidden',
    top: 0 + 'px',
    left: 0 + 'px',
    zIndex: -1,
    width: size.x + 'px',
    height: size.y + 'px',
  })
  document.body.append(container)
  return container
}

type ChildEl = HTMLElement & {
  runRemove: () => Promise<void>
  parentEl: HTMLElement
  previousSiblingEl: ChildNode
  nextSiblingEl: ChildNode
  removed: boolean
  transition?: Promise<void>
  dataset: { id: string }
  data: ChildPosition
  mutationObserver?: MutationObserver
}

export const layoutChildren = ({
  id,
  props = {},
  children,
  size,
}: LayoutArgs & { id: string }): ChildPositionIndex => {
  const layoutArgs = {
    props,
    children,
    size,
  }
  const result = htmlLayouts[props.layout]
    ? htmlLayouts[props.layout].layout(layoutArgs)
    : htmlLayouts.Free.layout(layoutArgs)

  if (!(result instanceof HTMLElement)) {
    // Already formatted - return the child positions
    return result
  }

  const domChildren = Array.from(
    result.querySelectorAll('[data-node-id]'),
  ) as HTMLElement[]

  const wrapper = document.createElement('div')
  // @ts-ignore
  wrapper.style.height = result.style.height = size.y + 'px'
  // @ts-ignore
  wrapper.style.width = result.style.width = size.x + 'px'
  wrapper.style.position = 'absolute'
  wrapper.style.top = '0px'
  wrapper.style.left = '0px'
  wrapper.style.boxSizing = 'border-box'
  wrapper.setAttribute('data-wrapper-id', id)
  wrapper.append(result)

  const layoutContainer = ensureLayoutContainer(size)
  const previousDom = layoutContainer.querySelector(`[data-wrapper-id="${id}"]`)

  if (previousDom) {
    previousDom.replaceWith(wrapper)
  } else {
    layoutContainer.append(wrapper)
  }

  const parentRect = result.getBoundingClientRect()
  const positions = {} as ChildPositionIndex

  domChildren.forEach((el: LayoutChild) => {
    const id = el.dataset.nodeId
    if (!id) return

    const opacity = Number(el.dataset.opacity ?? (el.style.opacity || 1))

    const rect = el.getBoundingClientRect()
    let newPosition = {
      position: {
        x: rect.x - parentRect.x + 'px',
        y: rect.y - parentRect.y + 'px',
      },
      size: {
        x: rect.width + 'px',
        y: rect.height + 'px',
      },
      zIndex: 1,
      opacity,
      entryTransition: el.data?.entry ?? {},
      exitTransition: el.data?.exit ?? {},
      borderRadius: el.data?.borderRadius ?? 0,
    } as ChildPosition

    if (`${props.showcase}-x` === id) {
      newPosition.position = {
        x: parentRect.x + 'px',
        y: parentRect.y + 'px',
      }
      newPosition.size = {
        x: parentRect.width + 'px',
        y: parentRect.height + 'px',
      }
      newPosition.zIndex = 2
    }

    positions[id] = newPosition

    // Position is calculated as offset from parent
    positionIndex[el.dataset.nodeId] = newPosition
  })

  return positions
}

export type LayoutDefinition = ({
  props,
  children,
  size,
}: LayoutArgs) => LayoutResult
export type LayoutMap = {
  [name: string]: LayoutDeclaration
}
export type LayoutName =
  | 'Grid'
  | 'Free'
  | 'Column'
  | 'Row'
  | 'Presentation'
  | 'Layered'
export type LayoutDeclaration = {
  name: LayoutName
  props?: any
  layout: LayoutDefinition
}

// A global index of all nodes and their dynamic positional data
const positionIndex = {} as ChildPositionIndex
const finalPositionIndex = {} as ChildPositionIndex

export const htmlLayouts = {} as LayoutMap

export const registerLayout = (
  declaration: LayoutDeclaration | LayoutDeclaration[],
) => {
  asArray(declaration).forEach((x) => {
    // TODO: Validation
    htmlLayouts[x.name] = x
  })
}
