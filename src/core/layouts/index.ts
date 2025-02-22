/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { html } from 'lighterhtml'
import { CSSProperties } from 'react'
import { LayoutDeclaration, Transition } from '../../compositor/layouts'
import { getProject } from '../data'
import CoreContext from '../context'
import { Scene, SceneNode } from '../types'
import { isEmpty } from 'lodash-es'

type LayoutFreeProps = {
  size: { x: string; y: string }
  position: { x: string; y: string }
  opacity: number
}

/**
 * Calculates the z-index for a node in a layered layout
 * For image-iframe-overlay layouts:
 * - Uses props.order array to determine z-index if node ID is in the order array
 * - Higher z-index = appears on top
 * - Nodes not in order array get default z-index based on array position
 * 
 * For other layouts:
 * - Simply returns index + 1 as the z-index
 */
const calculateZIndex = (props: LayoutLayeredProps | {}, node: SceneNode, i: number) => {
  // Type guard to check if props is a LayoutLayeredProps
  if (!props || !('type' in props) || props.type !== 'image-iframe-overlay') return i + 1;
 
  const nodePropId = CoreContext.compositor.getNode(node.id.split('-')[0])?.props?.id;
  
  return !nodePropId || !props.order?.includes(nodePropId)
    ? i + 1
    : props.order.length - props.order.indexOf(nodePropId);
 };

const getPresetStyle = (preset: string) => {
  const project = getProject(CoreContext.state.activeProjectId)
  const root = project.compositor.getRoot()
  const { x: rootWidth, y: rootHeight } = root.props.size
  const scaleTo = 1;
  const alertWidthPercentage = ((507 * scaleTo) / rootWidth) * 100
  const alertHeightPercentage = ((153 * scaleTo) / rootHeight) * 100
  
  const baseStyle = {
    position: 'absolute' as 'absolute',
    width: `${alertWidthPercentage}%`,
    height: `${alertHeightPercentage}%`,
  }

  switch (preset) {
    case 'center': {
      return {
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        margin: 'auto',
        ...baseStyle,
      }
    }

    case 'top-left': {
      return {
        top: 0,
        left: 0,
        ...baseStyle,
      }
    }
    case 'top-right': {
      return {
        top: 0,
        right: 0,
        ...baseStyle,
      }
    }
    case 'top-center': {
      return {
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        ...baseStyle,
      }
    }
    case 'bottom-left': {
      return {
        bottom: 0,
        left: 0,
        ...baseStyle,
      }
    }
    case 'bottom-right': {
      return {
        bottom: 0,
        right: 0,
        ...baseStyle,
      }
    }
    case 'bottom-center': {
      return {
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        ...baseStyle,
      }
    }
    case 'center-left': {
      return {
        top: '50%',
        left: 0,
        transform: 'translateY(-50%)',
        ...baseStyle,
      }
    }
    case 'center-right': {
      return {
        top: '50%',
        right: 0,
        transform: 'translateY(-50%)',
        ...baseStyle,
      }
    }
  }
}
export const Free = {
  name: 'Free',
  layout: ({ props, children, size }) => {
    return children.reduce((acc, x) => {
      const {
        size = { x: '100%', y: '100%' },
        position = { x: 0, y: 0 },
        opacity = 1,
      } = x.props

      return {
        ...acc,
        [x.id]: {
          position: {
            x: position.x,
            y: position.y,
          },
          size: {
            x: size.x,
            y: size.y,
          },
          opacity,
        },
      }
    }, {})
  },
} as LayoutDeclaration<LayoutFreeProps>

