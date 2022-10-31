/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import { log, InternalProject } from '../core/context'
import { swapItems } from '../logic'
import { Disposable, LayoutUpdates, Project, SceneNode } from './compositor'

const PADDING = 0

export type RenderMethods = {
  remove: (id: string) => Promise<void>
  reorder: (ids: string[]) => Promise<void>
  // TODO: Handle batch updates when two parents are affected by a single operation
  swap: () => Promise<void>
  move: () => Promise<void>
  // add: (node: SceneNode) => Promise<void>
}

// TODO:
export type LayoutStrategy = {
  methods: RenderMethods
}

const projects = {} as {
  [id: string]: Map<HTMLElement, Disposable>
}

export const renderProject = (
  project: Project,
  containerEl: HTMLElement,
): Disposable => {
  if (!projects[project.id]) projects[project.id] = new Map()
  if (projects[project.id].get(containerEl)) {
    return projects[project.id].get(containerEl)
  }

  loadDragImage()

  if (!containerEl || !project) return

  const { x: rootWidth, y: rootHeight } = project.settings.size

  // Base styles
  const baseStyleEl = document.createElement('style')
  baseStyleEl.textContent = getStyle()

  // Root El
  const rootEl = document.createElement('div')
  rootEl.attachShadow({ mode: 'open' })
  Object.assign(rootEl.style, {
    width: '100%',
    height: '100%',
    position: 'relative',
  })

  // Render El
  const renderEl = document.createElement('div')
  Object.assign(renderEl.style, {
    width: rootWidth + 'px',
    height: rootHeight + 'px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transformOrigin: '0 0',
    position: 'relative',
    left: '50%',
    top: '50%',
  })

  // Build tree
  rootEl.shadowRoot.append(baseStyleEl)
  rootEl.shadowRoot.append(renderEl)
  containerEl.append(rootEl)

  // Scale and center the compositor to fit in the container
  const resizeObserver = new ResizeObserver((entries) => {
    setScale()
  })
  resizeObserver.observe(containerEl)

  const setScale = () => {
    let { width, height } = containerEl.getBoundingClientRect()
    const containerRatio = width / height
    const compositorRatio = rootWidth / rootHeight

    let scale
    if (width && height) {
      if (compositorRatio > containerRatio) {
        // If compositor ratio is higher, width is the constraint
        scale = width / (rootWidth + PADDING * 2)
      } else {
        // If container ratio is higher, height is the constraint
        scale = height / (rootHeight + PADDING * 2)
      }
    } else {
      // It's possible the container will have no size defined (width/height=0)
      scale = 1
    }

    renderEl.style.willChange = `transform`
    renderEl.style.transform = `scale(${scale}) translate3d(-50%, -50%, 0)`

    // TODO: This will not work with multiple renderers
    // @ts-ignore
    window.__scale = scale
    render()
  }

  const listeners = [
    project.on('NodeChanged', ({ nodeId }) => {
      // Do not re-render if the node is a sub-component
      if (project.getParentComponent(nodeId)) return
      render()
    }),
  ]

  const render = () => {
    const tree = project.renderVirtualTree()
    ReactDOM.render(
      <RendererProvider
        project={project}
        elements={{
          containerEl,
          rootEl,
          renderEl,
        }}
      >
        <ElementTree node={tree} />
      </RendererProvider>,
      renderEl,
    )
  }

  // Set initial scale
  setScale()

  const dispose = () => {
    rootEl.remove()
    projects[project.id].delete(containerEl)
    if (projects[project.id].size === 0) {
      delete projects[project.id]
    }
    listeners.forEach((x) => x())
  }

  projects[project.id].set(containerEl, dispose)
  return dispose
}

let dragImage: HTMLImageElement
const loadDragImage = () => {
  if (dragImage) return dragImage
  dragImage = new Image()
  dragImage.src = URL.createObjectURL(
    new Blob([dragImageSvg], {
      type: 'image/svg+xml',
    }),
  )
  return dragImage
}

class ErrorBoundary extends React.Component<
  { children: React.PropsWithChildren<any> },
  { error?: Error }
> {
  constructor(props: any) {
    super(props)
    this.state = { error: null }
  }
  componentDidCatch(error: Error, info: any) {
    log.warn(error, info)
  }
  static getDerivedStateFromError() {
    return { error: true }
  }
  render() {
    if (this.state.error) return null
    return this.props.children
  }
}

const dragImageSvg = `
  <svg height="75" width="120" viewBox="0 0 120 75" xmlns="http://www.w3.org/2000/svg" style="">
    <rect width="120" height="75" rx="3" style="
      opacity: 0.4;
      stroke: white;
      stroke-width: 3px;
      stroke-opacity: 0.7;
    "/>
  </svg>`

type RendererContext = {
  project: Project
  elements: {
    containerEl: HTMLElement
    rootEl: HTMLElement
    renderEl: HTMLElement
  }
}

export const RendererContext = React.createContext<RendererContext>({
  project: null,
  elements: {
    containerEl: null,
    rootEl: null,
    renderEl: null,
  },
})

