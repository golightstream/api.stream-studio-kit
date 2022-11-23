/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { insertAt, pull, toSceneTree } from '../logic'
import { layerToNode, nodeToLayer, sceneNodeToLayer } from './data'
import { CoreContext, log } from './context'
import { Compositor } from './namespaces'
import { LayoutApiModel } from '@api.stream/sdk'

export type BatchItem = LayoutApiModel.BatchLayerRequest_BatchItem
export type Batch = BatchItem[]
type ActionType = keyof BatchItem
type Action = [type: ActionType, layer: Partial<LayoutApiModel.Layer>]

const { connectionId } = CoreContext

export const latestUpdateVersion = {} as { [id: string]: number }
const getNextNodeVersion = (id: string) => {
  if (!latestUpdateVersion[id]) latestUpdateVersion[id] = 0
  return ++latestUpdateVersion[id]
}

const request = (layoutId: string, actions: Action[]) => {
  const layers = actions.map((action) => {
    const [type, layer] = action

    // @ts-ignore
    return {
      [type]: layer,
    } as BatchItem
  }) as Batch

  log.debug('Batch request', layers)
  return CoreContext.clients.LayoutApi().layer.batch({
    layoutId,
    layers,
    requestMetadata: {
      connectionId,
      layoutId,
      updateVersions: actions
        .filter(([type]) => type === 'update')
        .map(([_, layer]) => ({
          [layer.id]: getNextNodeVersion(layer.id),
        }))
        .reduce(
          (x, acc) => ({
            ...acc,
            ...x,
          }),
          {},
        ),
    },
  })
}

