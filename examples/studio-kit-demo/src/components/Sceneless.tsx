/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import React, { useEffect, useRef, useState } from 'react'
import { Components, Sources } from '@api.stream/studio-kit'
import { Column, Flex } from '../ui/Box'
import { BackgroundSelect, BannerSelect, SourceList } from '../shared/sources'
import { Layout } from '../shared/props'

export type ScenelessInterface = Components.Sceneless.Interface
export type ScenelessProps = Components.Sceneless.Props

const overlays = [
  {
    id: '123',
    url: 'https://www.pngmart.com/files/12/Twitch-Stream-Overlay-PNG-Transparent-Picture.png',
  },
  {
    id: '124',
    url: 'https://www.pngmart.com/files/12/Stream-Overlay-Transparent-PNG.png',
  },
]

const logos = [
  {
    id: '128',
    url: 'https://www.pngmart.com/files/12/Twitch-Stream-Overlay-PNG-Transparent-Picture.png',
  },
  {
    id: '129',
    url: 'https://www.pngmart.com/files/12/Stream-Overlay-Transparent-PNG.png',
  },
]

export const ScenelessComponent = ({
  component,
}: {
  component: ScenelessInterface
}) => {
  return (
    <Column>
      <SourceList component={component} sourceType="RoomParticipant" />
      <Column>
        <label>Layout</label>
        <Flex padding={8} style={{ background: 'rgba(0, 0, 0, 0.2)' }}>
          <Layout component={component} />
        </Flex>
      </Column>
      <Column>
        <label>Background</label>
        <Flex padding={8} style={{ background: 'rgba(0, 0, 0, 0.2)' }}>
          <BackgroundSelect component={component} />
        </Flex>
      </Column>
    </Column>
  )
}
