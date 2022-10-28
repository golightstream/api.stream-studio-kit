/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import React from 'react'
import { style } from 'typestyle'

const GridColumn = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
})

const GridRow = style({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
})

type ColumnProps = {
  marginLeft?: number
  className?: string
  children: React.ReactNode
}

const classes = (baseClass: string, classNames: string) =>
  [baseClass, classNames].join(' ')

export const Column = (props: ColumnProps) => (
  <div
    className={
      props.className ? classes(GridColumn, props.className) : GridColumn
    }
    style={{ ...(props.marginLeft && { marginLeft: props.marginLeft }) }}
  >
    {props.children}
  </div>
)

type RowProps = {
  marginTop?: number
  className?: string
  children: React.ReactNode
}

export const Row = (props: RowProps) => (
  <div
    className={props.className ? classes(GridRow, props.className) : GridRow}
    style={{ ...(props.marginTop && { marginTop: props.marginTop }) }}
  >
    {props.children}
  </div>
)