export const compositorAdapter: Compositor.DBAdapter = {
  db: (project) => {
    const layoutId = project.id

    return {
      async insert(props = {}, parentId, index) {
        // Convert the data to Layer schema
        const layer = nodeToLayer({
          id: null,
          props,
          childIds: [],
        })

        if (!parentId) {
          layer.type = 'root'
        } else {
          layer.type = 'child'
        }

        log.debug('Insert layer', layer)

        // Save the layer to the database
        const result = await CoreContext.clients.LayoutApi().layer.createLayer({
          layoutId,
          layer: {
            ...layer,
            requestMetadata: {
              connectionId,
              layoutId,
            },
          },
        })
        if ((result as any).code) throw new Error((result as any).message)

        const parentNode = await project.getNode(parentId)
        if (parentId && !parentNode) throw Error('Parent not found with ID')
        if (parentNode) {
          // Convert the parent to Layer schema
          const parent = sceneNodeToLayer(parentNode)
          const children = insertAt(index, result.id, parent.children)

          const update = {
            layoutId,
            layerId: parent.id,
            layer: {
              children,
              requestMetadata: {
                connectionId,
                layoutId,
                updateVersion: {
                  [layer.id]: getNextNodeVersion(layer.id),
                },
              },
            },
          }

          // Update the parent
          await CoreContext.clients.LayoutApi().layer.updateLayer(update)
        }

        return String(result.id)
      },
      async update(id, props = {}, replaceAll = false) {
        const node = project.getNode(id)

        // Convert the data to Layer schema
        const layer = sceneNodeToLayer({
          ...node,
          props: {
            ...(replaceAll ? {} : node.props),
            ...props,
          },
        })

        const update = {
          layoutId,
          layerId: layer.id,
          layer: {
            ...layer,
            requestMetadata: {
              connectionId,
              layoutId,
              updateVersions: {
                [layer.id]: getNextNodeVersion(layer.id),
              },
            },
          },
        }
        log.debug('Update layer', update)

        // Update the database
        await CoreContext.clients.LayoutApi().layer.updateLayer(update)
      },
      async remove(id) {
        const parentNode = await project.getParent(id)
        if (parentNode) {
          // Convert the parent to Layer schema
          const parent = sceneNodeToLayer(parentNode)
          const children = parent.children.filter((x) => x !== id)

          const update = {
            layoutId,
            layerId: parent.id,
            layer: {
              children,
              requestMetadata: {
                connectionId,
                layoutId,
                updateVersions: {
                  [parent.id]: getNextNodeVersion(parent.id),
                },
              },
            },
          }

          // Update the parent
          await CoreContext.clients.LayoutApi().layer.updateLayer(update)
        }

        // Update the database
        await CoreContext.clients.LayoutApi().layer.deleteLayer({
          layoutId,
          layerId: id,
          payload: {
            requestMetadata: {
              connectionId,
              layoutId,
            },
          },
        })
      },
      // @ts-ignore
      async reorder(id, childIds) {
        const node = project.getNode(id)

        // Convert the data to Layer schema
        const layer = nodeToLayer({
          ...node,
          childIds,
        })
        log.debug('Reorder layer children', layer)

        // Update the database
        await CoreContext.clients.LayoutApi().layer.updateLayer({
          layoutId,
          layerId: layer.id,
          layer: {
            children: layer.children,
            requestMetadata: {
              connectionId,
              layoutId,
              updateVersions: {
                [layer.id]: getNextNodeVersion(layer.id),
              },
            },
          },
        })
      },
      // @ts-ignore
      async move(id, newParentId, index) {
        const node = project.getNode(id)
        const prevParentNode = project.getNode(project.getParent(id).id)
        const prevParentLayer = nodeToLayer({
          ...prevParentNode,
          childIds: pull(
            prevParentNode.children.map((x) => x.id),
            node.id,
          ),
        })

        const newParentNode = project.getNode(newParentId)
        const newParentLayer = nodeToLayer({
          ...newParentNode,
          childIds: insertAt(
            index,
            node.id,
            newParentNode.children.map((x) => x.id),
          ),
        })

        log.debug('Move layers')

        // TODO: Batch
        // Update the database
        await Promise.all([
          CoreContext.clients.LayoutApi().layer.updateLayer({
            layoutId,
            layerId: prevParentLayer.id,
            layer: {
              children: prevParentLayer.children,
              requestMetadata: {
                connectionId,
                layoutId,
                updateVersions: {
                  [prevParentLayer.id]: getNextNodeVersion(prevParentLayer.id),
                },
              },
            },
          }),
          CoreContext.clients.LayoutApi().layer.updateLayer({
            layoutId,
            layerId: newParentLayer.id,
            layer: {
              children: newParentLayer.children,
              requestMetadata: {
                connectionId,
                layoutId,
                updateVersions: {
                  [newParentLayer.id]: getNextNodeVersion(newParentLayer.id),
                },
              },
            },
          }),
        ])
      },
      async batch(
        batch: [type: ActionType, node: Partial<Compositor.SceneNode>][],
      ) {
        const layerBatch = batch.map(
          ([type, node]) => [type, sceneNodeToLayer(node)] as Action,
        )
        const response = await request(layoutId, layerBatch)
        log.debug('Batch response', response)
        return response
      },
    }
  },
  createProject: (meta: { projectId: string; collectionId: string }) => {
    return CoreContext.clients
      .LayoutApi()
      .layout.createLayout({
        layout: {
          projectId: meta.projectId,
          collectionId: meta.collectionId,
        },
      })
      .then((x) => x.id)
  },
  loadProject: async (id) => {
    const { layers } = await CoreContext.clients.LayoutApi().layer.listLayers({
      layoutId: id,
    })

    const dataNodes = layers.map(layerToNode)

    // The root node is a child to no other node
    const rootNode = dataNodes.reduce((acc, x) => {
      if (!acc) return x
      // Check for an explicit root declaration
      if (acc.props.isRoot) return acc
      if (x.props.isRoot) return x
      // Or fall back to checking children
      if (!dataNodes.some((y) => y.childIds.includes(x.id))) return x
      return acc
    }, null)
    const tree = rootNode ? toSceneTree(dataNodes, rootNode.id) : null
    return tree
  },
}
