/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import React, { useEffect, useRef, useState } from 'react'
import { SDK, Compositor } from '../../../../'

type ComponentNodeInterface = Compositor.Component.ComponentNodeInterface
type NodeInterface = Compositor.Component.NodeInterface
type Source = Compositor.Source.Source

export function useRoot<I extends ComponentNodeInterface>(project: SDK.Project): I {
  const [root, setRoot] = useState<I>()
  useEffect(() => {
    if (!project?.scene) return
    return project.scene.useRoot<I>(setRoot)
  }, [project?.scene])
  return root
}

export function useComponent<I extends NodeInterface>(project: SDK.Project): I {
  const [component, setComponent] = useState<I>()
  useEffect(() => {
    return project.scene.useRoot<I>(setComponent)
  }, [])
  return component
}

export function useSources<S extends Source>(
  component: NodeInterface,
  sourceType: string,
): S[] {
  const [sources, setSources] = useState<S[]>([])

  useEffect(() => {
    return component.sources.useAll(sourceType, setSources)
  }, [])

  return sources
}

export function useRenderRef(project: SDK.Project) {
  const renderContainer = useRef()
  useEffect(() => {
    project.scene.render({
      containerEl: renderContainer.current,
    })
  }, [renderContainer.current])
  return renderContainer
}
