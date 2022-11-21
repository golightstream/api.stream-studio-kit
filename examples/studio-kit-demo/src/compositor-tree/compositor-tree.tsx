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
import { Renderer } from '../components'
import { asArray } from '../shared/logic'
import { useRoot } from '../shared/hooks'
import { NodeEditor, Tree } from './NodeTree'

const tree = {
  id: '36420',
  props: {
    type: 'Sceneless',
    sources: {
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
      RoomParticipant: [],
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
    },
    componentProps: {
      backgroundId: '1',
    },
    componentChildren: [
      {
        id: 'jhlmhfj1knc00',
        props: {
          type: 'Sceneless',
          layout: 'Grid',
          sources: {
            Image: [],
            Video: [],
            RoomParticipant: [],
          },
          componentProps: {
            background: {
              stretch: false,
            },
          },
          componentChildren: [
            {
              id: '1',
              props: {
                element: 'Element',
                tagName: 'div',
                fields: {
                  style: {
                    width: '100%',
                    height: '100%',
                    background: 'red',
                  },
                },
              },
              children: [],
            },
            {
              id: '2',
              props: {
                element: 'Element',
                tagName: 'div',
                fields: {
                  style: {
                    width: '100%',
                    height: '100%',
                    background: 'blue',
                  },
                },
              },
              children: [],
            },
            {
              id: '3',
              props: {
                element: 'Element',
                tagName: 'div',
                fields: {
                  style: {
                    width: '100%',
                    height: '100%',
                    background: 'green',
                  },
                },
              },
              children: [],
            },
            {
              id: '4',
              props: {
                element: 'Element',
                tagName: 'div',
                fields: {
                  style: {
                    width: '100%',
                    height: '100%',
                    background: 'yellow',
                  },
                },
              },
              children: [],
            },
            {
              id: '5',
              props: {
                element: 'Element',
                tagName: 'div',
                fields: {
                  style: {
                    width: '100%',
                    height: '100%',
                    background: 'purple',
                  },
                },
              },
              children: [],
            },
          ],
        },
        children: [],
      },
      {
        id: 'A',
        props: {
          type: 'Sceneless',
          layout: 'Grid',
          sources: {
            Image: [],
            Video: [],
            RoomParticipant: [],
          },
          componentProps: {
            background: {
              stretch: false,
            },
          },
          componentChildren: [
            {
              id: 'a',
              props: {
                element: 'LS-Image',
                sourceId: '2',
              },
              children: [],
            },
            {
              id: 'b',
              props: {
                type: 'Sceneless',
                sources: {
                  Image: [],
                  Video: [],
                  RoomParticipant: [],
                },
                componentProps: {
                  background: {
                    stretch: false,
                  },
                },
                componentChildren: [
                  {
                    id: 'a1',
                    props: {
                      element: 'LS-Image',
                      sourceId: '2',
                    },
                    children: [],
                  },
                  {
                    id: 'b1',
                    props: {
                      element: 'Element',
                      tagName: 'div',
                      fields: {
                        style: {
                          width: '100%',
                          height: '100%',
                          background: 'blue',
                        },
                      },
                    },
                    children: [],
                  },
                ],
              },
              children: [],
            },
            {
              id: 'c',
              props: {
                element: 'Element',
                tagName: 'div',
                fields: {
                  style: {
                    width: '100%',
                    height: '100%',
                    background: 'green',
                  },
                },
              },
              children: [],
            },
            {
              id: 'd',
              props: {
                element: 'Element',
                tagName: 'div',
                fields: {
                  style: {
                    width: '100%',
                    height: '100%',
                    background: 'yellow',
                  },
                },
              },
              children: [],
            },
            {
              id: 'e',
              props: {
                element: 'Element',
                tagName: 'div',
                fields: {
                  style: {
                    width: '100%',
                    height: '100%',
                    background: 'purple',
                  },
                },
              },
              children: [],
            },
          ],
        },
        children: [],
      },
    ],
    size: {
      x: 1280,
      y: 720,
    },
    isRoot: true,
  },
  children: [],
} as Compositor.SceneNode

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
        {/* TODO: Multiple projects (pass ID to provider) */}
        <ProjectProvider>
          <ProjectView />
        </ProjectProvider>
      </Flex>
    </div>
  )
}

