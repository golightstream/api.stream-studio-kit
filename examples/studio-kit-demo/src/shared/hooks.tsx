import React, { useEffect, useRef, useState } from 'react'
import { Component, Source, SDK, Compositor } from '../../../../'

type NodeInterface = Compositor.Component.NodeInterface

export function useRoot<I extends NodeInterface>(project: SDK.Project): I {
  const [root, setRoot] = useState<I>()
  useEffect(() => {
    return project.scene.useRoot<I>(setRoot)
  }, [])
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