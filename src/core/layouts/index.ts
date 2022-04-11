/* --------------------------------------------------------------------------------------------- 
 * Copyright (c) Infiniscene, Inc. All rights reserved. 
 * Licensed under the MIT License. See License.txt in the project root for license information. 
 * -------------------------------------------------------------------------------------------- */
import { Compositor } from '../namespaces'
import { html } from 'lighterhtml'
import { asSize } from '../../../src/logic'

type LayoutArgs = Compositor.Layout.LayoutArgs
type LayoutDeclaration = Compositor.Layout.LayoutDeclaration

export const Free = {
  name: 'Free',
  layout: ({ props, children, size }: LayoutArgs) => {
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
} as LayoutDeclaration

export const Column = {
  name: 'Column',
  layout: ({ props = {}, children, size }: LayoutArgs) => {
    let {
      justify = 'center',
      align = 'center',
      cover = false,
      margin = {},
      dimensions = 16 / 9,
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
        flexDirection: 'column',
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
            entry: {
              delay: 400 + i * 100,
              offset: { x: 0, y: '100%' },
              scale: { x: 0.8, y: 0.8 },
              opacity: 0,
            },
            exit: {
              offset: { x: 0, y: 1000 },
              scale: { x: 0.8, y: 0.8 },
              opacity: 0,
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
} as LayoutDeclaration

export const Row = {
  name: 'Row',
  layout: ({ props = {}, children, size }: LayoutArgs) => {
    let {
      justify = 'center',
      align = 'center',
      cover = false,
      margin = {},
      dimensions = 16 / 9,
      maxWidth = 1,
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
      (innerWidth - totalMarginBetween) / (children.length || 1),
      innerHeight * dimensions,
      maxWidth * size.x,
    )
    const itemHeight = itemWidth / dimensions

    return html.node`
      <div style=${{
        height: cover ? size.y + 'px' : 'auto',
        width: '100%',
        display: 'flex',
        flexDirection: 'row',
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
                entry: {
                  delay: 400 + i * 100,
                  offset: { x: 0, y: '100%' },
                  scale: { x: 0.8, y: 0.8 },
                  opacity: 0,
                },
                exit: {
                  offset: { x: 0, y: 1000 },
                  scale: { x: 0.8, y: 0.8 },
                  opacity: 0,
                },
                borderRadius: cover ? 0 : 5,
              }} style=${{
                display: 'flex',
                height: cover ? '100%' : itemHeight + 'px',
                width: itemWidth + 'px',
                aspectRatio: dimensions,
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
} as LayoutDeclaration

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
  layout: ({ props = {}, children, size }: LayoutArgs) => {
    let {
      dimensions = 16 / 9,
      numPerRow,
      margin,
      cover = false,
      maxWidth,
    } = props
    const defaultMargin =
      children.length === 0 || cover
        ? 0
        : Math.min(size.y / children.length / 10, 30)
    margin = margin ?? defaultMargin
    const isTall = size.x < size.y

    let rows = [] as Array<number[]>
    if (numPerRow) {
      rows = toMatrix(children, numPerRow)
    } else {
      rows = isTall
        ? getTallGrid(children.length)
        : getWideGrid(children.length)
    }

    const rowHeight = (size.y - margin) / rows.length
    const rowWidth = size.x - margin

    return html.node`
    <div style=${{
      display: 'flex',
      width: '100%',
      height: '100%',
      flexDirection: 'column',
      justifyContent: 'center',
      paddingLeft: margin + 'px',
      paddingBottom: margin + 'px',
      flexGrow: 0,
    }}>${rows.map((row, i) =>
      Row.layout({
        props: {
          justify: 'center',
          dimensions,
          cover,
          maxWidth: maxWidth || 1 / (rows[0].length || 1),
          margin: {
            top: margin,
            right: margin,
            left: 0,
            bottom: 0,
            between: margin,
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
}

export const Presentation = {
  name: 'Presentation',
  layout: ({ props = {}, children, size }: LayoutArgs) => {
    let {
      margin,
      cover = false,
      barWidth = 0.2,
      barPosition = 'side',
      presentationDimensions = 16 / 9,
      viewerDimensions = 16 / 9,
      justifyViewers = 'center',
      useGrid = false,
    } = props
    const barWidthPx =
      barPosition === 'side' ? size.x * barWidth : size.y * barWidth
    const presentation = children[0]
    const viewers = children.filter((x) => x !== presentation)
    const defaultMargin = children.length <= 1 ? 0 : Math.min(size.x / 80, 30)
    margin = margin ?? defaultMargin

    // TODO: Consider implementing this dynamic logic based on screenshare availability
    if (!presentation) return Grid.layout({ props, children, size })

    const hasSidebar = children[1]
    
    const mainSize = { ...size }
    if (hasSidebar) {
      if (barPosition === 'side') {
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
      Bar = barPosition === 'side' ? Column.layout : Row.layout
      barProps = {
        margin: {
          top: barPosition === 'side' ? margin : 0,
          left: barPosition === 'side' ? 0 : margin,
          bottom: margin,
          right: margin,
          between: margin,
        },
        dimensions: viewerDimensions,
        justify: justifyViewers,
        align: 'flex-end',
      }
    }

    return html.node`
      <div style=${{
        display: 'flex',
        flexDirection: barPosition === 'side' ? 'row' : 'column',
        justifyContent: 'space-around',
        alignItems: 'center',
        position: 'relative',
      }}>
        ${
          children[0] &&
          html.node`<div style=${{
            // aspectRatio: String(presentationDimensions),
            width: mainSize.x,
            height: mainSize.y,
            padding: cover ? 0 : margin + 'px',
            display: 'flex',
            flexGrow: 1,
          }}>
            <div data-node-id=${presentation.id} .data=${{
            dimensions: presentationDimensions,
            borderRadius: cover ? 0 : 5,
            entry: {
              delay: 0,
              offset: { x: 0, y: 1000 },
              scale: { x: 0.5, y: 0.5 },
              opacity: 0,
            },
            exit: {
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
                    useGrid && hasSidebar ? 100 - barWidth * 100 + '%' : '100%',
                  height: '100%',
                }
              : {}),
          }} />
          </div>`
        }
        ${html.node`<div style=${{
          ...(barPosition === 'side'
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
              barPosition === 'side'
                ? { x: barWidthPx, y: size.y }
                : { x: size.x, y: barWidthPx },
          })
        }</div>`}
      </div>
    `
  },
} as LayoutDeclaration

export const Layered = {
  name: 'Layered',
  layout: ({ props = {}, children, size }: LayoutArgs) => {
    return html.node`<div style=${{
      width: '100%',
      height: '100%',
      position: 'relative',
    }}>
      ${children.map(
        (x, i) =>
          html.node`<div data-node-id=${x.id} style=${{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
          }}></div>`,
      )}
    </div>`
  },
} as LayoutDeclaration

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
      return [
        [0, 1, 2],
        [3, 4],
        [5, 6],
      ]
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
