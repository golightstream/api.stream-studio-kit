/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { insertAt, pull } from '../logic'
import { nodeToLayer, sceneNodeToLayer } from './data'
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

export const compositorAdapter: Compositor.DBAdapter = (layoutId, methods) => ({
  async insert(props = {}, parentId, index) {
    // Convert the data to Layer schema
    const layer = nodeToLayer({
      id: null,
      props,
      childIds: [],
    })

    // Note: Layer.type is used only as a fallback if props.type is not set
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

    const parentNode = await methods.get(parentId)
    if (parentId && !parentNode) throw Error('Parent not found with ID')
    if (parentNode) {
      // Convert the parent to Layer schema
      const parent = nodeToLayer(parentNode)
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
  async update(id, props = {}) {
    const node = methods.get(id)

    // Convert the data to Layer schema
    const layer = nodeToLayer({
      ...node,
      props: {
        ...node.props,
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
    const parentNode = await methods.getParent(id)
    if (parentNode) {
      // Convert the parent to Layer schema
      const parent = nodeToLayer(parentNode)
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
    const node = methods.get(id)

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
    const node = methods.get(id)
    const prevParentNode = methods.get(methods.getParent(id).id)
    const prevParentLayer = nodeToLayer({
      ...prevParentNode,
      childIds: pull(prevParentNode.childIds, node.id),
    })

    const newParentNode = methods.get(newParentId)
    const newParentLayer = nodeToLayer({
      ...newParentNode,
      childIds: insertAt(index, node.id, newParentNode.childIds),
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
    try {
      const layerBatch = batch.map(
        ([type, node]) => [type, sceneNodeToLayer(node)] as Action,
    )
    const response = await request(layoutId, layerBatch)
      log.debug('Batch response', response)
      return response
    } catch (error) {
      log.error('Batch error', error)
    }
  },
})
