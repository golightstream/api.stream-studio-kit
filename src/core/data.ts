/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { CoreContext, InternalSource } from './context'
import { toSceneTree } from '../logic'
import { Context, SDK, Compositor } from './namespaces'
import { LiveApiModel, LayoutApiModel } from '@api.stream/sdk'
import { getRoom } from './webrtc/simple-room'
import { ProjectBroadcastPhase } from './types'
import { hasPermission, Permission } from '../helpers/permission'

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
  const { videoApi, props = {}, role } = project
  const { destinations, encoding, rendering, sources } = videoApi.project

  const broadcastPhase = project.videoApi.phase
  const broadcastId = project.videoApi.broadcastId || null

  return {
    broadcastPhase,
    role,
    broadcastId,
    isLive: [
      ProjectBroadcastPhase.PROJECT_BROADCAST_PHASE_RUNNING,
      ProjectBroadcastPhase.PROJECT_BROADCAST_PHASE_STOPPING,
    ].includes(broadcastPhase),
    scene: project.compositor,
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
    props: source.metadata?.props || {},
  }
}

export const getProjectSize = (project: LiveApiModel.Project) => {
  return {
    x: project.rendering.video.width,
    y: project.rendering.video.height,
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
  size = size || getProjectSize(project)

  if (size && hasPermission(role, Permission.UpdateProject)) {
    await CoreContext.clients.LiveApi().project.updateProject({
      collectionId: project.collectionId,
      projectId: project.projectId,
      rendering: {
        video: {
          width: size.x,
          height: size.y,
          framerate: 30,
        },
      },
      updateMask: ['rendering'],
    })
  }

  size = size || getProjectSize(project)

  const compositorProject = await CoreContext.compositor.loadProject(
    metadata.layoutId,
    {
      size,
      canEdit: hasPermission(role, Permission.UpdateProject),
    },
  )

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

export const getProject = (id: string) => {
  return state.projects.find((x) => x.id === id)
}

export const getProjectByLayoutId = (id: string) => {
  return state.projects.find((x) => x.compositor.id === id)
}

export const getProjectRoom = (id: string) => {
  return getRoom(getProject(id)?.roomId)
}
