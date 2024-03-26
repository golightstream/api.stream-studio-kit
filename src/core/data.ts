/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { LayoutApiModel, LiveApiModel } from '@api.stream/sdk'
import { toSceneTree } from '../logic'
import { Permission, hasPermission } from './../helpers/permission'
import { CoreContext, InternalSource } from './context'
import { Compositor, Context, SDK } from './namespaces'
import { ProjectBroadcastPhase } from './types'
import { getRoom } from './webrtc/simple-room'

const { state } = CoreContext

export const getAccessTokenData = () => {
  // @ts-ignore Type not exposed by API
  return CoreContext.clients.accessTokenClaims?.user || {}
}

// Pulls the external User from internal state
export const getBaseUser = (): SDK.User => {
  if (!state.user) return null

  return {
    id: state.user.id,
    props: state.user.props,
    name: state.user.name,
    projects: state.projects.map(toBaseProject),
    sources: state.sources.map(toBaseSource),
  }
}

export const toBaseProject = (
  project: Context.InternalProject,
): SDK.Project => {
  const { compositor, videoApi, props = {}, role } = project
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

  const broadcastPhase = project.videoApi.phase
  const broadcastId = project.videoApi.broadcastId || null

  // TODO: Check project root node type and extend functionality
  //  e.g. ScenelessProject

  return {
    broadcastPhase,
    role,
    broadcastId,
    layoutId: project.layoutApi.layoutId,
    isLive: [
      ProjectBroadcastPhase.PROJECT_BROADCAST_PHASE_RUNNING,
      ProjectBroadcastPhase.PROJECT_BROADCAST_PHASE_STOPPING,
    ].includes(broadcastPhase),
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
    // For backward compatibility, fall back to "metadata" as props.
    //  All new projects have a dedicated "props" field
    props: destination.metadata?.props || destination?.metadata || {},
  }
}

export const toBaseSource = (source: InternalSource): SDK.Source => {
  return {
    id: source.sourceId,
    address: source.address,
    preview: source.preview,
    props: source.metadata?.props || {},
  }
}

export const hydrateProject = async (
  project: LiveApiModel.Project,
  role: SDK.Role,
  size?: {
    x: number
    y: number
  },
) => {
  const metadata = project.metadata || {}

  const updateRequest: LiveApiModel.UpdateProjectRequest = {
    collectionId: project.collectionId,
    projectId: project.projectId,    
    updateMask: [],
  };

  // only update the sdk version when the user can broadcast (given this version controls the renderer)
  const canBroadcast = hasPermission(role, Permission.ManageBroadcast);
  
  // handle sdk version changing for rendering
  if (canBroadcast && project.composition.studioSdk.version !== CoreContext.rendererVersion) {
    updateRequest.composition = {
      studioSdk: {
        version: CoreContext.rendererVersion,
      }
    } as LiveApiModel.Composition;
    updateRequest.updateMask.push('composition.studioSdk.version');
  }

  // handle composition size changing
  if (size) {
    updateRequest.rendering = {
      video: {
        width: size.x,
        height: size.y,
        framerate: 30,
      },      
    };

    updateRequest.updateMask.push('rendering');
  }

  if (updateRequest.updateMask.length) {
    await CoreContext.clients.LiveApi().project.updateProject(updateRequest);
  }

  const compositorProject = await layoutToProject(metadata.layoutId, size)

  return {
    id: project.projectId,
    compositor: compositorProject,
    role,
    videoApi: {
      project,
      phase: ProjectBroadcastPhase.PROJECT_BROADCAST_PHASE_UNSPECIFIED,
    },
    layoutApi: {
      layoutId: metadata.layoutId,
    },
    // For backward compatibility, fall back to "metadata" as props.
    //  All new projects have a dedicated "props" field
    props: metadata?.props || metadata,
  } as Context.InternalProject
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
  size?: {
    x: number
    y: number
  },
): Promise<Compositor.Project> => {
  const { layers } = await CoreContext.clients.LayoutApi().layer.listLayers({
    layoutId,
  })

  if (size && layers) {
    const { x, y } = size

    const rootLayer = layers?.reduce((acc, x) => {
      if (!acc) return x
      if (acc.data.isRoot) return acc
      if (x.data.isRoot) return x
      if (!layers.some((y) => y.children.includes(x.id))) return x
      return acc
    }, null)

    if (rootLayer) {
      const layer = await CoreContext.clients.LayoutApi().layer.updateLayer({
        layoutId: rootLayer.layoutId,
        layerId: rootLayer.id,
        layer: {
          x,
          y,
          data: {
            ...rootLayer.data,
            size: {
              x,
              y,
            },
          },
        },
      })

      const layerIndex = layers.findIndex((l) => l.id === layer.id)
      layers[layerIndex] = layer
    }
  }

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

export const getUser = () => {
  const user = state.user
  if (!user) {
    // If we try to get the user and they don't exist,
    //  it's fair to assume we are in an unexpected situation.
    throw new Error('User not loaded')
  }
  return user
}

export const getSources = () => {
  return state.sources
}

export const getProject = (id: string) => {
  return state.projects.find((x) => x.id === id)
}

export const getProjectByLayoutId = (id: string) => {
  return state.projects.find((x) => x.compositor.id === id)
}

export const getProjectRoom = (id: string) => {
  return getRoom(getProject(id)?.roomId)
}
