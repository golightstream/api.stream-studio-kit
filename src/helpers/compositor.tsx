/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import { swapItems } from '../logic'
import { getProject } from '../core/data'
import { CoreContext, log, InternalProject } from '../core/context'
import { Compositor } from '../core/namespaces'
import { CompositorSettings, SceneNode } from '../core/types'
import { color } from 'csx'

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
const ElementTree = (props: { nodeId: string }) => {
  const transformRef = useRef<HTMLDivElement>()
  const rootRef = useRef<HTMLDivElement>()
  const {
    project,
    interactive = true,
    onElementDoubleClick,
    checkIsDragTarget,
    checkIsDropTarget,
  } = useContext(CompositorContext)
  const { nodeId } = props
  const node = project.compositor.get(nodeId)
  if (!node) return null

  const element = CoreContext.compositor.getElement(node)
  const layout = node.props.layout || 'Row'

  const isDragTarget = interactive && checkIsDragTarget(node)
  const isDropTarget = interactive && checkIsDropTarget(node)

  let layoutDragHandlers = isDropTarget
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

  let transformDragHandlers = isDragTarget
    ? {
        draggable: true,
        // If a target is draggable, it will also be treated as
        //  a drop target (swap element positions)
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
      Object.assign(element.root, transformDragHandlers)
      // TODO: Add element over top the root (don't put drag handlers on the root)
      Object.assign(element.root.style, {
        pointerEvents: isDragTarget ? 'all' : 'none',
        width: '100%',
        height: '100%',
        position: 'relative',
        ...(node.props.style || {}),
      })
      element.root.addEventListener('dblclick', onDoubleClick)
    }
    return () => element?.root.removeEventListener('dblclick', onDoubleClick)
  }, [transformRef.current, element])

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
            <ElementTree key={x.id} nodeId={x.id} />
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

const Root = (props: { setStyle: (CSS: string) => void }) => {
  const { project } = useContext(CompositorContext)
  const [tree, setTree] = useState<SceneNode>(null)

  useEffect(() => {
    // Build the entire tree
    setTree(project.compositor.renderTree())

    return CoreContext.onInternal('NodeChanged', () => {
      // Traverse and update the tree
      setTree(project.compositor.renderTree())
    })
  }, [])

  useEffect(() => {
    const updateCSS = () => {
      const { bannerStyle = BannerStyle.DEFAULT, primaryColor = '#ABABAB', showNameBanners } = (project.props ?? {})
      if (!bannerStyle || !primaryColor) return
      const CSS = themes[bannerStyle as BannerStyle](
        primaryColor,
        showNameBanners,
      )

      console.log('injecting', CSS);
      props.setStyle(CSS || '')
    }
    updateCSS()
    return CoreContext.onInternal('ProjectChanged', updateCSS)
  }, [project])

  if (!tree) return null

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
        width: tree.props.size.x + 'px',
        height: tree.props.size.y + 'px',
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

let wrapperEl: HTMLElement
let customStyleEl: HTMLStyleElement

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
    dragAndDrop = false,
    dblClickShowcase = dragAndDrop,
    checkDragTarget = scenelessProjectDragCheck,
    checkDropTarget = scenelessProjectDropCheck,
  } = settings
  const project = getProject(projectId)
  CoreContext.clients.LayoutApi().subscribeToLayout(project.layoutApi.layoutId)

  const onElementDoubleClick =
    settings.onElementDoubleClick ||
    (dblClickShowcase && scenelessProjectDoubleClick(project))

  if (!containerEl || !project) return

  if (!containerEl.shadowRoot) {
    containerEl.attachShadow({ mode: 'open' })
    customStyleEl = document.createElement('style')
    const baseStyleEl = document.createElement('style')
    baseStyleEl.textContent = getStyle()
    wrapperEl = document.createElement('div')
    Object.assign(wrapperEl.style, {
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transformOrigin: 'center',
    })
    containerEl.shadowRoot.appendChild(baseStyleEl)
    containerEl.shadowRoot.appendChild(customStyleEl)
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
      <CompositorProvider
        project={project}
        interactive={dragAndDrop}
        onElementDoubleClick={onElementDoubleClick}
        checkIsDropTarget={checkDropTarget}
        checkIsDragTarget={checkDragTarget}
      >
        <Root
          setStyle={(CSS: string) => {
            customStyleEl.textContent = CSS
          }}
        />
      </CompositorProvider>,
      wrapperEl,
    )
  }

  setScale()
}

type CompositorContext = {
  interactive: boolean
  project: InternalProject
  checkIsDragTarget: (node: SceneNode) => boolean
  checkIsDropTarget: (node: SceneNode) => boolean
  onElementDoubleClick: (node: SceneNode) => void
}

/** This is a default check based on legacy behavior */
const scenelessProjectDragCheck = (node: SceneNode) => {
  return (
    node.props.name === 'Participant' ||
    node.props.sourceType === 'RoomParticipant'
  )
}

/** This is a default check based on legacy behavior */
const scenelessProjectDropCheck = (node: SceneNode) => {
  return node.props.name === 'Content'
}

