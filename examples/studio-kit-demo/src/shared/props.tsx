/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import React from 'react'
import { Compositor } from '@api.stream/studio-kit'

export const Layout = ({
  component,
}: {
  component: Compositor.Component.NodeInterface
}) => {
  const layout = component.nodeProps.layout
  const layouts = component.compositor.layouts.layouts

  return (
    <select
      value={layout}
      onChange={(e) => {
        const { name, props } = layouts[e.target.value]
        component.updateNode({
          layout: name,
          layoutProps: props,
        })
      }}
    >
      {Object.keys(layouts).map((x) => (
        <option key={x} value={x}>
          {x}
        </option>
      ))}
    </select>
  )
}
