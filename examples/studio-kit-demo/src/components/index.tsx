/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { Compositor, SDK } from '@api.stream/studio-kit'
import { useEffect, useState } from 'react'
import { useRenderRef, useUpdate } from '../shared/hooks'
import { MultiSceneComponent } from './MultiScene'
import { ScenelessComponent } from './Sceneless'

const components = {
  Sceneless: ScenelessComponent,
  MultiScene: MultiSceneComponent,
}

export const Component = ({
  component,
}: {
  component: Compositor.Component.NodeInterface
}) => {
  const [updatedComponent, setComponent] =
    useState<Compositor.Component.NodeInterface>(component)

  useEffect(() => {
    if (!component?.id) return
    return component.project.useComponent(component.id, setComponent)
  }, [component?.id])

  if (!component) return null

  // @ts-ignore
  const Component = components[component.type]
  if (!Component) return null

  return <Component component={updatedComponent} />
}

export const Renderer = ({ scene }: { scene: Compositor.Project }) => {
  const renderContainer = useRenderRef(scene)

  return <div ref={renderContainer} style={{ width: 840, height: 500 }}></div>
}
