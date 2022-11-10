/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { SDK, Compositor } from '../../../../'

type NodeInterface = Compositor.Component.NodeInterface
type Source = Compositor.Source.Source

export function useRoot<I extends NodeInterface>(
  project: Compositor.Project,
): I {
  const [root, setRoot] = useState<I>()
  useEffect(() => {
    if (!project) return
    return project.useRoot<I>(setRoot)
  }, [project])
  return root
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

export function useRenderRef(project: Compositor.Project) {
  const renderContainer = useCallback((node) => {
    project.render({
      containerEl: node,
    })
  }, [])
  return renderContainer
}
