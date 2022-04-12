/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { CoreContext } from './context'
import { toSceneTree } from '../logic'
import { Context, SDK, Compositor } from './namespaces'
import { LiveApiModel, LayoutApiModel } from '@api.stream/sdk'
import { getRoom } from './webrtc/simple-room'

const { state } = CoreContext

export const getAccessTokenData = () => {
  // @ts-ignore Type not exposed by Lighstream API
  return CoreContext.clients.accessTokenClaims?.user
}

export const toBaseProject = (project: Context.Project): SDK.Project => {
  const { compositor, videoApi, props } = project
  const { destinations, encoding, rendering, sources } = videoApi.project

  const scene = {
    get: compositor.get,
    getRoot: compositor.getRoot,
    getParent: compositor.getParent,
  }
  Object.defineProperty(scene, 'nodes', {
    get() {
      return compositor.nodes.filter((x) => !x._deleted)
    },
  })

  return {
    scene: scene as SDK.Scene,
    joinRoom: async (settings = {}) => {
      return CoreContext.Command.joinRoom({
        projectId: project.id,
        ...settings,
      })
    },
    subscribe: (cb) =>
      CoreContext.subscribe((event, payload) => {
        // @ts-ignore
        if (payload.projectId && payload?.projectId === project.id) {
          // @ts-ignore
          cb(event, payload)
        }
      }),
    ...{
      destinations: destinations.map(toBaseDestination),
      sources: sources.map(toBaseSource),
      encoding,
      rendering,
    },
    id: project.id,
    hostDisplayName: project.props.hostDisplayName,
    props,
  }
}

export const toBaseDestination = (
  destination: LiveApiModel.Destination,
): SDK.Destination => {
  return {
    id: destination.destinationId,
    enabled: destination.enabled,
    address: destination.address,
    props: destination.metadata || {},
  }
}

export const toBaseSource = (source: LiveApiModel.Source): SDK.Source => {
  return {
    id: source.sourceId,
    address: source.address,
    props: source.metadata,
  }
}

export const hydrateProject = async (project: LiveApiModel.Project) => {
  const metadata = project.metadata || {}
  const compositorProject = await layoutToProject(metadata.layoutId)

  return {
    id: project.projectId,
    compositor: compositorProject,
    videoApi: { project: { ...project } },
    layoutApi: {
      layoutId: metadata.layoutId,
    },
    props: metadata,
  } as Context.Project
}

export const sceneNodeToLayer = (
  node: Partial<Compositor.SceneNode>,
): LayoutApiModel.Layer => {
  const { id, props = {}, children = [] } = node
  return {
    ...(id ? { id } : {}),
    type: props.type,
    data: {
      ...props,
    },
    children: children.map((x) => x.id),
  } as LayoutApiModel.Layer
}

export const nodeToLayer = (
  node: Compositor.DataNode,
): LayoutApiModel.Layer => {
  return {
    id: node.id,
    type: node.props.type,
    data: {
      ...node.props,
    },
    children: node.childIds.map((x) => x),
  } as LayoutApiModel.Layer
}

export const layerToNode = (
  layer: LayoutApiModel.Layer,
): Compositor.DataNode => {
  return {
    id: String(layer.id),
    props: {
      type: layer.type,
      ...layer.data,
    },
    childIds: layer.children.map((x) => String(x)),
  }
}

export const layoutToProject = async (
  layoutId: LayoutApiModel.Layout['id'],
): Promise<Compositor.Project> => {
  const { layers } = await CoreContext.clients.LayoutApi().layer.listLayers({
    layoutId,
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
  return CoreContext.compositor.loadProject(tree, layoutId)
}

/**
 * Queries
 */

export const getProjectByLayoutId = (id: string) => {
  return state.projects.find((x) => x.compositor.id === id)
}

export const getProject = (id: string) => {
  return state.projects.find((x) => x.id === id)
}

export const getProjectRoom = (id: string) => {
  return getRoom(getProject(id)?.roomId)
}