type LayoutColumnProps = {
  cover?: boolean
  justify?: CSSProperties['justifyContent']
  align?: CSSProperties['alignItems']
  useGrid?: boolean
  reverse?: boolean
  dimensions?: number
  margin?: {
    left?: number
    right?: number
    top?: number
    bottom?: number
    between?: number
  }
  entryTransition?: (i: number) => Transition
  exitTransition?: (i: number) => Transition
}
export const Column = {
  name: 'Column',
  layout: ({ props = {}, children, size }) => {
    let {
      justify = 'center',
      align = 'center',
      cover = false,
      margin = {},
      dimensions = 16 / 9,
      reverse = false,
      entryTransition = () => ({}),
      exitTransition = () => ({}),
    } = props
    const defaultMargin = cover ? 0 : Math.min(size.y / 6, 12)

    margin = {
      left: defaultMargin,
      right: defaultMargin,
      top: defaultMargin,
      bottom: defaultMargin,
      between: defaultMargin,
      ...margin,
    }

    const innerHeight = size.y - margin.top - margin.bottom
    const innerWidth = size.x - margin.left - margin.right
    const totalMarginBetween = margin.between * ((children.length || 1) - 1)

    const itemWidth = Math.min(
      innerWidth,
      ((innerHeight - totalMarginBetween) / (children.length || 1)) *
        dimensions,
    )
    const itemHeight = itemWidth / dimensions

    return html.node`
      <div style=${{
        height: '100%',
        width: cover ? size.x + 'px' : 'auto',
        display: 'flex',
        flexDirection: reverse ? 'column-reverse' : 'column',
        justifyContent: justify,
        alignItems: align,
        paddingLeft: margin.left + 'px',
        paddingTop: margin.top + 'px',
        paddingBottom: margin.bottom + 'px',
        paddingRight: margin.right + 'px',
      }}>
      ${children.map(
        (x, i) =>
          html.node`<div data-node-id=${x.id} .data=${{
            entryTransition: {
              delay: 400 + i * 100,
              offset: { x: 0, y: '100%' },
              scale: { x: 0.8, y: 0.8 },
              opacity: 0,
              ...entryTransition(i),
            },
            exitTransition: {
              offset: { x: 0, y: 1000 },
              scale: { x: 0.8, y: 0.8 },
              opacity: 0,
              ...exitTransition(i),
            },
            borderRadius: cover ? 0 : 5,
          }} style=${{
            display: 'flex',
            width: cover ? '100%' : itemWidth + 'px',
            height: cover ? itemHeight + 'px' : 'auto',
            aspectRatio: dimensions,
            marginBottom: i === children.length - 1 ? 0 : margin.between + 'px',
            flexGrow: 0,
            flexShrink: 1,
            flexBasis: itemHeight + 'px',
          }}></div>`,
      )}
      </div>
    `
  },
} as LayoutDeclaration<LayoutColumnProps>

