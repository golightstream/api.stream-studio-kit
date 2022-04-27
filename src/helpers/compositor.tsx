/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import { swapItems } from '../logic'
import { getProject } from '../core/data'
import { CoreContext, log, InternalProject } from '../core/context'
import { Compositor } from '../core/namespaces'
import { CompositorSettings } from '../core/types'
const { Transform } = Compositor

class ErrorBoundary extends React.Component<
  { children: React.ReactChild },
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

const onDrop = async (
  data: {
    dropNodeId: string
    dropType: 'layout' | 'transform'
    project: InternalProject
  },
  e: React.DragEvent,
) => {
  e.preventDefault()
  e.stopPropagation()
  const { dropNodeId, dropType, project } = data
  const dragNodeId = e.dataTransfer.getData('text/plain')
  log.debug('Compositor: Dropping', { dropType, dragNodeId, dropNodeId })

  if (dropNodeId === dragNodeId) return

  // Drop parent may be undefined
  const [dragNode, dropNode, dragParent, dropParent] = await Promise.all([
    project.compositor.get(dragNodeId),
    project.compositor.get(dropNodeId),
    project.compositor.getParent(dragNodeId),
    project.compositor.getParent(dropNodeId),
  ])

  if (dropType === 'layout') {
    // If the drop node is the current parent, do nothing
    if (dragParent.id === dropNodeId) return

    // If the drop node is a layout, then move node only
    return CoreContext.Command.moveNode({
      projectId: project.id,
      nodeId: dragNode.id,
      parentId: dropNode.id,
    })
  } else {
    // If the drop node is a transform, then swap
    if (dragParent.id !== dropParent?.id) {
      return CoreContext.Command.swapNodes({
        projectId: project.id,
        nodeAId: dragNode.id,
        nodeBId: dropNode.id,
      })
    }
  }

  // Swap the two nodes if they have the same parent
  const childIds = dragParent.children.map((x: Compositor.SceneNode) => x.id)

  return CoreContext.Command.reorderNodes({
    projectId: project.id,
    parentId: dragParent.id,
    childIds: swapItems(dragNode.id, dropNode.id, childIds),
  })
}

let foundDropTarget = false
const ElementTree = (props: {
  nodeId: string
  project: InternalProject
  interactive: boolean
  drag: boolean
  drop: boolean
  dblClickShowcase: boolean
  onDoubleClick?: () => void
}) => {
  const transformRef = useRef<HTMLDivElement>()
  const rootRef = useRef<HTMLDivElement>()
  const {
    nodeId,
    project,
    interactive = true,
    drag = false,
    drop = false,
    dblClickShowcase = false,
  } = props
  const node = project.compositor.get(nodeId)
  if (!node) return null

  const element = Transform.getElement(node)
  const layout = node.props.layout || 'Row'

  let layoutDragHandlers = drop
    ? {
        onDrop: (e: React.DragEvent) => {
          foundDropTarget = true
          return onDrop(
            {
              dropType: 'layout',
              dropNodeId: node.id,
              project,
            },
            e,
          )
        },
        onDragOver: (e: React.DragEvent) => {
          const el = e.currentTarget as HTMLElement
          e.preventDefault()
          e.stopPropagation()
          el.classList.toggle('drag-target', true)
        },
        onDragLeave: (e: React.DragEvent) => {
          const el = e.currentTarget as HTMLElement
          e.preventDefault()
          el.classList.toggle('drag-target', false)
        },
      }
    : {}

  let transformDragHandlers = drag
    ? {
        draggable: true,
        ondrop: (e: React.DragEvent) => {
          foundDropTarget = true
          return onDrop(
            {
              dropType: 'transform',
              dropNodeId: node.id,
              project,
            },
            e,
          )
        },
        ondragstart: (e: React.DragEvent) => {
          log.debug('Compositor: Dragging', node.id)
          foundDropTarget = false
          e.dataTransfer.setData('text/plain', node.id)
          // @ts-ignore
          window.__dragging = true
        },
        ondragend: (e: React.DragEvent) => {
          if (!foundDropTarget) {
            log.info('Compositor: No drop target - deleting node', node)
            CoreContext.Command.deleteNode({ nodeId: node.id })
          }
          log.debug('Compositor: DragEnd', e)
          // @ts-ignore
          window.__dragging = false
        },
      }
    : {}

  useEffect(() => {
    if (transformRef.current && element) {
      transformRef.current.appendChild(element.root)
      Object.assign(transformRef.current.style, {
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      })
      Object.assign(element.root, transformDragHandlers)
      // TODO: Add element over top the root (don't put drag handlers on the root)
      Object.assign(element.root.style, {
        pointerEvents: drag ? 'all' : 'none',
        width: '100%',
        height: '100%',
        position: 'relative',
        ...(node.props.style || {}),
      })
      element.root.addEventListener('dblclick', props.onDoubleClick)
    }
    return () =>
      element?.root.removeEventListener('dblclick', props.onDoubleClick)
  }, [transformRef.current, element])

  const childCapabilities = {
    drag: interactive,
    drop: interactive,
  }
  // TODO: Move this logic elsewhere
  if (layout === 'Layered') {
    childCapabilities.drag = false
    childCapabilities.drop = false
  }

  const layoutProps = {
    layout,
    ...(node.props.layoutProps ?? {}),
  }

  return (
    <div
      ref={rootRef}
      data-id={node.id + '-x'}
      {...layoutDragHandlers}
      style={{
        display: 'flex',
        flex: '0 0 auto',
        justifyContent: 'center',
        position: 'relative',
        width: node.props.size?.x || '100%',
        height: node.props.size?.y || '100%',
        pointerEvents: 'none',
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
              nodeId={x.id}
              project={project}
              interactive={interactive}
              drag={childCapabilities.drag}
              drop={childCapabilities.drop}
              dblClickShowcase={dblClickShowcase}
              onDoubleClick={() => {
                const showcase = node.props.layoutProps?.showcase
                CoreContext.Command.updateNode({
                  nodeId: node.id,
                  props: {
                    layoutProps: {
                      ...node.props.layoutProps,
                      showcase: showcase === x.id ? null : x.id,
                    },
                  },
                })
              }}
            />
          ))}
        </ls-layout>
      </ErrorBoundary>
    </div>
  )
}

