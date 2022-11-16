/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
/**
 * Layouts exist to dynamically update the positioning of a node's children
 * on the stream canvas.
 *
 * Layouts are handled by use of a custom HTMLElement (tagname <ls-layout>).
 * Through the use of a MutationObserver, this element will listen to changes
 * in its children or properties and then determine the new child positions.
 *
 * Every Layout has a name (e.g. Presentation) that corresponds to a function that
 * will return an array of child positions based on a few factors - namely, the
 * number of children and the properties assigned to the layout.
 *
 * Layout properties are logically equivalent to props passed into a React component.
 * As soon as a change is detected to a Layout's children or properties,
 * the Layout will invoke the Layout function to receive an array of child positions. The role of a layout function is to render HTML to an offscreen renderer, whose element positions will be read as DOMRects and mapped to absolute positions inside the layout.
 *
 * With the updated absolute positions, the Layout element will next
 * attempt to smoothly transition any child elements to their new positions.
 *
 * Note: A Layout function may also return a simple array of nodes and
 * their positions, foregoing the offscreen render altogether.
 */
import * as CSS from 'csstype'
import { DataNode, Disposable, SceneNode } from '../index'
import {
  asArray,
  asDuration,
  sizeToNum,
  forEachDown,
  mapDown,
} from '../../logic'
import { log } from '../../core/context'
import {
  ChildRenderPosition,
  ChildRenderPositionIndex,
  LayoutChild,
  LayoutMap,
  LayoutRegister,
  Transition,
} from '../layouts'

const TRANSITION_DURATION = '300ms'
const DEFAULT_TRANSITION = {
  delay: '0ms',
  duration: TRANSITION_DURATION,
  offset: { x: '0px', y: '0px' },
  scale: { x: 0.7, y: 0.7 },
  opacity: 0,
  timingFn: 'ease',
} as Transition

type LayoutTree = { id: string; layout: Layout; children: LayoutTree[] }

const TRANSITION_FIELDS =
  'opacity, transform, width, height, left, right, top, bottom, inset'

/** Index of layouts elements themselves */
const layoutIndex = {} as {
  [id: string]: LayoutTree
}
/** Index of layouts to their parent layoutId */
const parentIdIndex = {} as {
  [id: string]: string
}
/** Index of children to their layoutId */
const childLayoutIdIndex = {} as {
  [id: string]: string
}
/** Index of the roots of all layouts. Generally there will be only one root. */
const treeRootIndex = {} as {
  [id: string]: LayoutTree
}
/** Index of all child elements by ID */
const childIndex = {} as {
  [id: string]: ChildEl
}

const get = (id: string): LayoutTree => {
  return layoutIndex[id]
}
const getParent = (id: string): LayoutTree => {
  return layoutIndex[parentIdIndex[id]]
}

let _cid = 1
const ignoredAttributes = ['style', 'id', 'className']
const previousFrameDisposables = {} as {
  [treeId: string]: { [layoutId: string]: Disposable[] }
}