type LayoutRowProps = {
  cover?: boolean
  justify?: CSSProperties['justifyContent']
  align?: CSSProperties['alignItems']
  useGrid?: boolean
  reverse?: boolean
  dimensions?: number
  maxWidth?: number
  margin?: {
    left?: number
    right?: number
    top?: number
    bottom?: number
    between?: number
  }
  entryTransition?: (i: number) => Transition
  exitTransition?: (i: number) => Transition
}
export const Row = {
  name: 'Row',
  layout: ({ props = {}, children, size }) => {
    let {
      justify = 'center',
      align = 'center',
      cover = false,
      margin = {},
      dimensions,
      maxWidth = 1,
      reverse = false,
      entryTransition = () => ({}),
      exitTransition = () => ({}),
    } = props
    const defaultMargin = cover ? 0 : Math.min(size.y / 6, 12)
    margin = {
      left: defaultMargin,
      right: defaultMargin,
      top: defaultMargin,
      bottom: defaultMargin,
      between: defaultMargin,
      ...margin,
    }

    const innerHeight = size.y - margin.top - margin.bottom
    const innerWidth = size.x - margin.left - margin.right
    const totalMarginBetween = margin.between * ((children.length || 1) - 1)

    let itemHeight = innerHeight
    let itemWidth = Math.min(
      (innerWidth - totalMarginBetween) / (children.length || 1),
      dimensions ? innerHeight * dimensions : innerWidth,
      maxWidth * size.x,
    )

    if (dimensions) {
      itemHeight = itemWidth / dimensions
    }

    return html.node`
      <div style=${{
        height: cover ? size.y + 'px' : 'auto',
        width: '100%',
        display: 'flex',
        flexDirection: reverse ? 'row-reverse' : 'row',
        justifyContent: justify,
        alignItems: align,
        paddingLeft: margin.left + 'px',
        paddingTop: margin.top + 'px',
        paddingBottom: margin.bottom + 'px',
        paddingRight: margin.right + 'px',
      }}>
          ${children.map(
            (x, i) =>
              html.node`<div data-node-id=${x.id} .data=${{
                entryTransition: {
                  delay: 400 + i * 100,
                  offset: { x: 0, y: '100%' },
                  scale: { x: 0.8, y: 0.8 },
                  opacity: 0,
                  ...entryTransition(i),
                },
                exitTransition: {
                  offset: { x: 0, y: 1000 },
                  scale: { x: 0.8, y: 0.8 },
                  opacity: 0,
                  ...exitTransition(i),
                },
                borderRadius: cover ? 0 : 5,
              }} style=${{
                display: 'flex',
                height: cover ? '100%' : itemHeight + 'px',
                width: itemWidth + 'px',
                marginRight:
                  i === children.length - 1 ? 0 : margin.between + 'px',
                flexGrow: 0,
                flexShrink: 1,
                flexBasis: itemWidth + 'px',
              }}></div>`,
          )}
      </div>
    `
  },
} as LayoutDeclaration<LayoutRowProps>

type LayoutGridProps = {
  cover?: boolean
  dimensions?: number
  numPerRow?: number
  maxWidth?: number
  margin?: number
  between?: number
}

const toMatrix = <T>(arr: T[], width: number) => {
  return arr.reduce(
    (rows, key, index) =>
      (index % width == 0
        ? rows.push([index])
        : rows[rows.length - 1].push(index)) && rows,
    [],
  )
}

export const Grid = {
  name: 'Grid',
  layout: ({ props = {}, children, size }) => {
    let {
      dimensions,
      numPerRow,
      margin,
      cover = false,
      maxWidth,
      between,
    } = props

    const defaultMargin =
      children.length === 0 || cover
        ? 0
        : between || Math.min(size.y / children.length / 10, 30)

    margin = margin ?? defaultMargin
    const isTall = size.x < size.y

    between = typeof between === 'number' ? between : margin

    let rows = [] as Array<number[]>
    if (numPerRow) {
      rows = toMatrix(children, numPerRow)
    } else {
      rows = isTall
        ? getTallGrid(children.length)
        : getWideGrid(children.length)
    }

    const rowHeight =
      (size.y - (margin * 2 + between * (rows.length - 1))) / rows.length
    const rowWidth = size.x - margin * 2

    return html.node`
    <div style=${{
      display: 'flex',
      width: '100%',
      height: '100%',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: margin + 'px',
      gap: between + 'px',
      flexGrow: 0,
    }}>${rows.map((row, i) =>
      Row.layout({
        props: {
          justify: 'center',
          dimensions,
          cover,
          maxWidth: maxWidth || 1 / (rows[0].length || 1),
          margin: {
            top: 0,
            right: 0,
            left: 0,
            bottom: 0,
            between,
          },
        },
        children: row.map((index: number) => children[index]),
        size: {
          y: rowHeight,
          x: rowWidth,
        },
      }),
    )}</div>`
  },
} as LayoutDeclaration<LayoutGridProps>

type LayoutPresentationProps = {
  cover?: boolean
  margin?: number
  barWidth?: number
  barOrientation?: 'vertical' | 'horizontal'
  presentationDimensions?: number
  viewerDimensions?: number
  justifyViewers?: CSSProperties['justifyContent']
  useGrid?: boolean
  reverse?: boolean
}

