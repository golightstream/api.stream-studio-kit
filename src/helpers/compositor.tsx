/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { color } from 'csx'
import React, {
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createRoot } from 'react-dom/client'
import { CoreContext, InternalProject, log } from '../core/context'
import { getProject } from '../core/data'
import { Compositor } from '../core/namespaces'
import { CompositorSettings, SceneNode } from '../core/types'
import { swapItems } from '../logic'

const dragImageSvg = `
  <svg height="75" width="120" viewBox="0 0 120 75" xmlns="http://www.w3.org/2000/svg" style="">
    <rect width="120" height="75" rx="3" style="
      opacity: 0.4;
      stroke: white;
      stroke-width: 3px;
      stroke-opacity: 0.7;
    "/>
  </svg>`

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

const onDrop = async (
  data: {
    dropNodeId: string
    dragNodeId: string
    dropType: 'layout' | 'transform'
    project: InternalProject
  },
  e: PointerEvent,
) => {
  const { dropNodeId, dragNodeId, dropType, project } = data
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
    // is this even a valid case
    if (dragParent.id !== dropParent?.id) {
      // return CoreContext.Command.swapNodes({
      //   projectId: project.id,
      //   nodeAId: dragNode.id,
      //   nodeBId: dropNode.id,
      // })
      return
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

let draggingNodeIdRef: string | null = null

const DRAG_DISTANCE_BUFFER = 2

const ElementTree = (props: { nodeId: string }) => {
  const activePointerCoords = useRef<{ x: number; y: number } | undefined>()
  const isDraggingSelf = useRef(false)
  const interactiveRef = useRef<HTMLDivElement>()
  const transformRef = useRef<HTMLDivElement>()
  const rootRef = useRef<HTMLDivElement>()
  const [presetPreviewTimeout, setPresetPreviewTimeout] = useState<number>()
  const {
    projectId,
    interactive,
    draggingNodeId,
    onElementDoubleClick,
    checkDragTarget,
    checkDropTarget,
    getNodePresetsOverlay,
    onPresetPreview,
    onPresetSelect,
    setDraggingNodeId,
  } = useContext(CompositorContext)
  const { nodeId } = props
  const project = getProject(projectId)
  const node = project.compositor.get(nodeId)

  const element = CoreContext.compositor.getElement(node)
  const [localState, setLocalState] = useState({})
  const nodeProps = {
    ...node.props,
    ...localState,
  } as SceneNode['props']

  const layout = nodeProps.layout || 'Row'

  const isDragTarget = (interactive && checkDragTarget?.(node)) ?? false
  const isDropTarget = (interactive && checkDropTarget?.(node)) ?? false

  const presetsOverlay = getNodePresetsOverlay?.(node, project.props)

  let isDraggingChild = node.children.some((x) => x.id === draggingNodeId)

  let layoutDragHandlers =
    isDropTarget && draggingNodeId && !isDraggingSelf.current
      ? ({
          onpointerup: (e) => {
            log.debug('Compositor: PointerUp "Layout"', node.id)
            return onDrop(
              {
                dropType: 'layout',
                dropNodeId: node.id,
                dragNodeId: draggingNodeId,
                project,
              },
              e,
            )
          },
          onpointerenter: (e) => {
            e.preventDefault()
            e.stopPropagation()
            rootRef.current?.toggleAttribute(
              'data-layout-drop-target-active',
              true,
            )
          },
          onpointerleave: (e) => {
            e.preventDefault()
            e.stopPropagation()
            rootRef.current?.toggleAttribute(
              'data-layout-drop-target-active',
              false,
            )
          },
        } as Partial<HTMLElement>)
      : {}

  let transformDragHandlers = isDragTarget
    ? ({
        onpointerdown: (e) => {
          // Check for pointer distance move > 1px before treating as a drag
          activePointerCoords.current = { x: e.clientX, y: e.clientY }
          let latestPointerCoords = activePointerCoords.current

          log.debug('Compositor: Dragging', node.id)
          wrapperEl.toggleAttribute('data-dragging', true)
          rootRef.current?.toggleAttribute('data-drag-target-active', true)

          const adjustPreviewPosition = () => {
            if (!isDraggingSelf.current) return

            // Runs every frame while dragging
            dragPreviewEl.style.top = latestPointerCoords.y - 20 + 'px'
            dragPreviewEl.style.left = latestPointerCoords.x - 20 + 'px'
            dragPreviewEl.toggleAttribute('data-active', true)

            requestAnimationFrame(() => adjustPreviewPosition())
          }

          const onGlobalPointerMove = (e: PointerEvent) => {
            if (
              !isDraggingSelf.current &&
              Boolean(activePointerCoords.current)
            ) {
              const isDragging = Boolean(
                Math.abs(e.clientX - activePointerCoords.current.x) >=
                  DRAG_DISTANCE_BUFFER ||
                  Math.abs(e.clientY - activePointerCoords.current.y) >=
                    DRAG_DISTANCE_BUFFER,
              )

              // Runs only once when dragging starts
              if (isDragging) {
                setDraggingNodeId(node.id)
                isDraggingSelf.current = isDragging
                adjustPreviewPosition()
              }
            }
            latestPointerCoords = { x: e.clientX, y: e.clientY }
          }

          onGlobalPointerMove(e)

          const onGlobalPointerUp = (e: PointerEvent) => {
            setTimeout(() => {
              log.debug('Compositor: DragEnd', e)
              activePointerCoords.current = undefined
              isDraggingSelf.current = false
              setDraggingNodeId(null)

              dragPreviewEl.toggleAttribute('data-active', false)
              wrapperEl.toggleAttribute('data-dragging', false)
              wrapperEl.toggleAttribute('data-drop-target-ready', false)
              wrapperEl.querySelectorAll('[data-item]').forEach((x) => {
                x.toggleAttribute('data-drag-target-active', false)
                x.toggleAttribute('data-layout-drop-target-active', false)
                x.toggleAttribute('data-transform-drop-target-active', false)
                x.toggleAttribute('data-transform-drop-self-active', false)
              })
            })

            document.removeEventListener('pointermove', onGlobalPointerMove)
            document.removeEventListener('pointerup', onGlobalPointerUp)
          }

          document.addEventListener('pointermove', onGlobalPointerMove)
          document.addEventListener('pointerup', onGlobalPointerUp)
        },
        onpointerup: (e) => {
          // If a target is draggable, it will also be treated as
          //  a drop target (swap element positions)
          log.debug('Compositor: PointerUp "Node"', node.id)
          if (draggingNodeIdRef && draggingNodeIdRef !== node.id) {
            onDrop(
              {
                dropType: 'transform',
                dropNodeId: node.id,
                dragNodeId: draggingNodeIdRef,
                project,
              },
              e,
            )
          }
        },
        onpointerenter: (e) => {
          e.preventDefault()
          e.stopPropagation()

          if (!draggingNodeIdRef) return

          if (isDraggingSelf.current) {
            log.debug('Compositor: Mouseenter self', node.id)
            rootRef.current?.toggleAttribute(
              'data-transform-drop-self-active',
              true,
            )
          } else {
            log.debug('Compositor: Mouseenter other', node.id)
            rootRef.current?.toggleAttribute(
              'data-transform-drop-target-active',
              true,
            )

            // Timeout to ensure "dragenter" runs after
            //  "dragleave" for other elements for global updates
            setTimeout(() => {
              if (!isDraggingSelf.current) {
                wrapperEl.toggleAttribute('data-drop-target-ready', true)
              }
            })
          }
        },
        onpointerleave: (e) => {
          e.preventDefault()
          e.stopPropagation()

          if (!draggingNodeIdRef) return

          rootRef.current?.toggleAttribute(
            'data-transform-drop-self-active',
            false,
          )
          rootRef.current?.toggleAttribute(
            'data-transform-drop-target-active',
            false,
          )
          wrapperEl.toggleAttribute('data-drop-target-ready', false)
        },
      } as Partial<HTMLElement>)
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
      Object.assign(element.root.style, {
        pointerEvents: isDragTarget ? 'all' : 'none',
        width: '100%',
        height: '100%',
        position: 'relative',
        ...(nodeProps.style || {}),
      })
    }
  }, [transformRef.current, element])

  useEffect(() => {
    const onDoubleClick = isDragTarget
      ? () => onElementDoubleClick?.(node)
      : () => {}

    if (interactiveRef.current) {
      Object.assign(interactiveRef.current, transformDragHandlers)

      Object.assign(interactiveRef.current.style, {
        pointerEvents: isDragTarget ? 'all' : 'none',
      })
      interactiveRef.current.addEventListener('dblclick', onDoubleClick)
    }
    return () => {
      interactiveRef.current?.removeEventListener('dblclick', onDoubleClick)
    }
  }, [interactiveRef.current])

  useEffect(() => {
    if (rootRef.current) {
      Object.assign(interactiveRef.current, layoutDragHandlers)
    }
  }, [rootRef.current])

  const layoutProps = {
    layout,
    ...(nodeProps.layoutProps ?? {}),
  }

  const clearPresetTimeout = useMemo(
    () => (target: HTMLElement) => {
      target.toggleAttribute('data-preset-drag-target-active', false)
      window.clearTimeout(presetPreviewTimeout)
      setLocalState({})
      setPresetPreviewTimeout(undefined)
    },
    [presetPreviewTimeout, setLocalState],
  )
  if (!node) return null
  return (
    <div
      ref={rootRef}
      data-id={node.id + '-x'}
      data-source-type={node.props.sourceType}
      data-item
      {...(isDragTarget && {
        'data-drag-target': true,
      })}
      {...(isDropTarget && {
        'data-drop-target': true,
      })}
      style={{
        position: 'relative',
        width: nodeProps?.size?.x ?? '100%',
        height: nodeProps?.size?.y ?? '100%',
        pointerEvents: 'none',
      }}
    >
      <div
        className="layout-preset-zones"
        style={{
          height: '100%',
          width: '100%',
          position: 'absolute',
          zIndex: 4,
          pointerEvents: 'none',
          transition: 'opacity 300ms ease',
        }}
      >
        {presetsOverlay?.map(({ name, position, layout }) => (
          <div
            key={name}
            className={`layout-preset-zone ${layout}`}
            data-drag-target
            style={{
              position: 'absolute',
              pointerEvents: isDraggingChild ? 'all' : 'none',
              opacity: isDraggingChild ? 1 : 0,
              transition: isDraggingChild
                ? 'opacity 500ms ease 200ms, background-color 100ms ease'
                : '',
              ...position,
            }}
            onPointerOver={(e) => {
              e.stopPropagation()
              if (!draggingNodeIdRef) return

              e.currentTarget.toggleAttribute(
                'data-preset-drag-target-active',
                true,
              )
              const timeout = window.setTimeout(() => {
                onPresetPreview?.({
                  node: project.compositor.get(draggingNodeIdRef),
                  preset: name,
                  setLocalState,
                })
              }, 250)
              setPresetPreviewTimeout(timeout)
            }}
            onPointerLeave={(e) => {
              e.stopPropagation()
              if (!draggingNodeIdRef) return

              clearPresetTimeout(e.currentTarget)
            }}
            onPointerUp={(e) => {
              if (!draggingNodeIdRef) return

              clearPresetTimeout(e.currentTarget)
              onPresetSelect?.({
                node: project.compositor.get(draggingNodeIdRef),
                preset: name,
              })
            }}
          ></div>
        ))}
      </div>
      <div
        className="interactive-overlay"
        ref={interactiveRef}
        style={{
          width: (node.props?.isAudioOnly ?? false) ? '0%' : '100%',
          height: (node.props?.isAudioOnly ?? false) ? '0%' : '100%',
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
              <ElementTree key={x.id} nodeId={x.id} />
            ))}
          </ls-layout>
        </ErrorBoundary>
      </div>
    </div>
  )
}

