/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import React, { useEffect, useRef, useState } from 'react'
import { Components, Sources, SDK, Compositor } from '../../../../'
import { Column, Flex, Row } from '../ui/Box'
import { Component } from '.'
import { ScenelessProps } from './Sceneless'

export type MultiSceneInterface = Components.MultiScene.Interface

export const MultiSceneComponent = ({
  component,
}: {
  component: MultiSceneInterface
}) => {
  const [images, setImages] = useState<Sources.Image.ImageSource[]>([])
  const [videos, setVideos] = useState<Sources.Video.VideoSource[]>([])

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
              'Sceneless',
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
            <Component component={activeScene} />
          </Column>
        )}
      </Row>
    </Column>
  )
}