/** This is a default based on legacy behavior */
const scenelessProjectDoubleClick =
  (project: InternalProject) => (node: SceneNode) => {
    const content = project.compositor.nodes.find(
      (x) => x.props.name === 'Content',
    )
    if (content) {
      const showcase = content.props.layoutProps?.showcase
      CoreContext.Command.updateNode({
        nodeId: content.id,
        props: {
          layoutProps: {
            ...content.props.layoutProps,
            showcase: showcase === node.id ? null : node.id,
          },
        },
      })
    }
  }

/** This is a default based on legacy behavior */
const scenelessProjectCSS = (project: InternalProject) => (CSS: string) => {}

export const CompositorContext = React.createContext<CompositorContext>({
  interactive: false,
  project: null,
  checkIsDragTarget: () => false,
  checkIsDropTarget: () => false,
  onElementDoubleClick: () => {},
})

type ContextProps = CompositorContext & {
  children: React.ReactChild
}

const CompositorProvider = ({ children, ...props }: ContextProps) => {
  return (
    <CompositorContext.Provider
      value={{
        ...props,
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
  bottom: 0px;
  left: 0px;
  height: 30px;
  background: linear-gradient(90deg, rgba(0, 0, 0, 0.5) 50%, rgba(0, 0, 0, 0) 100%);
  padding: 0px 0px 0px 10px;
  color: rgba(255, 255, 255, 0.9);
  font-weight: bold;
  line-height: 30px;
  width: 100%;
  font-size: 28px;
}
`

export enum BannerStyle {
  DEFAULT = 'default',
  MINIMAL = 'minimal',
  BUBBLE = 'bubble',
}
const themes = {
  [BannerStyle.DEFAULT]: (
    primaryColor: string = '#ABABAB',
    showNameBanners: boolean = true,
    scalar = 1280 / 1920,
  ) => {
    const textColor = color(primaryColor).lightness() < 0.6 ? '#FFF' : '#000'
    const scale = (px: number) => px * scalar + 'px'

    return `
      .Banner, .NameBanner {
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
      .Banner-body, .NameBanner-body {
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
    const scale = (px: number) => px * scalar + 'px'

    return `
    .Banner, .NameBanner {
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
      .Banner:before, .NameBanner:before {
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
      .Banner:after, .NameBanner:after {
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
      .Banner-body, .NameBanner-body {
        color: ${textColor} !important;
        font-family: 'Roboto' !important;
        font-style: normal !important;
        font-weight: 700 !important;
        line-height: 120% !important;
        position: relative;
        z-index: 2;
      }
      .Banner-header {
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
        padding: ${scale(40)} ${scale(40)} ${scale(40)} ${scale(40 + 20)} !important;
        font-size: ${scale(34)} !important;
      }
      .NameBanner[data-size="3"] {
        padding: ${scale(16)} ${scale(40)} ${scale(16)} ${scale(40 + 20)} !important;
        font-size: ${scale(34)} !important;
      }
      .NameBanner[data-size="2"] {
        padding: ${scale(12)} ${scale(24)} ${scale(12)} ${scale(24 + 20)} !important;
        font-size: ${scale(24)} !important;
      }
      .NameBanner[data-size="1"], .NameBanner[data-size="0"] {
        padding: ${scale(12)} ${scale(16)} ${scale(12)} ${scale(16 + 20)} !important;
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
    const scale = (px: number) => px * scalar + 'px'

    return `
      .Banner {
        transform: translateX(-50%);
        left: 50%;
        margin-bottom: ${scale(40)} !important;
      }

      .Banner, .NameBanner {
        background: ${color(primaryColor)} !important;
        color: ${textColor} !important;
        border-radius: 500px !important;
        transition: 300ms ease all;

        /* Default Style */
        border: 4px solid ${textColor} !important;
        padding: ${scale(40)} ${scale(80)} !important;
        font-size: ${scale(40)} !important;
      }
      .Banner-body, .NameBanner-body {
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

      .NameBanner[data-size="4"] {
        padding: ${scale(40)} ${scale(80)} ${scale(40)} ${scale(80)} !important;
        font-size: ${scale(40)} !important;
      }
      .NameBanner[data-size="3"] {
        padding: ${scale(12)} ${scale(30)} ${scale(12)} ${scale(30)} !important;
        font-size: ${scale(40)} !important;
        margin: ${scale(20)} ${scale(20)};
      }
      .NameBanner[data-size="2"] {
        padding: ${scale(12)} ${scale(30)} ${scale(12)} ${scale(30)} !important;
        font-size: ${scale(26)} !important;
        margin: ${scale(8)} ${scale(8)};
      }
      .NameBanner[data-size="1"], .NameBanner[data-size="0"] {
        padding: ${scale(8)} ${scale(16)} ${scale(8)} ${scale(16)} !important;
        font-size: ${scale(18)} !important;
        border-width: ${scale(2)} !important;
        margin: ${scale(16)} ${scale(8)};
      }
      .NameBanner[data-size="0"] {
        opacity: 0 !important;
        transform: translateX(-100%);
      }
    `
  },
}
