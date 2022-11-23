/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import React, { useCallback, useContext, useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import {
  Compositor,
  Transforms,
  Layouts,
  Sources,
  Components,
} from '@api.stream/studio-kit'
import logoUrl from '../../logo.png'
import '../index.css'
import '../../Font.ttf'
import { Column, Flex, Row } from '../ui/Box'
import { asArray } from '../shared/logic'
import { dbAdapter } from '../liveblocks-adapter'
import { ProjectProvider, ProjectView } from './CompositorProject'

const sources = {
  Image: [
    {
      id: '1',
      props: {
        src: 'http://localhost:3006/bg.png',
      },
    },
    {
      id: '2',
      props: {
        src: 'https://images.unsplash.com/photo-1529778873920-4da4926a72c2?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8Y3V0ZSUyMGNhdHxlbnwwfHwwfHw%3D&w=1000&q=80',
      },
    },
  ],
  Video: [
    {
      id: 'g73rre9mbns00',
      props: {
        src: 'https://assets.mixkit.co/videos/preview/mixkit-stars-in-space-1610-large.mp4',
      },
    },
    {
      id: '24c4ou2urlr40',
      props: {
        src: 'https://assets.mixkit.co/videos/preview/mixkit-curvy-road-on-a-tree-covered-hill-41537-large.mp4',
      },
    },
  ],
  RoomParticipant: [] as any[],
  Banner: [
    {
      id: '2tqdp07koke00',
      props: {
        headerText: 'Header',
        bodyText: 'Some banner text',
        meta: {
          title: 'Short',
        },
      },
    },
    {
      id: 'n7xp1clnhrk0',
      props: {
        bodyText: 'This is a banner without a header. It has more text.',
        meta: {
          title: 'Long',
        },
      },
    },
  ],
}

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
      <ProjectsView />
    </div>
  )
}

const ProjectsView = () => {
  const { compositor } = useApp()
  const [projects, setProjects] = useState<Compositor.Project[]>([])
  const [projectId, setProjectId] = useState<string>()

  const createProject = useCallback(async () => {
    const project = await compositor.createProject({ canEdit: true })

    // TODO: Clean this up / rethink
    const projectComponent = compositor.components.createTempComponent(
      'Project',
      {},
      sources,
    )
    await project.insertRoot(projectComponent.props)
    setProjects(Object.values(compositor.projects))
  }, [compositor])

  const loadProject = useCallback(
    async (projectId) => {
      await compositor.loadProject(projectId)
      setProjects(Object.values(compositor.projects))
    },
    [compositor],
  )

  useEffect(() => {
    // Load initial project from URL
    const pageURL = new URL(document.location.toString())
    const projectId = pageURL.searchParams.get('id')
    if (projectId) {
      loadProject(projectId)
    }
  }, [])

  useEffect(() => {
    if (!projects[0]) return
    // Update the URL to reference the project
    const url = new URL(window.location.toString())
    url.searchParams.set('id', projects[0].id)
    window.history.pushState({ path: url.toString() }, '', url)
  }, [projects[0]])

  return (
    <Column gap={6}>
      <Row>
        <input
          style={{ width: 160, marginRight: 2 }}
          type="text"
          placeholder='Project ID'
          onChange={(e) => setProjectId(e.target.value)}
        />
        <button
          onClick={() => {
            loadProject(projectId)
            setProjectId(null)
          }}
        >
          Load
        </button>
      </Row>
      <Row>
        <button onClick={() => createProject()}>New project</button>
      </Row>
      {projects.map((x) => (
        <Flex
          key={x.id}
          padding={20}
          style={{ border: '1px solid #333', background: 'rgba(0,0,0,0.1)' }}
        >
          <ProjectProvider project={x}>
            <ProjectView />
          </ProjectProvider>
        </Flex>
      ))}
    </Column>
  )
}

type AppContext = {
  compositor: Compositor.CompositorInstance
}

const AppContext = React.createContext<AppContext>({} as AppContext)

const AppProvider = ({ children }: { children: React.ReactChild }) => {
  const [compositor] = useState(() =>
    Compositor.start({
      dbAdapter,
    }),
  )

  useEffect(() => {
    if (!compositor) return
    const getDeclarations = (modules: object) =>
      Object.values(modules).flatMap((x) => asArray(x.Declaration)) as any[]

    // Register modules (TODO: Rethink)
    compositor.sources.registerSource(getDeclarations(Sources))
    compositor.transforms.registerTransform(getDeclarations(Transforms))
    compositor.layouts.registerLayout(getDeclarations(Layouts))
    compositor.components.registerComponent(getDeclarations(Components))
  }, [compositor])

  // @ts-ignore Debug
  window.compositor = compositor

  return (
    <AppContext.Provider
      value={{
        compositor,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)

ReactDOM.render(
  <AppProvider>
    <Content />
  </AppProvider>,
  document.getElementById('root'),
)
