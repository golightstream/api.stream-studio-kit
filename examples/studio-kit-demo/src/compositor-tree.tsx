/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import React, { useCallback, useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import {
  Compositor,
  Transforms,
  Layouts,
  Sources,
  Components,
} from '@api.stream/studio-kit'
import logoUrl from '../logo.png'
import './index.css'
import '../Font.ttf'
import { Column, Flex } from './ui/Box'
import { Renderer } from './components'
import { asArray } from './shared/logic'
import { useRoot } from './shared/hooks'
import { BannerSelect } from './shared/sources'

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
            layout: 'Grid',
            background: {
              stretch: false,
            },
            layoutProps: {
              cover: false,
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
            layout: 'Grid',
            background: {
              stretch: false,
            },
            layoutProps: {
              cover: false,
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
                  layout: 'Grid',
                  background: {
                    stretch: false,
                  },
                  layoutProps: {
                    cover: false,
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
        <CompositorView />
      </Flex>
    </div>
  )
}

const CompositorView = () => {
  const [compositor] = useState(() => Compositor.start({}))
  const [project, setProject] = useState<Compositor.Project>()
  const root = useRoot<Components.Project.Interface>(project)

  // @ts-ignore Debug
  window.compositor = compositor
  // @ts-ignore Debug
  window.project = project

  useEffect(() => {
    compositor.loadTree(tree).then(setProject)
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

  if (!project || !root) {
    return <Flex>Loading...</Flex>
  }

  return (
    <Flex>
      <Column>
        <Renderer scene={project} />
      </Column>
    </Flex>
  )
}

ReactDOM.render(<Content />, document.getElementById('root'))
