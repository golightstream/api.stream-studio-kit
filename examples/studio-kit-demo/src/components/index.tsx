/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { Compositor, SDK } from '@api.stream/studio-kit'
import { useRenderRef, useRoot } from '../shared/hooks'
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
  // @ts-ignore
  const Component = components[component.type]
  if (!Component) return null
  return <Component component={component} />
}

export const Renderer = ({ scene }: { scene: Compositor.Project }) => {
  const root = useRoot(scene)
  const renderContainer = useRenderRef(scene)

  if (!root) return null

  return <div ref={renderContainer} style={{ width: 840, height: 500 }}></div>
}