const useForceUpdate = () => {
  const [_, setValue] = useState(0)
  return () => setValue((value) => value + 1)
}

const Root = (props: { setStyle: (CSS: string) => void }) => {
  const [tree, setTree] = useState<SceneNode>(null)
  const { projectId } = useContext(CompositorContext)
  const project = getProject(projectId)

  useEffect(() => {
    // Build the entire tree
    setTree(project.compositor.renderTree())

    return CoreContext.onInternal('NodeChanged', () => {
      // Traverse and update the tree
      setTree(project.compositor.renderTree())
    })
  }, [])

  useEffect(() => {
    const root = project.compositor.getRoot()
    const { x: rootWidth } = root.props.size

    const updateCSS = () => {
      const {
        bannerStyle = BannerStyle.DEFAULT,
        primaryColor = '#ABABAB',
        showNameBanners,
      } = project.props ?? {}

      const logoPosition =
        project.props?.logoPosition ??
        project.props?.logo?.logoPosition ??
        LogoPosition.TopRight

      if (!bannerStyle || !primaryColor || !logoPosition) return
      const CSS = themes[bannerStyle as BannerStyle](
        primaryColor,
        showNameBanners,
        rootWidth / 1920,
      )

      const logoCSS = themes[logoPosition as LogoPosition](rootWidth / 1920)

      props.setStyle(`${CSS} ${logoCSS}` || '')
    }
    updateCSS()
    return CoreContext.onInternal('ProjectChanged', updateCSS)
  }, [project])

  if (!tree) return null

  return (
    <div
      style={{
        userSelect: 'none',
        width: `${tree.props.size.x + PADDING * 2}px`,
        height: `${tree.props.size.y + PADDING * 2}px`,
        margin: PADDING + 'px',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        <ElementTree nodeId={tree.id} />
      </div>
    </div>
  )
}

let dragPreviewEl: HTMLElement
let wrapperEl: HTMLElement
let customStyleEl: HTMLStyleElement

const PADDING = 0

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
export const render = (settings: CompositorSettings) => {
  const {
    containerEl,
    projectId,
    interactive = false,
    checkDragTarget = scenelessProjectDragCheck,
    checkDropTarget = scenelessProjectDropCheck,
  } = settings
  const project = getProject(projectId)
  CoreContext.clients.LayoutApi().subscribeToLayout(project.layoutApi.layoutId)

  loadDragImage()

  if (!containerEl || !project) return

  if (!containerEl.shadowRoot) {
    containerEl.attachShadow({ mode: 'open' })
    customStyleEl = document.createElement('style')
    const baseStyleEl = document.createElement('style')
    baseStyleEl.textContent = getStyle()
    wrapperEl = document.createElement('div')
    wrapperEl.id = 'compositor-root'
    Object.assign(wrapperEl.style, {
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transformOrigin: 'center',
    })
    dragPreviewEl = document.createElement('div')
    dragPreviewEl.id = 'drag-preview'

    containerEl.shadowRoot.appendChild(baseStyleEl)
    containerEl.shadowRoot.appendChild(customStyleEl)
    containerEl.shadowRoot.appendChild(wrapperEl)
    containerEl.shadowRoot.appendChild(dragPreviewEl)

    // Scale and center the compositor to fit in the container
    const resizeObserver = new ResizeObserver((entries) => {
      setScale()
    })
    resizeObserver.observe(containerEl)
  }

  const root = project.compositor.getRoot()
  const { x: rootWidth, y: rootHeight } = root.props.size

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

    wrapperEl.style.willChange = `transform`
    wrapperEl.style.transform = `scale(${scale}) translateZ(0)`
    // @ts-ignore
    window.__scale = scale
    render()
  }

  const _root = createRoot(wrapperEl)
  const render = () => {
    _root.render(
      <CompositorProvider
        interactive={interactive}
        checkDragTarget={checkDragTarget}
        checkDropTarget={checkDropTarget}
        {...settings}
      >
        <Root
          setStyle={(CSS: string) => {
            customStyleEl.textContent = CSS
          }}
        />
      </CompositorProvider>,
    )
  }

  setScale()
}

/** This is a default check based on legacy behavior */
const scenelessProjectDragCheck = (node: SceneNode) => {
  return (
    node.props.name === 'Participant' ||
    node.props.sourceType === 'RoomParticipant' ||
    node.props.sourceType === 'RTMP' ||
    node.props.sourceType === 'Game'
  )
}

/** This is a default check based on legacy behavior */
const scenelessProjectDropCheck = (node: SceneNode) => {
  return node.props.name === 'Content'
}

type CompositorContext = {
  draggingNodeId: string | null
  setDraggingNodeId: (id: string) => void
} & CompositorSettings

export const CompositorContext = React.createContext<CompositorContext | null>(
  null,
)

const CompositorProvider = ({
  children,
  ...props
}: PropsWithChildren<CompositorSettings>) => {
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null)

  draggingNodeIdRef = draggingNodeId

  return (
    <CompositorContext.Provider
      value={{
        ...props,
        draggingNodeId,
        setDraggingNodeId,
      }}
    >
      {children}
    </CompositorContext.Provider>
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

.item-element {
  transition: opacity 150ms ease;
}

.interactive-overlay .interactive-overlay-hover {
  opacity: 0;
  pointer-events: none;
}

.interactive-overlay:hover .interactive-overlay-hover {
  opacity: 1;
  pointer-events: all;
}

.layout-preset-zone {
  background-color: rgba(0,0,0,0.6);
  outline: 2px solid rgba(255,255,255,0.3);
}

.layout-preset-zone[data-preset-drag-target-active] {
  background-color: rgba(255,255,255,0.3);
}

.layout-preset-zone.Alert[data-preset-drag-target-active] {
  background: rgba(88, 218, 175, 0.75) !important;
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

#compositor-root[data-dragging] * {
  cursor: grabbing !important;
}

#drag-preview {
  position: absolute;
  z-index: 2;
  top: 0;
  left: 0;
  width: 100px;
  height: 60px;
  opacity: 0;
  background: rgba(0,0,0,0.2);
  border: 3px solid rgba(255,255,255,0.3);
  pointer-events: none;
}
#drag-preview[data-active] {
  opacity: 1;
}
#compositor-root[data-drop-target-ready] ~ #drag-preview {
  display: none;
}