export const Presentation = {
  name: 'Presentation',
  layout: ({ props = {}, children, size }) => {
    let {
      margin,
      cover = false,
      barWidth = 0.2,
      barOrientation = 'vertical',
      presentationDimensions = 16 / 9,
      viewerDimensions = 16 / 9,
      justifyViewers = 'center',
      useGrid = false,
      reverse = false,
    } = props
    const barWidthPx =
      barOrientation === 'vertical' ? size.x * barWidth : size.y * barWidth
    const presentation = children[0]
    const viewers = children.filter((x) => x !== presentation)
    const defaultMargin = children.length <= 1 ? 0 : Math.min(size.x / 80, 30)
    margin = margin ?? defaultMargin

    // TODO: Consider implementing this dynamic logic based on screenshare availability
    if (!presentation) return Grid.layout({ props, children, size })

    const hasSidebar = children[1]

    const mainSize = { ...size }
    if (hasSidebar) {
      if (barOrientation === 'vertical') {
        mainSize.x = size.x - barWidthPx
        mainSize.y = mainSize.x / presentationDimensions
      } else {
        mainSize.y = size.y - barWidthPx
        mainSize.x = mainSize.y * presentationDimensions
      }
    }

    let Bar,
      barProps = {}
    if (useGrid) {
      Bar = Grid.layout
      barProps = {
        cover,
        ...(cover ? { maxWidth: 1 } : { margin }),
      }
    } else {
      Bar = barOrientation === 'vertical' ? Column.layout : Row.layout
      barProps = {
        margin: {
          top: margin,
          left: margin,
          bottom: margin,
          right: margin,
          between: margin,
        },
        dimensions: viewerDimensions,
        justify: justifyViewers,
        align: 'flex-end',
        entryTransition: () => ({
          offset:
            barOrientation === 'vertical'
              ? {
                  x: reverse ? '-100%' : '100%',
                  y: 0,
                }
              : { x: 0, y: reverse ? '-100%' : '100%' },
        }),
        exitTransition: () => ({
          offset:
            barOrientation === 'vertical'
              ? {
                  x: reverse ? -1000 : 1000,
                  y: 0,
                }
              : { x: 0, y: reverse ? -1000 : 1000 },
        }),
      }
    }

    const barDirection =
      barOrientation === 'vertical'
        ? reverse
          ? 'left'
          : 'right'
        : reverse
          ? 'top'
          : 'bottom'

    return html.node`
      <div style=${{
        display: 'flex',
        flexDirection:
          (barOrientation === 'vertical' ? 'row' : 'column') +
          (reverse ? '-reverse' : ''),
        justifyContent: 'space-around',
        alignItems: 'center',
        position: 'relative',
        padding: cover ? 0 : margin,
        [`padding-${barDirection}`]: 0,
      }}>
        ${
          children[0] &&
          html.node`<div style=${{
            // aspectRatio: String(presentationDimensions),
            width: mainSize.x,
            height: mainSize.y,
            display: 'flex',
            flexGrow: 1,
          }}>
            <div data-node-id=${presentation.id} .data=${{
              dimensions: presentationDimensions,
              borderRadius: cover ? 0 : 5,
              entryTransition: {
                delay: 0,
                offset: { x: 0, y: 1000 },
                scale: { x: 0.5, y: 0.5 },
                opacity: 0,
              },
              exitTransition: {
                offset: { x: 0, y: 1000 },
                scale: { x: 2, y: 2 },
                opacity: 0,
              },
            }} style=${{
              width: '100%',
              height: '100%',
              ...(cover
                ? {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width:
                      useGrid && hasSidebar
                        ? 100 - barWidth * 100 + '%'
                        : '100%',
                    height: '100%',
                  }
                : {}),
            }} />
          </div>`
        }
        ${html.node`<div style=${{
          ...(barOrientation === 'vertical'
            ? {
                maxWidth: barWidth * 100 + '%',
                height: '100%',
              }
            : {
                maxHeight: barWidth * 100 + '%',
                width: '100%',
              }),
        }}>${
          hasSidebar &&
          Bar({
            props: barProps,
            children: viewers,
            size:
              barOrientation === 'vertical'
                ? { x: barWidthPx, y: size.y }
                : { x: size.x, y: barWidthPx },
          })
        }</div>`}
      </div>
    `
  },
} as LayoutDeclaration<LayoutPresentationProps>

