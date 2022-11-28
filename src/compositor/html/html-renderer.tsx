/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import { debounce, forEachDown, swapItems } from '../../logic'
import {
  Disposable,
  Project,
  RenderMethods,
  RenderSettings,
  TransformNode,
  VirtualNode,
} from '../compositor'
import baseStyle from './html-renderer.css?inline'

const PADDING = 0

export type LayoutStrategy = {
  methods: RenderMethods
}

const projects = {} as {
  [id: string]: Map<HTMLElement, Disposable>
}

let log: Partial<Console>

export const renderProject = (
  project: Project,
  settings: RenderSettings & {
    log?: Partial<Console>
  },
): Disposable => {
  const { containerEl, log: logger = console } = settings
  log = logger
  if (!projects[project.id]) projects[project.id] = new Map()
  if (projects[project.id].get(containerEl)) {
    return projects[project.id].get(containerEl)
  }

  loadDragImage()

  if (!containerEl || !project) return

  const { x: rootWidth, y: rootHeight } = project.settings.size

  // Base styles
  const baseStyleEl = document.createElement('style')
  baseStyleEl.textContent = baseStyle

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
    background: '#000',
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
    debouncedRender()
  }

  const listeners = [
    project.on('NodeRemoved', () => {
      debouncedRender()
    }),
    project.on('NodeAdded', () => {
      debouncedRender()
    }),
    project.on('NodeChanged', () => {
      debouncedRender()
    }),
  ]

  const render = () => {
    const tree = project.renderVirtualTree() as VirtualNode
    log.debug('Renderer: Rendering tree', { tree })
    rootId = tree.id
    childIdIndex = {}
    parentIdIndex = {}
    forEachDown(tree, (node, parent) => {
      if (!parent) return
      childIdIndex[parent?.id] = childIdIndex[parent?.id] || []
      childIdIndex[parent?.id].push(node.interactionId || node.id)
      parentIdIndex[node.interactionId] = parent?.id
    })
    ReactDOM.render(
      <RendererProvider
        project={project}
        settings={settings}
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

  const debouncedRender = debounce(render, 0, {
    trailing: true,
    leading: false,
  })

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
  draggingNodeId: string
  setDraggingNodeId: (nodeId: string) => void
  ctrlPressed: boolean
  project: Project
  settings: Partial<RenderSettings>
  elements: {
    containerEl: HTMLElement
    rootEl: HTMLElement
    renderEl: HTMLElement
  }
}

export const RendererContext = React.createContext<RendererContext>({
  draggingNodeId: null,
  setDraggingNodeId: () => {},
  ctrlPressed: false,
  project: null,
  settings: {},
  elements: {
    containerEl: null,
    rootEl: null,
    renderEl: null,
  },
})

type ContextProps = Partial<RendererContext> & {
  children: React.ReactChild
}

const RendererProvider = ({ children, ...props }: ContextProps) => {
  const [draggingNodeId, setDraggingNodeId] = useState(null)
  const [ctrlPressed, setCtrlPressed] = useState(false)

  useEffect(() => {
    const handleKeysChanged = (e: KeyboardEvent) => {
      if (e.ctrlKey === ctrlPressed) return
      setCtrlPressed(e.ctrlKey)
    }
    document.addEventListener('keydown', handleKeysChanged)
    document.addEventListener('keyup', handleKeysChanged)
    return () => {
      document.removeEventListener('keydown', handleKeysChanged)
      document.removeEventListener('keyup', handleKeysChanged)
    }
  }, [ctrlPressed])

  return (
    <RendererContext.Provider
      value={
        {
          ...props,
          draggingNodeId,
          setDraggingNodeId,
          ctrlPressed,
        } as RendererContext
      }
    >
      {children}
    </RendererContext.Provider>
  )
}

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

    if (
      dropType === 'layout' &&
      parentIdIndex[dragNodeId] !== parentIdIndex[dropNodeId]
    ) {
      // If the drop node is a layout, then move node
      return methods.move(dragNodeId, dropNodeId)
    } else if (parentIdIndex[dragNodeId] !== parentIdIndex[dropNodeId]) {
      // If the drop node is a transform, then swap
      return methods.swap(dragNodeId, dropNodeId)
    }

    // Swap the two nodes if they have the same parent
    const childIds = childIdIndex[parentIdIndex[dragNodeId]]
    return methods.reorder(swapItems(dragNodeId, dropNodeId, childIds))
  }