type ContextProps = RendererContext & {
  children: React.ReactChild
}

const RendererProvider = ({ children, ...props }: ContextProps) => {
  return (
    <RendererContext.Provider
      value={{
        ...props,
      }}
    >
      {children}
    </RendererContext.Provider>
  )
}

const getStyle = () => `
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: 'Arial';
}

video {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.NameBanner {
  top: 100%;
  transform: translateY(-100%);
  left: 0;
  height: 30px;
  background: linear-gradient(90deg, rgba(0, 0, 0, 0.5) 50%, rgba(0, 0, 0, 0) 100%);
  padding: 0px 0px 0px 10px;
  color: rgba(255, 255, 255, 0.9);
  font-weight: bold;
  line-height: 30px;
  width: 100%;
  font-size: 28px;
  position: absolute;
}

ls-layout[layout="Presentation"][props*="\\"cover\\"\\:true"] > :first-child .NameBanner {
  top: 0% !important;
  transform: translateY(0%) !important;
}

[layout="Layered"] > [data-item] {
  transform: scale(1.003) !important;
}
[layout="Layered"] > [data-item]:nth-child(2) {
  transform: scale(1.0015) !important;
}
[layout="Layered"] > [data-item]:nth-child(1) {
  transform: scale(1) !important;
}

.logo {
  position: absolute !important;
}

#compositor-root[data-dragging] {}

[data-drag-target] {}
[data-drag-target]:hover > .interactive-overlay {
  box-shadow: 0 0 0 3px inset rgba(255, 255, 255, 0.5);
  cursor: grab;
}
[data-drop-target] {}
[data-drop-target]:hover {}
[data-drag-target][data-drag-target-active] > .interactive-overlay {
  box-shadow: 0 0 0 3px inset rgba(255, 255, 255, 0.2);
}
[data-drag-target][data-drag-target-active] > .item-element {
  opacity: 0.8;
}
[data-layout-drop-target-active] > .interactive-overlay {
  box-shadow: 0 0 0 3px inset yellow;
}
[data-transform-drop-target-active] > .interactive-overlay {
  box-shadow: 0 0 0 3px inset white;
}
`

const onDrop =
  (methods: RenderMethods, project: Project) =>
  async (
    data: {
      dropNodeId: string
      dropType: 'layout' | 'transform'
    },
    e: React.DragEvent,
  ) => {
    e.preventDefault()
    e.stopPropagation()
    const { dropNodeId, dropType } = data
    const dragNodeId = e.dataTransfer.getData('text/plain')
    log.debug('Renderer: Dropping', { dropType, dragNodeId, dropNodeId })

    if (dropNodeId === dragNodeId) return

    // Drop parent may be undefined
    const [dragNode, dropNode, dragParent, dropParent] = await Promise.all([
      project.get(dragNodeId),
      project.get(dropNodeId),
      project.getParent(dragNodeId),
      project.getParent(dropNodeId),
    ])

    if (dropType === 'layout') {
      // If the drop node is the current parent, do nothing
      if (dragParent.id === dropNodeId) return

      // If the drop node is a layout, then move node only
      // TODO: Wire up - Move node to a different parent
      // return methods.swap({
      //   projectId: project.id,
      //   nodeId: dragNode.id,
      //   parentId: dropNode.id,
      // })
    } else {
      // If the drop node is a transform, then swap
      // TODO: Wire up - Swap nodes with separate parents
      // if (dragParent.id !== dropParent?.id) {
      //   return methods.swap({
      //     projectId: project.id,
      //     nodeAId: dragNode.id,
      //     nodeBId: dropNode.id,
      //   })
      // }
    }

    // Swap the two nodes if they have the same parent
    const childIds = dragParent.children.map((x) => x.id)
    return methods.reorder(swapItems(dragNode.id, dropNode.id, childIds))
  }

