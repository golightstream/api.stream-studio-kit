import React, { useCallback, useContext, useEffect, useState } from 'react'
import { Compositor } from '@api.stream/studio-kit'
import { Column, Flex, Row } from '../ui/Box'
import { Renderer } from '../components'
import { NodeEditor, Tree } from './NodeTree'

export const ProjectView = () => {
  const { project, tree, selectedNodes } = useProject()

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

  const selectedNode = project.get(Array.from(selectedNodes)[0])

  // @ts-ignore Debug
  window.node = selectedNode

  // @ts-ignore Debug
  window.project = project

  if (!project) {
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
            onClick={() => selectedNode.addChildComponent(selectedComponent)}
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
          <button onClick={() => selectedNode.addChildElement(selectedElement)}>
            Add element
          </button>
        </Row>
      </Column>
      <Row align="flex-start">
        <Flex width={200} align="stretch" marginTop={20}>
          {tree && <Tree node={tree} />}
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
  tree: Compositor.SceneNode
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
  const [tree, setTree] = useState<Compositor.SceneNode>()

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

  useEffect(() => project.useTree(setTree), [])

  useEffect(() => {
    document.addEventListener('copy', (e) => {
      const selectedNodeId =
        document.activeElement?.getAttribute('data-node-id')
      if (!selectedNodeId) return
      const node = project.get(selectedNodeId)
      if (node) {
        e.preventDefault()
        e.clipboardData.setData('text/plain', node.toString())
      }
    })
    document.addEventListener('paste', (e) => {
      const selectedNodeId =
        document.activeElement?.getAttribute('data-node-id')
      if (!selectedNodeId) return
      try {
        const tree = JSON.parse(e.clipboardData.getData('text'))
        if (tree.id && tree.children && tree.props) {
          const node = project.get(selectedNodeId)
          node.insertTree(tree)
        }
        e.preventDefault()
      } catch (e) {}
    })
  }, [])

  if (!project) return null

  return (
    <ProjectContext.Provider
      value={{
        project,
        tree,
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