type Op =
  | [type: 'sizeChanged', layoutId: string]
  | [type: 'attributesChanged', layoutId: string]
  | [type: 'layoutTransitionsFinished', layoutId: string]
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
  const moved = new Set<string>()
  const removeFinished = new Set<string>()

  // TODO: Remove if these Sets are no longer required
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
          moved.add(childId)
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
      const childList = Array.from(el.parentLayout?.children || [])

      // Short-circuit the deletion so we can run remove manually (for transition)
      if (el.nextSiblingEl && childList.includes(el.nextSiblingEl as Element)) {
        el.parentLayout?.insertBefore(el, el.nextSiblingEl)
      } else {
        el.nextSiblingEl = null
        el.parentLayout?.append(el)
      }
      el.runRemove()
    })
    removeFinished.forEach((x) => {
      const el = childIndex[x]
      if (el.removed) {
        // This node has finally been removed (exit transition has completed)
        if (el.previousSiblingEl) {
          el.previousSiblingEl.nextSiblingEl = el.nextSiblingEl
        }
        if (el.nextSiblingEl) {
          el.nextSiblingEl.previousSiblingEl = el.previousSiblingEl
        }
        return
      }
    })

    const needsUpdate = new Set<LayoutTree>()
    Object.entries(tickOps).forEach(([layoutId, ops]) => {
      const layoutEl = treeRootIndex[layoutId]
      needsUpdate.add(layoutEl)
    })
    needsUpdate.forEach((x) => {
      x.layout.render()
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
  /** The element containing this Layout. Same as `parentElement`, except it maintains reference after node removal */
  parentEl: HTMLElement
  /** The closest parent Layout */
  parentLayout: Layout
  /** The layout type used for this Layout last frame (e.g. "Grid") */
  previousLayoutType: string
  nodes: SceneNode[]
  mutationObserver: MutationObserver
  isFirst: boolean = true
  isUpdating: boolean = false
  connected: boolean = false
  cid: number

  constructor() {
    super()
    this.cid = ++_cid
  }

  log(...args: any[]) {
    log.debug(
      ...args,
      {
        id: this.id,
        parent: this.parentLayout?.id,
      },
      this,
    )
  }

  connectedCallback() {
    // TODO: Validate (disconnect element if invalid)
    
    // Assign helper variables
    this.id = this.id || this.dataset.id
    this.parentEl = this.parentElement
    this.parentLayout = findElementUp(this, (el) => el instanceof Layout)

    // Update indexes
    const tree = layoutIndex[this.id] || {
      id: this.id,
      layout: this,
      children: [],
    } as LayoutTree
    layoutIndex[this.id] = tree

    if (this.parentLayout) {
      treeRootIndex[this.id] = treeRootIndex[this.parentLayout.id]
      parentIdIndex[this.id] = this.parentLayout.id
      layoutIndex[this.parentLayout.id].children = [
        ...layoutIndex[this.parentLayout.id].children,
        tree,
      ]
    } else {
      treeRootIndex[this.id] = layoutIndex[this.id]
    }

    // Do nothing more if previously connected
    if (this.connected) return
    this.connected = true

    this.log('Layout connected', { parent: this.parentLayout })

    Array.from(this.children).forEach((x) => this.initializeChild(x as ChildEl))

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
          queueOp(['attributesChanged', this.id])
        } else if (x.type === 'childList') {
          x.addedNodes.forEach((child: ChildEl) => {
            child.id = child.id || child.dataset.id
            const inMemory = childIndex[child.id]
            if (child.removed) return
            if (!inMemory) {
              this.initializeChild(child)
            } else if (inMemory !== child) {
              this.initializeChild(child)
              child.setAttribute('style', inMemory.getAttribute('style'))
              child.data = inMemory.data
            }
            queueOp(['childInserted', this.id, child.id])
          })
          x.removedNodes.forEach((child: ChildEl) => {
            if (child.removed) return
            queueOp(['childRemoved', this.id, child.id])
          })
        }
      })
    })
    this.mutationObserver.observe(this, { childList: true, attributes: true })

    if (!this.parentLayout) window.setTimeout(() => this.render())
  }

  disconnectedCallback() {
    // Rules of this method (native API):
    // - When a node is disconnected, its children nodes also become disconnected
    // - A child node will still have the same "parentElement" when the above occurs
    layoutIndex[this.parentLayout.id].children = layoutIndex[
      this.parentLayout.id
    ].children.filter((x) => x.id !== this.id)
  }

  adoptedCallback() {}

  updatePositions(layoutSize: { x: number; y: number }, treeId?: string) {
    if (this.isUpdating) return
    this.isUpdating = true

    // Clean up previous render (transition listeners, etc.)
    const previousDisposables = previousFrameDisposables[treeId][this.id] || []
    previousDisposables.forEach((x) => x())
    const disposables = (previousFrameDisposables[treeId][this.id] =
      [] as Disposable[])

    const props = this.getProps()
    const layoutType = props.layout
    const withEntry =
      (this.previousLayoutType !== layoutType && props.withEntry) ||
      layoutIndex[treeId].layout.isFirst
    this.previousLayoutType = this.getProps().layout

    Object.assign(this.style, {
      overflow: this.id === treeId ? 'hidden' : props.overflow || 'visible',
    })

    treeId = treeId || treeRootIndex[this.id].id
    let positions = latestChildPositions[treeId][this.id]

    Promise.all(
      Object.entries(positions).map(async ([id, childPosition]) => {
        let childEl =
          childIndex[id] ||
          (this.querySelector(
            `[data-layout-child][data-id="${id}"]`,
          ) as ChildEl)

        const data = { ...childEl.data, ...childPosition }
        childEl.data = data

        let {
          size,
          position,
          zIndex = 1,
          opacity = 1,
          borderRadius = 0,
          entryTransition,
          insertionTransition,
          globalOffset,
        } = data

        if (childEl) {
          if (childEl.removed) return

          const scaledParentSize = {
            x: layoutSize.x,
            y: layoutSize.y,
          }

          const childRight = scaledParentSize.x - position.x - size.x
          const childBottom = scaledParentSize.y - position.y - size.y

          // Set shared styles and reset transform
          Object.assign(childEl.style, {
            willChange: TRANSITION_FIELDS,
            position: 'absolute',
            transformOrigin: '50% 50%',
            transitionDuration: '0ms',
            transitionDelay: '0ms',
            transform: `translate3d(0, 0, 0) scaleX(1) scaleY(1)`,
            visibility: 'visible',
            boxSizing: 'border-box',
            borderRadius: borderRadius + 'px',
            width: 'auto',
            height: 'auto',
          } as CSS.StandardProperties)

          let transition = DEFAULT_TRANSITION

          if (withEntry && entryTransition) {
            transition = { ...transition, ...entryTransition }
            // Run the entry animation by moving the node to its entry position
            Object.assign(childEl.style, {
              transitionProperty: TRANSITION_FIELDS,
              transitionDuration: '0ms',
              transitionDelay: '0ms',
              transitionTimingFunction: transition.timingFn,
              transform: `translate3d(${transition.offset?.x}, ${transition.offset.y}, 0) scaleX(${transition.scale?.x}) scaleY(${transition.scale.y})`,
              opacity: transition.opacity,
              left: position.x + 'px' || 0,
              top: position.y + 'px' || 0,
              right: childRight + 'px' || 0,
              bottom: childBottom + 'px' || 0,
            })
          } else if (childEl.newlyAdded) {
            const previousPosition =
              previousChildPositions[treeId][childEl.previousLayoutId]?.[
                childEl.id
              ]

            if (childEl.previousLayoutId && previousPosition) {
              // Use a node's previous global offset and position to
              //  ensure smooth transitions even when
              //  moving from one parent layout to another
              const delta = {
                top:
                  previousPosition.globalOffset.y -
                  globalOffset.y +
                  (previousPosition.position.y - position.y),
                left:
                  previousPosition.globalOffset.x -
                  globalOffset.x +
                  (previousPosition.position.x - position.x),
                height: previousPosition.size.y - size.y,
                width: previousPosition.size.x - size.x,
              }

              const left = position.x + delta.left
              const right = childRight - delta.left - delta.width

              const top = position.y + delta.top
              const bottom = childBottom - delta.top - delta.height

              Object.assign(childEl.style, {
                left: left + 'px',
                top: top + 'px',
                right: right + 'px',
                bottom: bottom + 'px',
              })
            } else {
              transition = insertionTransition
              // Run the entry animation by moving the node to its entry position
              Object.assign(childEl.style, {
                transitionProperty: TRANSITION_FIELDS,
                transitionDuration: '0ms',
                transitionDelay: '0ms',
                transitionTimingFunction: insertionTransition.timingFn,
                transform: `translate3d(${insertionTransition.offset?.x}, ${insertionTransition.offset.y}, 0) scaleX(${insertionTransition.scale.x}) scaleY(${insertionTransition.scale.y})`,
                opacity: insertionTransition.opacity,
                left: position.x + 'px' || 0,
                top: position.y + 'px' || 0,
                right: childRight + 'px' || 0,
                bottom: childBottom + 'px' || 0,
              })
            }
          } else {
            // TODO: Extract these to a helper applyTransition()
            Object.assign(childEl.style, {
              transitionProperty: TRANSITION_FIELDS,
              transitionDuration: DEFAULT_TRANSITION.duration,
              transitionTimingFunction: DEFAULT_TRANSITION.timingFn,
              opacity: DEFAULT_TRANSITION.opacity,
            })
          }
          childEl.newlyAdded = false

          const onTransitionStart = (e: Event) => {
            if (e.target !== childEl) return
            // Move layer up when transitioning to ensure
            //  it moves over the top of static layers
            if (!childEl.removed) {
              childEl.style.zIndex = String(zIndex + 1)
            }
          }
          childEl.addEventListener('transitionstart', onTransitionStart)
          disposables.push(() =>
            childEl.removeEventListener('transitionstart', onTransitionStart),
          )

          // Set final styles along with the actual transition timing
          await new Promise((resolve) => window.setTimeout(resolve)) // Defer for layout
          Object.assign(childEl.style, {
            transitionProperty: TRANSITION_FIELDS,
            transitionDuration: transition.duration,
            transitionDelay: transition.delay,
            transform: `translate3d(0, 0, 0) scaleX(1) scaleY(1)`,
            opacity,
            left: position.x + 'px' || 0,
            top: position.y + 'px' || 0,
            right: childRight + 'px' || 0,
            bottom: childBottom + 'px' || 0,
            zIndex,
          })

          const onTransitionEnd = (e: Event) => {
            if (e.target !== childEl) return
            childEl.style.zIndex = String(zIndex)
            childEl.removeEventListener('transitionend', onTransitionEnd)
          }
          childEl.addEventListener('transitionend', onTransitionEnd)
          disposables.push(() =>
            childEl.removeEventListener('transitionend', onTransitionEnd),
          )
        }
      }),
    ).then(() => {
      this.isUpdating = false
    })

    layoutIndex[this.id].children.forEach((x) => {
      x.layout.updatePositions(positions[x.id].size, treeId)
    })
    this.isFirst = false
  }

  initializeChild(childEl: ChildEl) {
    if (!childEl.id && !childEl.dataset?.id)
      return log.warn(
        'Layout: Child requires `id` at the time it is added to a Layout',
      )

    childEl.id = childEl.id || childEl.dataset.id
    childEl._remove = childEl.remove
    childEl.newlyAdded = true
    childEl.previousLayoutId = childLayoutIdIndex[childEl.id]

    // Proxy remove to our custom remove()
    childEl.remove = () => {
      this.removeChild(childEl as Node & ChildEl)
    }

    if (!childEl.mutationObserver) {
      childEl.mutationObserver = new MutationObserver((mutations) => {
        mutations.forEach((x) => {
          if (x.type === 'attributes') {
            if (!['props'].includes(x.attributeName)) return
            queueOp(['childAttributesChanged', this.id, childEl.id])
          }
        })
      })
      childEl.mutationObserver.observe(childEl as HTMLElement, {
        childList: true,
        attributes: true,
      })
    }
    
    // Reconnect previous siblings if this node already exists in memory
    const previous = childIndex[childEl.id]
    if (previous) {
      if (previous.previousSiblingEl) {
        previous.previousSiblingEl.nextSiblingEl = previous.nextSiblingEl
      }
      if (previous.nextSiblingEl) {
        previous.nextSiblingEl.previousSiblingEl = previous.previousSiblingEl
      }
    }

    // Update the new sibling references
    childEl.parentLayout = childEl.parentElement as Layout
    childEl.nextSiblingEl = childEl.nextSibling as ChildEl
    childEl.previousSiblingEl = childEl.previousSibling as ChildEl

    if (childEl.previousSiblingEl) {
      childEl.previousSiblingEl.nextSiblingEl = childEl
    }

    childEl.toggleAttribute('data-layout-child', true)
    childIndex[childEl.id] = childEl
    childLayoutIdIndex[childEl.id] = this.id

    // Set a custom remove method to run the node's exit transition
    childEl.runRemove = async () => {
      childEl.removed = true
      await new Promise((resolve) => window.setTimeout(resolve)) // Defer for layout
      const { removalTransition = {} } = childEl.data

      // Run the exit animation by moving the node to its exit position
      Object.assign(childEl.style, {
        zIndex: -1,
        transitionDelay: '0ms',
        transitionDuration: removalTransition.duration || TRANSITION_DURATION,
        transitionProperty: TRANSITION_FIELDS,
        transitionTimingFunction: removalTransition.timingFn ?? 'ease',
        transform: `translate3d(${removalTransition.offset?.x ?? 0}, ${
          removalTransition.offset?.y ?? 0
        }, 0) scaleX(${removalTransition.scale?.x ?? 1}) scaleY(${
          removalTransition.scale?.y ?? 1
        })`,
        opacity: removalTransition.opacity ?? 0,
      })

      childEl.removed = true
      childEl.transition = new Promise<void>((resolve) => {
        const onFinished = () => {
          childEl.transition = null
          childEl._remove()
          queueOp(['childRemoveFinished', this.id, childEl.id])
          clearTimeout(timeout)
          resolve()
        }
        // If for one of various reasons the 'transitionend' event does not
        //  fire, remove the element after a timeout with plenty of buffer.
        // TODO: Gracefully convert string transition durations to Number(ms)
        const timeout = window.setTimeout(
          onFinished,
          parseInt(String(removalTransition.duration || TRANSITION_DURATION)) +
            600,
        )
        childEl.addEventListener('transitionend', onFinished, {
          once: true,
        })
      })
      return childEl.transition
    }
  }

  getProps() {
    return JSON.parse(this.getAttribute('props') || '{}')
  }

  getChildPositions(
    size: { x: number; y: number },
    settings: {
      globalOffset?: { x: number; y: number }
    } = {},
  ): ChildRenderPositionIndex {
    //  Iterate and turn the immediate children into nodes as SceneNode[]
    const nodes = Array.from(this.children || [])
      .filter((x: ChildEl) => !x.removed)
      .map((x: ChildEl, i) => {
        // TODO: Determine whether props are valuable to pass to Layout.
        //  there might be value in introspecting properties about a node to
        //  determine their placement, but reasonably layouts should be
        //  agnostic to their content. Perhaps this is better managed as a
        //  a property of the layout itself.
        //
        // - At the very least, child positional/size props should be passed
        //   in automatically in case the layout depends on it (e.g. Free layout).

        // const props = x.props || {}
        return {
          id: x.id,
          props: {},
          children: [],
        }
      })

    const { globalOffset = { x: 0, y: 0 } } = settings
    const props = this.getProps()
    const layoutArgs = {
      id: this.id,
      props: props,
      children: nodes,
      size,
    }
    const result = htmlLayouts[props.layout]
      ? htmlLayouts[props.layout].layout(layoutArgs)
      : htmlLayouts.Free.layout(layoutArgs)

    if (!(result instanceof HTMLElement)) {
      // Already formatted - return the child positions
      // Ensure all data is populated
      return Object.fromEntries(
        Object.entries(result).map(([id, value]) => {
          return [
            id,
            {
              globalOffset,
              position: {
                x: 0,
                y: 0,
              },
              size: {
                x: size.x,
                y: size.y,
              },
              opacity: 1,
              zIndex: 1,
              borderRadius: 0,
              ...value,
              insertionTransition: {
                ...DEFAULT_TRANSITION,
                ...(value.insertionTransition || {}),
              },
              removalTransition: {
                ...DEFAULT_TRANSITION,
                opacity: 0,
                ...(value.removalTransition || {}),
              },
              entryTransition: value.entryTransition,
              exitTransition: value.exitTransition,
            } as ChildRenderPosition,
          ]
        }),
      )
    }

    const domChildren = Array.from(
      result.querySelectorAll('[data-node-id]'),
    ) as HTMLElement[]

    const wrapper = document.createElement('div')
    wrapper.style.height = result.style.height = size.y + 'px'
    wrapper.style.width = result.style.width = size.x + 'px'
    wrapper.style.position = 'absolute'
    wrapper.style.top = '0px'
    wrapper.style.left = '0px'
    wrapper.style.boxSizing = 'border-box'
    wrapper.setAttribute('data-wrapper-id', this.id)
    wrapper.append(result)

    const layoutContainer = ensureLayoutContainer(size)
    const previousDom = layoutContainer.querySelector(
      `[data-wrapper-id="${this.id}"]`,
    )

    if (previousDom) {
      previousDom.replaceWith(wrapper)
    } else {
      layoutContainer.append(wrapper)
    }

    const parentRect = result.getBoundingClientRect()
    const positions = {} as ChildRenderPositionIndex

    domChildren.forEach((el: LayoutChild) => {
      const id = el.dataset.nodeId
      if (!id) return

      const opacity = Number(el.dataset.opacity ?? (el.style.opacity || 1))

      const rect = el.getBoundingClientRect()
      let newPosition = {
        globalOffset,
        position: {
          x: rect.x - parentRect.x,
          y: rect.y - parentRect.y,
        },
        size: {
          x: rect.width,
          y: rect.height,
        },
        opacity,
        zIndex: el.data?.zIndex ?? 1,
        entryTransition: el.data?.entryTransition,
        exitTransition: el.data?.exitTransition,
        insertionTransition: {
          ...DEFAULT_TRANSITION,
          ...(el.data?.insertionTransition ?? {}),
        },
        removalTransition: {
          ...DEFAULT_TRANSITION,
          opacity: 0,
          ...(el.data?.removalTransition ?? {}),
        },
        borderRadius: el.data?.borderRadius ?? 0,
      } as ChildRenderPosition

      if (`${props.showcase}-x` === id) {
        newPosition.position = {
          x: parentRect.x,
          y: parentRect.y,
        }
        newPosition.size = {
          x: parentRect.width,
          y: parentRect.height,
        }
        newPosition.zIndex = 10
      }
      positions[id] = newPosition
    })

    return positions
  }

  indexTreeOfPositions(size: { x: number; y: number }) {
    const tree = layoutIndex[this.id]

    // Get positions from memory
    const treePositions = latestChildPositions[tree.id] || {}
    latestChildPositions[tree.id] = treePositions
    previousChildPositions[tree.id] = { ...treePositions }

    forEachDown(tree, (node) => {
      const slot = getSlotPosition(tree.id, node.id)
      const positions = node.layout.getChildPositions(slot ? slot.size : size, {
        globalOffset: slot
          ? {
              x: slot.globalOffset.x + slot.position.x,
              y: slot.globalOffset.y + slot.position.y,
            }
          : { x: 0, y: 0 },
      })
      treePositions[node.id] = positions
    })

    this.log('Calculated tree:', treeToPositions(tree))
    return latestChildPositions[tree.id]
  }

  render(size?: { x: number; y: number }) {
    size = size || { x: 1280, y: 720 }
    previousFrameDisposables[this.id] = previousFrameDisposables[this.id] || {}
    this.indexTreeOfPositions(size)
    this.updatePositions(size, this.id)
  }
}

