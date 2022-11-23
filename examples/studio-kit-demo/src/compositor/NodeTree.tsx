/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { Column, Flex, Row } from '../ui/Box'
import { useApp } from './Compositor'
import { useProject } from './CompositorProject'
import { Compositor } from '@api.stream/studio-kit'
import { useState } from 'react'
import { Layout } from '../shared/props'
import Icon from './Icon'
import JSONInput from 'react-json-editor-ajrm/index'

// @ts-ignore
import locale from 'react-json-editor-ajrm/locale/en'

export const NodeView = (props: { node: Compositor.SceneNode }) => {
  // const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const { project, isNodeSelected } = useProject()
  const isSelected = isNodeSelected(props.node.id)
  const node = project.get(props.node.id)

  // const isCollapsed = !editorState.expandedNodes.has(props.node.id)
  // const canExpand = Boolean(
  //   props.node.children.length > 0,
  // )

  return (
    <div
      onDoubleClick={() => {
        setIsEditingName(true)
      }}
      className={[
        'node-item',
        // isCollapsed && 'collapsed',
        isSelected && 'active',
      ].join(' ')}
      // data-collapsed={isCollapsed}
      data-active={isSelected}
      style={{
        ...(isSelected && {
          fontWeight: 'bold',
        }),
        padding: '3px 6px 3px 3px',
        alignItems: 'stretch',
        display: 'flex',
        flexGrow: 1,
        // opacity: props.node.hidden ? 0.3 : 1,
      }}
      data-node-id={node.id}
      tabIndex={1}
    >
      <Row justify={'space-between'} height="100%" grow={1}>
        <Flex align="center">
          {/* {canExpand && (
            <Flex marginRight="small" width={13} justify="center">
              <Button
                icon={isCollapsed ? 'CaretRight' : 'CaretDownLight'}
                iconSize={isCollapsed ? 13 : 11}
                appearance="text"
                type="neutral"
                onClick={() => {
                  runAction('ToggleCollapsed', props.node.id)
                }}
              />
            </Flex>
          )} */}
          {/* {props.node._acceptChildren && (
            <Flex marginRight="medium">
              <Icon name="Folder" width={13} />
            </Flex>
          )} */}
          {/* Node name */}
          {isEditingName ? (
            // <TextInput
            //   appearance="neon"
            //   width={100}
            //   autoFocus={true}
            //   selectOnFocus={true}
            //   defaultValue={String(props.node.name || props.node._transform)}
            //   onBlur={(e) => {
            //     runAction('SetNodeName', {
            //       id: props.node.id,
            //       name: e.target.value,
            //     })
            //     setIsEditingName(false)
            //   }}
            //   overrides={{
            //     padding: 0,
            //     fontWeight: 700,
            //   }}
            // />
            <></>
          ) : (
            <span>{node.type}</span>
          )}
        </Flex>
        <Flex align="center">
          {/* <WithDropdown
            isOpen={isMenuOpen}
            zIndex={3}
            node={
              <Button
                className={['node-menu', isActive && 'active'].join(' ')}
                icon="Menu"
                type="neutral"
                appearance="text"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsMenuOpen(!isMenuOpen)
                }}
              />
            }
            onClose={() => {
              setIsMenuOpen(false)
            }}
          >
            <Flex
              direction="column"
              padding={8}
              style={{
                background: '#111',
              }}
            >
              <Flex marginBottom="small">
                <TextButton
                  text="Log Node"
                  action="LogNode"
                  actionArg={props.node.id}
                />
              </Flex>
              <Flex marginBottom="small">
                <TextButton
                  text="Log 20"
                  action="LogNodeLines"
                  actionArg={{ id: props.node.id, lines: 20 }}
                />
              </Flex>
              <Flex marginBottom="small">
                <TextButton
                  text="Log 100"
                  action="LogNodeLines"
                  actionArg={{ id: props.node.id, lines: 100 }}
                />
              </Flex>
              <Flex marginBottom="small">
                <TextButton
                  onClick={() => {
                    setIsEditingName(true)
                    setIsMenuOpen(false)
                  }}
                  text="Rename"
                />
              </Flex>
              {props.node._autonomous && (
                <Flex marginTop="small">
                  <TextButton
                    onClick={() => setIsMenuOpen(false)}
                    color="negative"
                    text="Delete"
                    action="Remove"
                    actionArg={props.node.id}
                  />
                </Flex>
              )}
            </Flex>
          </WithDropdown> */}
          {!node.isRoot && (
            <Flex
              className={['node-remove', isSelected && 'active'].join(' ')}
              onClick={(e) => {
                e.stopPropagation()
                node.remove()
              }}
            >
              <Icon name="X" color="white" width={9} />
            </Flex>
          )}
        </Flex>
      </Row>
    </div>
  )
}