const useForceUpdate = () => {
  const [_, setValue] = useState(0)
  return () => setValue((value) => value + 1)
}

const Root = (props: {
  project: InternalProject
  dragAndDrop: boolean
  dblClickShowcase: boolean
}) => {
  const { project, dragAndDrop, dblClickShowcase } = props
  const forceUpdate = useForceUpdate()

  useEffect(() => {
    return CoreContext.onInternal('NodeChanged', () => {
      forceUpdate()
    })
  }, [])

  const root = project.compositor.getRoot()

  return (
    <div
      {...{
        onDrop: (e: React.DragEvent) => {
          foundDropTarget = true
          e.preventDefault()
        },
        onDragOver: (e: React.DragEvent) => {
          e.preventDefault()
        },
        onDragLeave: (e: React.DragEvent) => {
          e.preventDefault()
        },
      }}
      style={{
        userSelect: 'none',
        width: root.props.size.x + 'px',
        height: root.props.size.y + 'px',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        <ElementTree
          nodeId={root.id}
          project={project}
          interactive={dragAndDrop}
          dblClickShowcase={dblClickShowcase}
          drag={false}
          drop={false}
        />
      </div>
    </div>
  )
}

let wrapperEl: HTMLElement

/**
 * Render the output compositor displaying the stream canvas, which will be used
 * to display the live feed once a user starts their broadcast. Renders into a
 * supplied HTML element.
 * 
 * This compositor may double as an interactive editor with optional settings.
 * 
 * _Note: The compositor will automatically render at the largest possible size
 * accomodated by the element that is passed as its container. If the container 
 * is smaller than the project resolution (e.g. 720px x 1280px), all of the canvas 
 * elements will scale down automatically to fit._
 */
export const render = async (settings: CompositorSettings) => {
  const {
    containerEl,
    projectId,
    dragAndDrop = false,
    dblClickShowcase = dragAndDrop,
  } = settings
  const project = getProject(projectId)
  CoreContext.clients.LayoutApi().subscribeToLayout(project.layoutApi.layoutId)

  if (!containerEl || !project) return

  if (!containerEl.shadowRoot) {
    containerEl.attachShadow({ mode: 'open' })
    const styleEl = document.createElement('style')
    styleEl.textContent = getStyle()
    wrapperEl = document.createElement('div')
    Object.assign(wrapperEl.style, {
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transformOrigin: 'center',
    })
    containerEl.shadowRoot.appendChild(styleEl)
    containerEl.shadowRoot.appendChild(wrapperEl)

    // Scale and center the compositor to fit in the container
    const resizeObserver = new ResizeObserver((entries) => {
      setScale()
    })
    resizeObserver.observe(containerEl)
  }

  const root = project.compositor.getRoot()
  const { x: rootWidth, y: rootHeight } = root.props.size

  const setScale = () => {
    const { width, height } = containerEl.getBoundingClientRect()
    const containerRatio = width / height
    const compositorRatio = rootWidth / rootHeight

    let scale
    if (width && height) {
      if (compositorRatio > containerRatio) {
        // If compositor ratio is higher, width is the constraint
        scale = width / rootWidth
      } else {
        // If container ratio is higher, height is the constraint
        scale = height / rootHeight
      }
    } else {
      // It's possible the container will have no size defined (width/height=0)
      scale = 1
    }
    wrapperEl.style.transform = `scale(${scale})`
    // @ts-ignore
    window.__scale = scale
    render()
  }

  const render = () => {
    ReactDOM.render(
      <Root
        project={project}
        dragAndDrop={dragAndDrop}
        dblClickShowcase={dblClickShowcase}
      />,
      wrapperEl,
    )
  }

  setScale()
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
`
