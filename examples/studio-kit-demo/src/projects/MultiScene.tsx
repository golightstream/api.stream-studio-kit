/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import React, { useEffect, useRef, useState } from 'react'
import { Component, Source, SDK, Compositor } from '../../../../'
import { Participants } from '../shared/participant'
import { ControlPanel, DeviceSelection } from '../shared/control-panel'
import { DEFAULT_LAYOUT, getLayout, layouts } from '../layout-examples'
import Style from '../shared/shared.module.css'
import { Chat } from '../shared/chat'
import { Column, Flex, Row } from '../ui/layout/Box'

type NodeInterface = Compositor.Component.NodeInterface

function useRoot<I extends NodeInterface>(project: SDK.Project): I {
  const [root, setRoot] = useState<I>()
  useEffect(() => {
    return project.scene.useRoot<I>(setRoot)
  }, [])
  return root
}

function useComponent<I extends NodeInterface>(project: SDK.Project): I {
  const [root, setRoot] = useState<I>()
  useEffect(() => {
    return project.scene.useRoot<I>(setRoot)
  }, [])
  return root
}

function useRenderRef(project: SDK.Project) {
  const renderContainer = useRef()
  useEffect(() => {
    project.scene.render({
      containerEl: renderContainer.current,
    })
  }, [renderContainer.current])
  return renderContainer
}

export const MultiSceneProject = ({ project }: { project: SDK.Project }) => {
  const root = useRoot<Component.MultiSceneProject.Interface>(project)
  const renderContainer = useRenderRef(project)

  // @ts-ignore Debug helper
  window.root = root

  if (!root) return null

  return (
    <Column>
      <div ref={renderContainer} style={{ width: 840, height: 500 }}></div>
      <MultiSceneComponent component={root} />
    </Column>
  )
}

export const MultiSceneComponent = ({
  component,
}: {
  component: Component.MultiSceneProject.Interface
}) => {
  const [images, setImages] = useState<Source.Image.ImageSource[]>([])
  const [videos, setVideos] = useState<Source.Video.VideoSource[]>([])
  
  return (
    <Column>
      <Row>
        {component.children.scenes.map((x) => (
          <Flex
            key={x.id}
            width={50}
            height={50}
            style={{
              cursor: 'pointer',
              background:
                component.props.activeSceneId === x.id
                  ? 'rgba(255,255,255,0.5)'
                  : 'rgba(255,255,255,0.1)',
            }}
            onClick={(e) => {
              component.execute.setActiveScene(x.id)
            }}
          />
        ))}
        <button onClick={(e) => component.execute.addScene()}>Add scene</button>
      </Row>
    </Column>
  )
}