export const Tree = (props: { node: Compositor.SceneNode }) => {
  const { project, isNodeSelected, resetSelectedNodes, toggleNodeSelected } =
    useProject()
  const isSelected = isNodeSelected(props.node.id)
  const node = project.get(props.node.id)
  const [isDragging, setIsDragging] = useState(false)
  const [isDropping, setIsDropping] = useState(false)
  const [isDroppingChildren, setIsDroppingChildren] = useState(false)
  // const isHidden = props.node.hidden
  // const isCollapsed = !editorState.expandedNodes.has(props.node.id)

  return (
    <Flex
      direction="column"
      grow={1}
      align="flex-start"
      className={[
        'node-tree',
        // isCollapsed && 'collapsed',
        isSelected && 'active',
      ].join(' ')}
      // data-collapsed={isCollapsed}
      data-active={isSelected}
      onClick={(e) => {
        e.stopPropagation()
        if (e.ctrlKey) {
          toggleNodeSelected(props.node.id)
        } else {
          resetSelectedNodes([props.node.id])
        }
      }}
    >
      <div
        draggable={!node.isRoot}
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
          e.dataTransfer.dropEffect = 'move'
          setIsDropping(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setIsDropping(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setIsDropping(false)
          const dragNodeId = e.dataTransfer.getData('text/plain')
          if (e.ctrlKey) {
            project.get(dragNodeId).move(node.id)
          } else {
            project.get(dragNodeId).swap(node.id)
          }
        }}
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', node.id)
          e.dataTransfer.dropEffect = 'move'
          e.dataTransfer.setDragImage(dragImage, 90, 15)
          setIsDragging(true)
        }}
        onDragEnd={(e) => {
          setIsDragging(false)
        }}
        style={{
          height: '100%',
          ...(isDropping && { outline: '1px solid white' }),
          ...(isDragging && { background: 'rgba(255,255,255,0.4)' }),
          opacity: isDragging ? 0.4 : 1,
        }}
      >
        <NodeView node={props.node} />
      </div>
      {
        // !isHidden &&
        // !isCollapsed &&
        !isDragging && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'stretch',
              width: '100%',
              outline: isDroppingChildren ? '1px solid white' : 'none',
              ...(node.children?.length > 0
                ? { paddingTop: 2, paddingBottom: 6 }
                : {}),
            }}
            onDragOver={(e) => {
              // TODO: Outline when drag over / unoutline when leave
              e.preventDefault()
              e.stopPropagation()
              e.dataTransfer.dropEffect = 'move'
              setIsDroppingChildren(true)
            }}
            onDragLeave={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsDroppingChildren(false)
            }}
            onDrop={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsDroppingChildren(false)
              const dragNodeId = e.dataTransfer.getData('text/plain')
              project.get(dragNodeId).move(node.id)
            }}
          >
            {(node.children || []).map((x, i) => (
              <Tree key={i} node={x} />
            ))}
          </div>
        )
      }
    </Flex>
  )
}

export const NodeEditor = ({ nodeId }: { nodeId: string }) => {
  const node = useProject().project.get(nodeId)

  return (
    <Column>
      <Row>
        {node.type} - {node.id}
      </Row>
      <Row>
        <Column>
          <label>Layout</label>
          <Flex padding={8} style={{ background: 'rgba(0, 0, 0, 0.2)' }}>
            <Layout component={node} />
          </Flex>
          <label>Raw JSON</label>
          <JSONInput
            placeholder={node.props}
            height="160px"
            reset={false}
            theme="dark"
            locale={locale}
            onChange={(x: any) => node.update(x.jsObject)}
          />
        </Column>
      </Row>
    </Column>
  )
}

const dragImageSvg = `
  <svg height="40" width="200" viewBox="0 0 120 75" xmlns="http://www.w3.org/2000/svg" style="">
    <rect width="120" height="40" style="
      opacity: 0.6;
      stroke: white;
      stroke-width: 1px;
      stroke-opacity: 0.8;
    "/>
  </svg>`

let dragImage: HTMLImageElement
const loadDragImage = () => {
  if (dragImage) return dragImage
  dragImage = new Image()
  dragImage.src = URL.createObjectURL(
    new Blob([dragImageSvg], {
      type: 'image/svg+xml',
    }),
  )
  return dragImage
}
loadDragImage()