const ProjectView = () => {
  const { project, selectedNodes } = useProject()
  const root = useRoot<Components.Project.Interface>(project)

  const components = project.compositor.components.components
  const componentNames = Object.keys(components)
  const [selectedComponent, setSelectedComponent] = useState<string>(
    componentNames[0],
  )

  const elements = project.compositor.transforms.transforms
  const elementNames = Object.keys(elements)
  const [selectedElement, setSelectedElement] = useState<string>(
    elementNames[0],
  )

  const addToNode = project.component(Array.from(selectedNodes)[0])
  
  // @ts-ignore Debug
  window.node = addToNode

  // @ts-ignore Debug
  window.project = project

  if (!project || !root) {
    return <Flex>Loading...</Flex>
  }

  return (
    <Row>
      <Column>
        <Row marginBottom={10}>
          <Flex>Component: </Flex>
          <select
            defaultValue={selectedComponent}
            onChange={(e) => setSelectedComponent(e.target.value)}
          >
            {componentNames.map((x) => (
              <option value={x}>{x}</option>
            ))}
          </select>
          <button
            onClick={() => addToNode.addChildComponent(selectedComponent)}
          >
            Add
          </button>
        </Row>
        <Row marginBottom={10}>
          <Flex>Element: </Flex>
          <select
            defaultValue={selectedElement}
            onChange={(e) => setSelectedElement(e.target.value)}
          >
            {elementNames.map((x) => (
              <option value={x}>{x}</option>
            ))}
          </select>
          <button
            onClick={() => addToNode.addChildElement(selectedElement)}
          >
            Add
          </button>
        </Row>
        <Row>
          <Flex width={200} align="stretch">
            <Tree node={project.getRoot()} />
          </Flex>
          <Column marginLeft={20}>
            <Renderer scene={project} />
          </Column>
        </Row>
        <Column marginTop={14} gap={10}>
          {Array.from(selectedNodes).map((x) => (
            <NodeEditor key={x} nodeId={x} />
          ))}
        </Column>
      </Column>
    </Row>
  )
}

type AppContext = {
  compositor: Compositor.CompositorInstance
}

const AppContext = React.createContext<AppContext>({} as AppContext)

const AppProvider = ({ children }: { children: React.ReactChild }) => {
  const [compositor] = useState(() => Compositor.start({}))

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

type ProjectContext = {
  project: Compositor.Project
  selectedNodes: Set<string>
  selectNode: (id: string) => void
  deselectNode: (id: string) => void
  toggleNodeSelected: (id: string) => void
  resetSelectedNodes: (selectedNodes?: string[]) => void
  isNodeSelected: (id: string) => boolean
  // collapsedNodes: Set<string>
}

const ProjectContext = React.createContext<ProjectContext>({} as ProjectContext)

const ProjectProvider = ({ children }: { children: React.ReactChild }) => {
  const [selectedNodes, setSelectedNodes] = useState(new Set<string>())
  const [project, setProject] = useState<Compositor.Project>()
  const { compositor } = useApp()

  // @ts-ignore Debug
  window.project = project

  const selectNode = useCallback(
    (id) => setSelectedNodes((prev) => new Set(prev).add(id)),
    [selectedNodes],
  )
  const deselectNode = useCallback(
    (id) =>
      setSelectedNodes((prev) => {
        const set = new Set(prev)
        set.delete(id)
        return set
      }),
    [selectedNodes],
  )

  useEffect(() => {
    compositor.loadTree(tree).then(setProject)
  }, [compositor])

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

  if (!project) return null

  return (
    <ProjectContext.Provider
      value={{
        project,
        selectedNodes,
        selectNode,
        deselectNode,
        toggleNodeSelected: (id) => {
          if (selectedNodes.has(id)) {
            deselectNode(id)
          } else {
            selectNode(id)
          }
        },
        resetSelectedNodes: (ids = []) => setSelectedNodes(new Set(ids)),
        isNodeSelected: (id) => selectedNodes.has(id),
      }}
    >
      {children}
    </ProjectContext.Provider>
  )
}

export const useProject = () => useContext(ProjectContext)

ReactDOM.render(
  <AppProvider>
    <Content />
  </AppProvider>,
  document.getElementById('root'),
)
