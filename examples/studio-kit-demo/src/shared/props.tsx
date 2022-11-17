/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import React from 'react'
import { Compositor } from '@api.stream/studio-kit'
import { Column } from '../ui/Box'
import { getLayout, layouts } from '../layout-examples'

export const Layout = ({
  component,
}: {
  component: Compositor.Component.NodeInterface
}) => {
  const layout = component.props.layout

  return (
    <select
      defaultValue={layout}
      onChange={(e) => {
        const { layout, props } = getLayout(e.target.value)
        component.update({
          layout,
          layoutProps: props,
        })
      }}
    >
      {layouts.map((x) => (
        <option key={x} value={x}>
          {x}
        </option>
      ))}
    </select>
  )
}
