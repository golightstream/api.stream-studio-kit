import React, { useCallback, useContext, useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import {
  Compositor,
  Transforms,
  Layouts,
  Sources,
  Components,
} from '@api.stream/studio-kit'
import logoUrl from '../logo.png'
import { Column, Flex, Row } from '../ui/Box'
import { Renderer } from '../components'
import { projects, sources } from '../host/host'
import { asArray } from '../shared/logic'
import { BackgroundSelect, BannerSelect, SourceList } from '../shared/sources'
import { useRoot } from '../shared/hooks'
import { NodeEditor, Tree } from './NodeTree'
import { useApp } from './Compositor'

export const ProjectView = () => {
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
    <Column gap={10}>
      <Row align="center">
        <Flex marginRight={5}>Project ID:</Flex>
        <b>{project.id}</b>
      </Row>
      <Column>
        <Row>
          <select
            defaultValue={selectedComponent}
            onChange={(e) => setSelectedComponent(e.target.value)}
            style={{ width: 150, marginRight: 6 }}
          >
            {componentNames.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
          <button
            onClick={() => addToNode.addChildComponent(selectedComponent)}
          >
            Add component
          </button>
        </Row>
        <Row>
          <select
            defaultValue={selectedElement}
            onChange={(e) => setSelectedElement(e.target.value)}
            style={{ width: 150, marginRight: 6 }}
          >
            {elementNames.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
          <button onClick={() => addToNode.addChildElement(selectedElement)}>
            Add element
          </button>
        </Row>
      </Column>
      <Row align="flex-start">
        <Flex width={200} align="stretch" marginTop={20}>
          <Tree node={project.getRoot()} />
        </Flex>
        <Column marginLeft={20}>
          <Renderer scene={project} />
        </Column>
      </Row>
      <Row marginTop={14} gap={10}>
        {Array.from(selectedNodes).map((x) => (
          <NodeEditor key={x} nodeId={x} />
        ))}
      </Row>
    </Column>
  )
}

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

export const ProjectContext = React.createContext<ProjectContext>(
  {} as ProjectContext,
)

export const ProjectProvider = ({
  children,
  project,
}: {
  children: React.ReactChild
  project: Compositor.Project
}) => {
  const [selectedNodes, setSelectedNodes] = useState(new Set<string>())
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