[data-drag-target] {}
[data-drag-target]:hover:not([data-drag-target-active]) > .interactive-overlay {
  box-shadow: 0 0 0 3px inset rgba(255, 255, 255, 0.5);
  cursor: grab;
}
[data-drop-target] {}
[data-drop-target]:hover {}
[data-drag-target][data-drag-target-active] > .interactive-overlay {
  border: 3px solid #ffff007d;
}
[data-drag-target][data-drag-target-active]:not([data-transform-drop-self-active]) > .interactive-overlay {
  border: 3px dashed #ffff007d;
}
#compositor-root[data-drop-target-ready] [data-drag-target][data-drag-target-active] > .item-element {
  opacity: 0.6;
}
[data-layout-drop-target-active] > .interactive-overlay {
  box-shadow: 0 0 0 3px inset yellow;
}
[data-transform-drop-target-active] > .interactive-overlay {
  box-shadow: 0 0 0 3px inset white;
}
`

export enum LogoPosition {
  TopLeft = 'top-left',
  TopRight = 'top-right',
  BottomLeft = 'bottom-left',
  BottomRight = 'bottom-right',
}

export enum BannerStyle {
  DEFAULT = 'default',
  MINIMAL = 'minimal',
  BUBBLE = 'bubble',
}

export enum PlatformType {
  TWITCH = 'twitch',
  YOUTUBE = 'youtube',
}

const themes = {
  [LogoPosition.TopLeft]: (scalar: number = 1280 / 1920) => {
    return `
      .wrapper {
       top:0;
       left:0;
    }`
  },
  [LogoPosition.TopRight]: (scalar: number = 1280 / 1920) => {
    return `
      .wrapper {
       top:0;
       right:0;
    }`
  },
  [LogoPosition.BottomLeft]: (scalar: number = 1280 / 1920) => {
    return `
      .wrapper {
       bottom:0;
       left:0;
    }`
  },
  [LogoPosition.BottomRight]: (scalar: number = 1280 / 1920) => {
    return `
      .wrapper {
       bottom:0;
       right:0;
    }`
  },
  [BannerStyle.DEFAULT]: (
    primaryColor: string = '#ABABAB',
    showNameBanners: boolean = true,
    scalar: number = 1280 / 1920,
  ) => {
    const textColor = color(primaryColor).lightness() < 0.6 ? '#FFF' : '#000'
    const chatBadgeBackgroundColor =
      color(primaryColor).lightness() < 0.6 ? '#FFF' : '#000'
    const chatBadgeTextColor =
      color(primaryColor).lightness() < 0.6 ? '#000' : '#FFF'
    const scale = (px: number) => px * scalar + 'px'

    return `
      .ChatOverlay {
        background: ${primaryColor} !important;
        margin-bottom: ${scale(40)} !important;
        transition: 300ms ease all;
        left: 0;

        /* Default Size 4 */
        font-size: ${scale(44)} !important;
        padding: ${scale(40)} ${scale(100)} !important;
        border-radius: ${scale(20)} !important;
      }
      
      .ChatOverlay-badge-icon {
          width:${scale(32)};
          height: ${scale(32)};
          fill: currentcolor;
          color: ${chatBadgeTextColor};
      }

       .ChatOverlay-badge-container {
          background-color:${chatBadgeBackgroundColor};
          display:flex;
          flex-direction:row;
          padding: ${scale(6)} ${scale(12)} ${scale(6)} ${scale(6)};
          border-radius: ${scale(10)};
          align-items: center;
          border-bottom-left-radius: 0px !important;
          position: relative;
          border: none;
          cursor: pointer;
       }
      
       .ChatOverlay-badge-username {
          color:${chatBadgeTextColor};
          padding:${scale(6)};
          font-size:${scale(18)};
          font-weight:700;
          text-transform: capitalize; 
       }
       
       .ChatOverlay-badge-container::before {
          content:"";
          width:15px;
          height:15px;
          background-color:${chatBadgeBackgroundColor};
          position: absolute;
          bottom:-14px;
          left:0;
          clip-path:polygon(0 100%, 12% 87%, 26% 73%, 45% 53%, 59% 40%, 71% 28%, 85% 14%, 100% 0, 0 0);
        }
       

       .ChatOverlay-avatar {
          height: ${scale(120)};
          width: ${scale(120)};
          left:0;
          right:0;
          top:0;
          bottom:0;
          border-radius:50%;
       }

      .Banner, .NameBanner, .ChatOverlay {
        background: ${primaryColor} !important;
        margin-bottom: ${scale(40)} !important;
        transition: 300ms ease all;
        left: 0;

        /* Default Size 4 */
        font-size: ${scale(44)} !important;
        padding: ${scale(40)} ${scale(100)} !important;
        border-top-right-radius: ${scale(20)} !important;
        border-bottom-right-radius: ${scale(20)} !important;
      }

      .Banner-body, .NameBanner-body, .ChatOverlay-body {
        color: ${textColor} !important;
        font-family: 'Roboto' !important;
        font-style: normal !important;
        font-weight: 700 !important;
        line-height: 120% !important;
      }

      .NameBanner {
        transform-origin: 0 100%;
        margin: 0 !important;
        transform: translateX(-100%);
        opacity: 0 !important;
        white-space: nowrap;
        ${
          showNameBanners &&
          `
          opacity: 1 !important;
          transform: translateX(0);
        `
        }
      }

      .NameBanner[data-size="4"] {
        padding: ${scale(40)} ${scale(100)} !important;
        font-size: ${scale(44)} !important;
        border-top-right-radius: ${scale(20)} !important;
        border-bottom-right-radius: ${scale(20)} !important;
      }
      .NameBanner[data-size="3"] {
        padding: ${scale(12)} ${scale(30)} !important;
        font-size: ${scale(44)} !important;
        border-top-right-radius: ${scale(20)} !important;
        border-bottom-right-radius: ${scale(20)} !important;
      }
      .NameBanner[data-size="2"] {
        padding: ${scale(12)} ${scale(20)} !important;
        font-size: ${scale(28)} !important;
        border-top-right-radius: ${scale(16)} !important;
        border-bottom-right-radius: ${scale(16)} !important;
      }
      .NameBanner[data-size="1"], .NameBanner[data-size="0"] {
        padding: ${scale(8)} ${scale(8)} !important;
        font-size: ${scale(20)} !important;
        border-top-right-radius: ${scale(8)} !important;
        border-bottom-right-radius: ${scale(8)} !important;
      }
      .NameBanner[data-size="0"] {
        opacity: 0;
        transform: translateX(-100%);
      }
    `
  },
  [BannerStyle.MINIMAL]: (
    primaryColor: string = '#ABABAB',
    showNameBanners: boolean = true,
    scalar = 1280 / 1920,
  ) => {
    const textColor = 'white'
    const chatBadgeBackgroundColor = '#fff'
    const chatBadgeTextColor = '#000'

    const scale = (px: number) => px * scalar + 'px'

    return `

      .ChatOverlay-badge-icon {
          width:${scale(32)};
          height: ${scale(32)};
          fill: currentcolor;
          color: ${chatBadgeTextColor};
      }

       .ChatOverlay-badge-container {
          background-color:${chatBadgeBackgroundColor};
          display:flex;
          flex-direction:row;
          padding: ${scale(6)} ${scale(12)} ${scale(6)} ${scale(6)};
          align-items: center;
          position: relative;
          border: none;
          cursor: pointer;
       }

       .ChatOverlay-badge-username {
          color:${chatBadgeTextColor};
          padding:${scale(6)};
          font-size:${scale(18)};
          font-weight:700;
          text-transform: capitalize; 
       }

       .ChatOverlay-avatar {
          height: ${scale(120)};
          width: ${scale(120)};
          left:0;
          right:0;
          top:0;
          bottom:0;
          border-radius:50%;
       }


    .Banner, .NameBanner, .ChatOverlay {
        background: ${color(primaryColor)
          .fade(color(primaryColor).alpha() * 0.7)
          .toString()} !important;
        padding: ${scale(40)} ${scale(40)} ${scale(40)} ${scale(60)} !important;
        position: relative !important;
        margin-bottom: ${scale(40)} !important;
        transition: 300ms ease all;
        font-size: ${scale(34)} !important;
        left: 0;
      }

      .Banner:before, .NameBanner:before, .ChatOverlay:before {
        z-index: 1;
        content: "";
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.6);
        transition: 300ms ease all;
        opacity: ${color(primaryColor).alpha()};
      }
      .Banner:after, .NameBanner:after, .ChatOverlay:after {
        z-index: 1;
        content: "";
        position: absolute;
        left: 0;
        top: 0;
        height: 100%;
        transition: 300ms ease all;
        width: ${scale(20)};
        background: ${color(primaryColor)};
        opacity: ${color(primaryColor).alpha()};
      }
      .Banner-body, .NameBanner-body, .ChatOverlay-body {
        color: ${textColor} !important;
        font-family: 'Roboto' !important;
        font-style: normal !important;
        font-weight: 700 !important;
        line-height: 120% !important;
        position: relative;
        z-index: 2;
      }
      .Banner-header {
        font-size: ${scale(90)};
        position: relative;
        z-index: 2;
      }
      .NameBanner {
        transform-origin: 0 100%;
        margin: 0 !important;
        transform: translateX(-100%);
        opacity: 0 !important;
        white-space: nowrap;
        ${
          showNameBanners &&
          `
          opacity: 1 !important;
          transform: translateX(0);
        `
        }
      }

      .NameBanner[data-size="4"] {
        padding: ${scale(40)} ${scale(40)} ${scale(40)} ${scale(
          40 + 20,
        )} !important;
        font-size: ${scale(34)} !important;
      }
      .NameBanner[data-size="3"] {
        padding: ${scale(16)} ${scale(40)} ${scale(16)} ${scale(
          40 + 20,
        )} !important;
        font-size: ${scale(34)} !important;
      }
      .NameBanner[data-size="2"] {
        padding: ${scale(12)} ${scale(24)} ${scale(12)} ${scale(
          24 + 20,
        )} !important;
        font-size: ${scale(24)} !important;
      }
      .NameBanner[data-size="1"], .NameBanner[data-size="0"] {
        padding: ${scale(12)} ${scale(16)} ${scale(12)} ${scale(
          16 + 20,
        )} !important;
        font-size: ${scale(18)} !important;
      }
      .NameBanner[data-size="0"] {
        opacity: 0 !important;
        transform: translateX(-100%);
      }
    `
  },
  [BannerStyle.BUBBLE]: (
    primaryColor: string = '#ABABAB',
    showNameBanners: boolean = true,
    scalar = 1280 / 1920,
  ) => {
    const textColor = color(primaryColor).lightness() < 0.6 ? '#FFF' : '#000'
    const chatBadgeBackgroundColor =
      color(primaryColor).lightness() < 0.6 ? '#FFF' : '#000'
    const chatBadgeTextColor =
      color(primaryColor).lightness() < 0.6 ? '#000' : '#FFF'

    const scale = (px: number) => px * scalar + 'px'

    return `
      .ChatOverlay-badge-icon {
          width:${scale(32)};
          height: ${scale(32)};
          fill: currentcolor;
          color: ${chatBadgeTextColor};
      }


       .ChatOverlay-badge-container {
          background-color:${chatBadgeBackgroundColor};
          display:flex;
          flex-direction:row;
          padding: ${scale(6)} ${scale(12)} ${scale(6)} ${scale(6)};
          align-items: center;
          z-index: 1;
          border: none;
          cursor: pointer;
          top: 0;
          margin-bottom: 2px;
          margin-left: -${scale(30)};
          border-radius: 30px;
       }

       .ChatOverlay-badge-username {
          color:${chatBadgeTextColor};
          padding:${scale(6)};
          font-size:${scale(18)};
          font-weight:700;
          text-transform: capitalize; 
       }

       .ChatOverlayAvatar-container {
          height: ${scale(120)};
          width: ${scale(120)};
          top: 0;
       }
       .ChatOverlay-avatar {
          height: ${scale(120)};
          width: ${scale(120)};
          left:0;
          right:0;
          top:0;
          bottom:0;
          border-radius:50%;
       }


      .Banner, .ChatOverlay {
        transform: translateX(-50%);
        left: 50%;
        margin-bottom: ${scale(40)} !important;
      }

      .Banner, .NameBanner, .ChatOverlay {
        background: ${color(primaryColor)} !important;
        color: ${textColor} !important;
        border-radius: 500px !important;
        transition: 300ms ease all;

        /* Default Style */
        border: 4px solid ${textColor} !important;
        padding: ${scale(40)} ${scale(80)} !important;
        font-size: ${scale(40)} !important;
      }
      .Banner-body, .NameBanner-body, .ChatOverlay-body {
        color: ${textColor} !important;
        text-align: center !important;
        font-family: 'Roboto' !important;
        font-style: normal !important;
        font-weight: 700 !important;
        line-height: 120% !important;
      }
      .NameBanner {
        transform-origin: 0% 100%;
        transform: translateX(-100%);
        opacity: 0 !important;
        white-space: nowrap;
        ${
          showNameBanners &&
          `
          opacity: 1 !important;
          transform: translateX(0);
        `
        }
      }

      ls-layout[layout="Presentation"][props*="\\"cover\\"\\:true"] > :first-child .NameBanner {
        top: 0% !important;
        transform: translateY(0%) !important;
        margin: ${scale(20)} ${scale(20)};
      }


      .NameBanner[data-size="4"] {
        padding: ${scale(40)} ${scale(80)} ${scale(40)} ${scale(80)} !important;
        font-size: ${scale(40)} !important;
      }
      .NameBanner[data-size="3"] {
        padding: ${scale(12)} ${scale(30)} ${scale(12)} ${scale(30)} !important;
        font-size: ${scale(40)} !important;
        margin: -${scale(20)} ${scale(20)};
      }
      .NameBanner[data-size="2"] {
        padding: ${scale(12)} ${scale(30)} ${scale(12)} ${scale(30)} !important;
        font-size: ${scale(26)} !important;
        margin: -${scale(8)} ${scale(8)};
      }
      .NameBanner[data-size="1"], .NameBanner[data-size="0"] {
        padding: ${scale(8)} ${scale(16)} ${scale(8)} ${scale(16)} !important;
        font-size: ${scale(18)} !important;
        border-width: ${scale(2)} !important;
        margin: -${scale(16)} ${scale(8)};
      }
      .NameBanner[data-size="0"] {
        opacity: 0 !important;
        transform: translateX(-100%);
      }
    `
  },
}