type LayoutLayeredProps = {

  /**
   * Specifies a preset configuration for the alert layout position.
   * @type {string} Either 'top-center' or 'bottom-center'
   */
  preset: string

  /**
   * Indicates the type of layout.
   * @type {'alert'}
   */
  type: 'alert' | 'image-iframe-overlay'

  /**
   * Used for type image-iframe-overlay to order the layers
   */
  order?: string[]
}

export const Layered = {
  name: 'Layered',
  layout: ({ props = {}, children, size }) => {
    return html.node`<div style=${{
      width: '100%',
      height: '100%',
      position: 'relative',
    }}>
      ${children.map(
      (x, i) => {
        const zIndex =  calculateZIndex(props, x, i)
        const style = {
          position: 'absolute',
          ...(props.type !== 'alert' ? { inset: '0px' } : {}),
          ...(props.type === 'alert' ? getPresetStyle(props.preset) : {}),
        }
        return html.node`<div data-node-id=${x.id} .data=${{
          zIndex,
        }} style=${style}></div>`;
      },
    )}
    </div>`
  },
} as LayoutDeclaration<LayoutLayeredProps>

export type LayoutProps = {
  Free: LayoutFreeProps
  Column: LayoutColumnProps
  Row: LayoutRowProps
  Grid: LayoutGridProps
  Presentation: LayoutPresentationProps
  Layered: LayoutLayeredProps
}

/**
 * Grid helpers
 */

const getWideGrid = (numChildren = 0) => {
  switch (numChildren) {
    case 0: {
      return [[]]
    }
    case 1: {
      return [[0]]
    }
    case 2: {
      return [[0, 1]]
    }
    case 3: {
      return [[0, 1], [2]]
    }
    case 4: {
      return [
        [0, 1],
        [2, 3],
      ]
    }
    case 5: {
      return [
        [0, 1, 2],
        [3, 4],
      ]
    }
    case 6: {
      return [
        [0, 1, 2],
        [3, 4, 5],
      ]
    }
    case 7: {
      return [[0, 1, 2], [3, 4, 5], [6]]
    }
    case 8: {
      return [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7],
      ]
    }
  }
  const arr = Array(numChildren)
    .fill(null)
    .map((x, i) => i)
  return toMatrix(arr, Math.round(Math.sqrt(numChildren)))
}

const getTallGrid = (numChildren = 0) => {
  switch (numChildren) {
    case 0: {
      return [[]]
    }
    case 1: {
      return [[0]]
    }
    case 2: {
      return [[0], [1]]
    }
    case 3: {
      return [[0, 1], [2]]
    }
    case 4: {
      return [
        [0, 1],
        [2, 3],
      ]
    }
    case 5: {
      return [[0, 1], [2, 3], [4]]
    }
    case 6: {
      return [
        [0, 1],
        [2, 3],
        [4, 5],
      ]
    }
    case 7: {
      return [[0, 1], [2, 3], [4, 5], [6]]
    }
    case 8: {
      return [
        [0, 1],
        [2, 3],
        [4, 5],
        [6, 7],
      ]
    }
  }
  const arr = Array(numChildren)
    .fill(null)
    .map((x, i) => i)
  return toMatrix(arr, Math.ceil(Math.sqrt(arr.length)) - 1)
}