let foundDropTarget = false
const ElementTree = (props: {
  node: SceneNode
  transformDragHandlers?: (node: SceneNode) => any
}) => {
  const isDragging = useRef(false)
  const interactiveRef = useRef<HTMLDivElement>()
  const transformRef = useRef<HTMLDivElement>()
  const rootRef = useRef<HTMLDivElement>()
  const { project, elements } = useContext(RendererContext)
  const { node, transformDragHandlers } = props

  const element = project.getElement(node)
  const layout = node.props.layout || 'Row'
  const methods = project.settings.canEdit ? node.render?.methods : null
  const _onDrop = useMemo(() => onDrop(methods, project), [])

  // TODO: Improve this check
  const isDragTarget = Boolean(transformDragHandlers)
  const isDropTarget = Boolean(methods)

  let layoutDragHandlers = isDropTarget
    ? ({
        onDrop: (e: React.DragEvent) => {
          foundDropTarget = true
          return _onDrop(
            {
              dropType: 'layout',
              dropNodeId: node.id,
            },
            e,
          )
        },
        onDragOver: (e: React.DragEvent) => {
          e.preventDefault()
          e.stopPropagation()
          rootRef.current?.toggleAttribute(
            'data-layout-drop-target-active',
            true,
          )
        },
        onDragLeave: (e: React.DragEvent) => {
          e.preventDefault()
          e.stopPropagation()
          rootRef.current?.toggleAttribute(
            'data-layout-drop-target-active',
            false,
          )
        },
      } as React.HTMLAttributes<HTMLDivElement>)
    : {}

  let childTransformDragHandlers = isDropTarget
    ? (node: SceneNode) =>
        ({
          draggable: true,
          // If a target is draggable, it will also be treated as
          //  a drop target (swap element positions)
          ondrop: (e) => {
            foundDropTarget = true
            return _onDrop(
              {
                dropType: 'transform',
                dropNodeId: node.id,
              },
              // @ts-ignore TODO: Convert all to native drag events
              e,
            )
          },
          ondragstart: (e) => {
            isDragging.current = true
            elements.renderEl.toggleAttribute('data-dragging', true)
            log.debug('Renderer: Dragging', node.id)
            foundDropTarget = false
            e.dataTransfer.setData('text/plain', node.id)
            e.dataTransfer.dropEffect = 'move'
            e.dataTransfer.setDragImage(dragImage, 10, 10)
            rootRef.current?.toggleAttribute('data-drag-target-active', true)
            // @ts-ignore
            window.__dragging = true
          },
          ondragend: (e) => {
            isDragging.current = false
            if (!foundDropTarget) {
              log.info('Renderer: No drop target - deleting node', node)
              methods.remove(node.id)
            }
            elements.renderEl.toggleAttribute('data-dragging', true)
            log.debug('Renderer: DragEnd', e)
            rootRef.current?.toggleAttribute('data-drag-target-active', false)

            elements.renderEl.querySelectorAll('[data-item]').forEach((x) => {
              x.toggleAttribute('data-drag-target-active', false)
              x.toggleAttribute('data-layout-drop-target-active', false)
              x.toggleAttribute('data-transform-drop-target-active', false)
            })
            // @ts-ignore
            window.__dragging = false
          },
          ondragover: (e) => {
            e.preventDefault()
            e.stopPropagation()
            if (isDragging.current) return
            rootRef.current?.toggleAttribute(
              'data-transform-drop-target-active',
              true,
            )
          },
          ondragleave: (e) => {
            e.preventDefault()
            e.stopPropagation()
            rootRef.current?.toggleAttribute(
              'data-transform-drop-target-active',
              false,
            )
          },
        } as Partial<HTMLElement>)
    : null

  useEffect(() => {
    const onDoubleClick = isDragTarget
      ? () => onElementDoubleClick(node)
      : () => {}

    if (transformRef.current && element) {
      transformRef.current.appendChild(element.root)
      Object.assign(transformRef.current.style, {
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      })
      Object.assign(element.root.style, {
        pointerEvents: isDragTarget ? 'all' : 'none',
        width: '100%',
        height: '100%',
        position: 'relative',
        ...(node.props.style || {}),
      })
    }
  }, [transformRef.current, element])

  useEffect(() => {
    const onDoubleClick = isDragTarget
      ? () => onElementDoubleClick(node)
      : () => {}

    if (interactiveRef.current) {
      Object.assign(
        interactiveRef.current,
        transformDragHandlers ? transformDragHandlers(node) : {},
      )

      Object.assign(interactiveRef.current.style, {
        pointerEvents: isDragTarget ? 'all' : 'none',
      })
      interactiveRef.current.addEventListener('dblclick', onDoubleClick)
    }
    return () => {
      interactiveRef.current?.removeEventListener('dblclick', onDoubleClick)
    }
  }, [interactiveRef.current])

  const layoutProps = {
    layout,
    ...(node.props.layoutProps ?? {}),
  }

  return (
    <div
      ref={rootRef}
      data-id={node.id + '-x'}
      data-item
      {...(isDragTarget && {
        'data-drag-target': true,
      })}
      {...(isDropTarget && {
        'data-drop-target': true,
      })}
      {...layoutDragHandlers}
      style={{
        position: 'relative',
        width: node.props.size?.x || '100%',
        height: node.props.size?.y || '100%',
        pointerEvents: 'none',
      }}
    >
      <div
        className="interactive-overlay"
        ref={interactiveRef}
        style={{
          height: '100%',
          width: '100%',
          position: 'absolute',
          zIndex: 2,
        }}
      ></div>
      <div
        className="item-element"
        style={{
          display: 'flex',
          flex: '0 0 auto',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
        }}
      >
        <div ref={transformRef}></div>
        <ErrorBoundary>
          <ls-layout
            data-id={node.id + '-x'}
            props={JSON.stringify(layoutProps)}
            layout={layout}
          >
            {node.children.map((x) => (
              <ElementTree
                key={x.id}
                node={x}
                transformDragHandlers={childTransformDragHandlers}
              />
            ))}
          </ls-layout>
        </ErrorBoundary>
      </div>
    </div>
  )
}
