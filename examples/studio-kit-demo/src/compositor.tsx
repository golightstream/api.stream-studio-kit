/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import React, { useCallback, useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import { Compositor, Transforms, Layouts, Sources, Components } from '@api.stream/studio-kit'
import logoUrl from '../logo.png'
import './index.css'
import '../Font.ttf'
import { dbAdapter } from './liveblocks-adapter'
import { Column, Flex } from './ui/Box'
import { Renderer } from './components'
import { projects, sources } from './host/host'
import { asArray } from './shared/logic'
import { DEFAULT_LAYOUT, getLayout } from './layout-examples'
import { BackgroundSelect, BannerSelect, SourceList } from './shared/sources'
import { useRoot } from './shared/hooks'

const pageURL = new URL(document.location.toString())
const loadProjectId = pageURL.searchParams.get('id')

const Content = () => {
  return (
    <div>
      <div id="header">
        <a href="https://api.stream/" target="_blank">
          <img src={logoUrl} height={20} />
        </a>
        <h1>
          Studio Kit
          <span>Demo</span>
        </h1>
        <h3>Compositor</h3>
      </div>
      <Flex padding={20}>
        <CompositorView />
      </Flex>
    </div>
  )
}

const CompositorView = () => {
  const [compositor] = useState(() =>
    Compositor.start({
      dbAdapter,
    }),
  )
  const [project, setProject] = useState<Compositor.Project>()
  const root = useRoot<Components.Project.Interface>(project)

  // @ts-ignore Debug
  window.compositor = compositor
  // @ts-ignore Debug
  window.project = project

  const createProject = useCallback(async () => {
    const project = await compositor.createProject({ canEdit: true })

    // TODO: Clean this up / rethink
    const projectScene = compositor.components.createTempComponent(
      'Sceneless',
      {
        layout: getLayout(DEFAULT_LAYOUT).layout,
        layoutProps: getLayout(DEFAULT_LAYOUT).props,
      },
    )
    const projectComponent = compositor.components.createTempComponent(
      'Project',
      {},
      sources,
      [projectScene],
    )
    await project.insertRoot(projectComponent.props)
    setProject(project)
  }, [compositor, setProject])

  const loadProject = useCallback(
    async (projectId) => {
      const project = await compositor.loadProject(projectId)
      setProject(project)
    },
    [compositor, setProject],
  )

  useEffect(() => {
    if (loadProjectId) {
      loadProject(loadProjectId)
    } else {
      createProject()
    }
  }, [])

  useEffect(() => {
    if (!compositor) return
    // Register modules (TODO: Rethink)
    const getDeclarations = (modules: object) =>
      Object.values(modules).flatMap((x) => asArray(x.Declaration)) as any[]

    compositor.sources.registerSource(getDeclarations(Sources))
    compositor.transforms.registerTransform(getDeclarations(Transforms))
    compositor.layouts.registerLayout(getDeclarations(Layouts))
    compositor.components.registerComponent(getDeclarations(Components))
  }, [compositor])

  useEffect(() => {
    if (!project) return
    // Update the URL to reference the project
    const url = new URL(window.location.toString())
    url.searchParams.set('id', project.id)
    window.history.pushState({ path: url.toString() }, '', url)
  }, [project])

  if (!project || !root) {
    return <Flex>Loading...</Flex>
  }

  return (
    <Flex>
      <Column>
        <div>{project.id}</div>
        <Column gap={10} marginTop={10}>
          <SourceList
            component={root.children[0] as Compositor.Component.NodeInterface}
            sourceType="RoomParticipant"
          />
          <Column>
            <label>Background</label>
            <Flex padding={8} style={{ background: 'rgba(0, 0, 0, 0.2)' }}>
              <BackgroundSelect component={root} />
            </Flex>
          </Column>
          <Column>
            <label>Banner</label>
            <Flex padding={8} style={{ background: 'rgba(0, 0, 0, 0.2)' }}>
              <BannerSelect component={root} />
            </Flex>
          </Column>
        </Column>
        <Renderer scene={project} />
      </Column>
    </Flex>
  )
}

ReactDOM.render(<Content />, document.getElementById('root'))
