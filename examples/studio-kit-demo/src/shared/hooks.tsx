/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import React, { useEffect, useRef, useState } from 'react'
import { SDK, Compositor } from '../../../../'

type NodeInterface = Compositor.Component.NodeInterface

export function useRoot<I extends NodeInterface>(project: SDK.Project): I {
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

export function useRenderRef(project: SDK.Project) {
  const renderContainer = useRef()
  useEffect(() => {
    project.scene.render({
      containerEl: renderContainer.current,
    })
  }, [renderContainer.current])
  return renderContainer
}