const treeToPositions = (tree: LayoutTree) => {
  return mapDown(tree, (x, parent) => {
    return {
      id: x.id,
      ...latestChildPositions[tree.id][parent?.id]?.[x.id],
    }
  })
}

const getSlotPosition = (treeId: string, layoutId: string) => {
  const treePositions = latestChildPositions[treeId] || {}
  const parentId = parentIdIndex[layoutId]
  // const grandparentId = parentId ? parentIdIndex[parentId] : null
  return treePositions[parentId]?.[layoutId]
}

const latestChildPositions = {} as {
  [layoutTreeId: string]: {
    [layoutId: string]: ChildRenderPositionIndex
  }
}

const previousChildPositions = {} as {
  [layoutTreeId: string]: {
    [layoutId: string]: ChildRenderPositionIndex
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
  _remove: HTMLElement['remove']
  // Keep a reference to element.parentElement even when removed
  parentLayout: Layout
  // The sibling preceding this element
  previousSiblingEl: ChildEl
  // The sibling following this element
  nextSiblingEl: ChildEl
  // Has entered the removal transition sequence.
  //  A "removed" node will be re-added to the parentLayout and then again
  //  removed once its transition completes
  removed: boolean
  newlyAdded: boolean
  previousLayoutId?: string
  transition?: Promise<void>
  // TODO: Implement props (or consider other solution)
  // Custom props that may be assigned to the node and forwarded to the LayoutDefinition
  // props?: any
  dataset: { id: string }
  data: ChildRenderPosition
  mutationObserver?: MutationObserver
}

// For safety, rely on instanceof check rather than element name
//  i.e. Use this instead of `x.closest('ls-layout')`
const findElementUp = <T extends HTMLElement = HTMLElement>(
  start: HTMLElement,
  comparator: (el: HTMLElement) => boolean,
  maxFailedTraversalDepth = 4,
  failedAttempts = 0,
): null | T => {
  const parent = start.parentElement
  if (parent) {
    if (comparator(parent)) return parent as T // Found layout meeting criteria

    // Increment failed attempt count to guard against entire document traversal
    if (failedAttempts > maxFailedTraversalDepth) return null
    return findElementUp<T>(parent, comparator, failedAttempts + 1)
  }
  return null
}

export const htmlLayouts = {} as LayoutMap

export const registerLayout: LayoutRegister = (declaration) => {
  asArray(declaration).forEach((x) => {
    // TODO: Validation
    htmlLayouts[x.name] = x
  })
}

export const layoutManager = {
  registerLayout,
  Layout,
}

export type LayoutManager = typeof layoutManager