let childIdIndex = {} as { [id: string]: string[] }
let parentIdIndex = {} as { [id: string]: string }
let rootId: string

let foundDropTarget = false
const ElementTree = (props: {
  node: VirtualNode
  transformDragHandlers?: (
    node: VirtualNode,
    rootRef: React.MutableRefObject<HTMLElement>,
  ) => any
  onDoubleClick?: () => void
}) => {
  const interactiveRef = useRef<HTMLDivElement>()
  const transformRef = useRef<HTMLDivElement>()
  const rootRef = useRef<HTMLDivElement>()
  const {
    project,
    elements,
    draggingNodeId,
    setDraggingNodeId,
    ctrlPressed,
    settings,
  } = useContext(RendererContext)
  const { doubleClickShowcase = true } = settings
  const { node, transformDragHandlers, onDoubleClick = () => {} } = props

  const draggingNodeRef = useRef<string>()
  draggingNodeRef.current = draggingNodeId

  const element = project.getElement(node)
  const layout = node.props.layout || 'Row'
  const methods = project.settings.canEdit ? node.render?.methods : null
  const _onDrop = useMemo(() => onDrop(methods, project), [methods])

  const isDragTarget =
    // TODO: ctrlPressed should allow for dragging nodes containing other elements,
    //  but it immediately triggers a dragEnd for unknown reasons
    Boolean(transformDragHandlers) && /* ctrlPressed ||  */ element
  const isDropTarget = Boolean(methods)

  let layoutDragHandlers = isDropTarget
    ? ({
        onDrop: (e: React.DragEvent) => {
          foundDropTarget = true
          rootRef.current?.toggleAttribute(
            'data-layout-drop-target-active',
            false,
          )
          return _onDrop(
            {
              dropType: 'layout',
              dropNodeId: node.interactionId,
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
    ? (node: VirtualNode, rootRef: React.MutableRefObject<HTMLElement>) =>
        ({
          draggable: true,
          // If a target is draggable, it will also be treated as
          //  a drop target (swap element positions)
          ondrop: (e) => {
            foundDropTarget = true
            rootRef.current?.toggleAttribute(
              'data-transform-drop-target-active',
              false,
            )
            return _onDrop(
              {
                dropType: 'transform',
                dropNodeId: node.interactionId,
              },
              // @ts-ignore TODO: Convert all to native drag events
              e,
            )
          },
          ondragstart: (e) => {
            elements.renderEl.toggleAttribute('data-dragging', true)
            log.debug('Renderer: Dragging', node.interactionId)
            foundDropTarget = false
            e.dataTransfer.setData('text/plain', node.interactionId)
            e.dataTransfer.dropEffect = 'move'
            e.dataTransfer.setDragImage(dragImage, 10, 10)
            rootRef.current?.toggleAttribute('data-drag-target-active', true)
            setDraggingNodeId(node.interactionId)
          },
          ondragend: (e) => {
            if (!foundDropTarget) {
              log.info('Renderer: No drop target - deleting node', node)
              methods.remove(node.interactionId)
            }
            elements.renderEl.toggleAttribute('data-dragging', true)
            log.debug('Renderer: DragEnd', e)
            rootRef.current?.toggleAttribute('data-drag-target-active', false)

            elements.renderEl.querySelectorAll('[data-item]').forEach((x) => {
              x.toggleAttribute('data-drag-target-active', false)
              x.toggleAttribute('data-layout-drop-target-active', false)
              x.toggleAttribute('data-transform-drop-target-active', false)
            })
            setDraggingNodeId(null)
          },
          ondragover: (e) => {
            e.preventDefault()
            e.stopPropagation()
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
    if (transformRef.current && element) {
      transformRef.current.appendChild(element.root)
      Object.assign(transformRef.current.style, {
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      })
      Object.assign(element.root.style, {
        width: '100%',
        height: '100%',
        position: 'relative',
      })
    }
  }, [transformRef.current, element])

  useEffect(() => {
    const onMouseover = (e: MouseEvent) => {
      e.stopPropagation()
      rootRef.current?.classList.toggle('hovered', true)
    }
    const onMouseleave = (e: MouseEvent) => {
      e.stopPropagation()
      rootRef.current?.classList.toggle('hovered', false)
    }

    if (interactiveRef.current) {
      // @ts-ignore Debug-helper
      interactiveRef.current.vnode = node
      // @ts-ignore
      interactiveRef.current.node = project.get(
        // @ts-ignore Debug-helper
        virtualSceneNodeIdIndex[node.id],
      )

      Object.assign(interactiveRef.current, {
        ...(rootId === node.id
          ? ({
              ondrop: (e) => {
                e.preventDefault()
                e.stopPropagation()
                foundDropTarget = true
              },
              ondragover: (e) => {
                e.preventDefault()
                e.stopPropagation()
              },
            } as Partial<HTMLElement>)
          : {}),
        ...(transformDragHandlers ? transformDragHandlers(node, rootRef) : {}),
      })
      interactiveRef.current.addEventListener('dblclick', onDoubleClick)
      interactiveRef.current.addEventListener('mouseover', onMouseover)
      interactiveRef.current.addEventListener('mouseleave', onMouseleave)
    }
    return () => {
      interactiveRef.current?.removeEventListener('dblclick', onDoubleClick)
      interactiveRef.current?.removeEventListener('mouseover', onMouseover)
      interactiveRef.current?.removeEventListener('mouseleave', onMouseleave)
    }
  }, [interactiveRef.current])

  const layoutProps = {
    layout,
    ...(node.props.layoutProps ?? {}),
  }

  const isDropCandidate =
    !element &&
    draggingNodeId &&
    isDropTarget &&
    parentIdIndex[draggingNodeId] !== node.interactionId

  return (
    <div
      ref={rootRef}
      onMouseLeave={(e) => {
        e.stopPropagation()
        e.currentTarget.classList.toggle('hovered', false)
      }}
      {...(isDragTarget && {
        'data-drag-target': true,
      })}
      {...(isDropTarget && {
        'data-drop-target': true,
      })}
      {...(isDropCandidate && {
        'data-drop-candidate': true,
      })}
      {...layoutDragHandlers}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    >
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
        <div
          ref={transformRef}
          style={{ opacity: node.props.opacity ?? 1 }}
        ></div>
        <div
          className="interactive-overlay"
          ref={interactiveRef}
          onDoubleClick={() => {
            project.get(node.interactionId)?.update({
              layoutProps: {
                ...node.props.layoutProps,
                showcase: node.id,
              },
            })
          }}
          style={{
            height: '100%',
            width: '100%',
            position: 'absolute',
            zIndex: 2,
            pointerEvents:
              draggingNodeId === node.interactionId ||
              isDragTarget ||
              isDropCandidate ||
              rootId === node.id
                ? 'all'
                : 'none',
          }}
        ></div>
        <ErrorBoundary>
          <ls-layout
            data-id={node.id + '-x'}
            props={JSON.stringify(layoutProps)}
            layout={layout}
            style={{
              zIndex: 3,
              pointerEvents: 'none',
            }}
          >
            {node.children
              .filter((x) => !x.props.hidden)
              .map((x: VirtualNode) => (
                <div
                  key={x.id}
                  data-id={x.id + '-x'}
                  data-item
                  data-type={
                    node.props.type || (node as TransformNode).props.element
                  }
                  data-size={JSON.stringify(x.props.size)}
                  data-position={JSON.stringify(x.props.position)}
                >
                  <ElementTree
                    key={x.id}
                    node={x}
                    transformDragHandlers={childTransformDragHandlers}
                    onDoubleClick={
                      doubleClickShowcase && methods?.showcase
                        ? () => {
                            const isShowcase =
                              x.id ===
                              project.get(node.sceneNodeId).props.layoutProps
                                ?.showcase
                            methods.showcase(isShowcase ? null : x.id)
                          }
                        : () => {}
                    }
                  />
                </div>
              ))}
          </ls-layout>
        </ErrorBoundary>
      </div>
    </div>
  )
}
