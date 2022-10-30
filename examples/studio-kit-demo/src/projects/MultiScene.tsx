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
import { useRenderRef, useRoot } from '../shared/hooks'
import { ScenelessComponent } from './Sceneless'

type MultiSceneInterface = Component.MultiSceneProject.Interface
type ScenelessInterface = Component.ScenelessProject.Interface
type ScenelessProps = Component.ScenelessProject.Props

const ComponentUI = ({
  component,
}: {
  component: Compositor.Component.NodeInterface
}) => {
  // @ts-ignore
  const Component = components[component.type]
  if (!Component) return null
  return <Component component={component} />
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

  const activeScene = component.getChild(
    'scenes',
    component.props.activeSceneId,
  )

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
        <button
          onClick={(e) =>
            component.addChildComponent<ScenelessProps>(
              'scenes',
              'ScenelessProject',
              {},
            )
          }
        >
          Add scene
        </button>
      </Row>
      <Row>
        {activeScene && (
          <Column>
            <div>Scene ID: {activeScene.id}</div>
            <ComponentUI component={activeScene} />
          </Column>
        )}
      </Row>
    </Column>
  )
}

const components = {
  ScenelessProject: ScenelessComponent,
  MultiSceneProject: MultiSceneComponent,
}
