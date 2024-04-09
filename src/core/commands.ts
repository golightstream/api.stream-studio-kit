/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
/**
 * Commands represent actions that can be taken by a user.
 *
 * Most commands accept a contextual parameter `projectId`.
 * If this parameter is excluded from a function call, the user's
 * active project will be used instead.
 *
 * Upon completion, a command may emit zero or more {@link EventMap Events}. Commands
 * return Promises that will attempt to resolve to the most pertinent value.
 * However, it is good practice to instead rely on events where possible, when
 * updating application state.
 *
 * For example, listening for the event `BroadcastStarted` will indicate
 * the following scenarios:
 *
 *   - The current user has initiated a broadcast
 *   - A collaborator (or host) has initiated a broadcast
 *   - Some external force has initiated a broadcast
 *
 * When depending on the Event rather than the command's return value, we can
 * be sure that our state is updating under all relevant circumstances.
 *
 * ----
 *
 * _Note: Commands marked `internal` are low-level commands that should only be
 * used with caution. Higher-level abstractions should be used to manipulate Nodes
 * (elements on the stream canvas)._
 *
 * @private This module is currently hidden from users of the Studio Kit.
 *  Favor the creation of helpers when supporting developers who require
 *  functionality contained in this module.
 *
 * @module Commands
 */

import {
  getProject,
  getUser,
  hydrateProject,
  toBaseDestination,
  toBaseProject,
} from './data'
import { CoreContext } from './context'
import { jwtDecode } from 'jwt-decode'
import { Props } from './types'
import { SDK } from './namespaces'
import { LiveApiModel } from '@api.stream/sdk'
import { webrtcManager } from './webrtc'
import { getRoom } from './webrtc/simple-room'
import { trigger, triggerInternal } from './events'
import { DeepPartial } from '../logic'

const { state } = CoreContext

/**
 * Update the current user's metadata with custom data opaque to the SDK.
 * Existing props are not affected unless explicitly overwritten.
 *
 * @category User
 */
export const updateUserProps = async (payload: {
  /** Arbitrary metadata to associate with the user */
  props?: Props
}) => {
  const collection = getUser()
  if (!collection) return

  const props = {
    ...collection.props,
    ...payload.props,
  }
  const response = await CoreContext.clients
    .LiveApi()
    .collection.updateCollection({
      collectionId: collection.id,
      updateMask: ['metadata'],
      metadata: {
        ...collection.metadata,
        props,
      },
    })

  // Trigger event to update state
  await triggerInternal('UserChanged', response.collection)
  return
}

/**
 * Create a source
 *
 * @category Source
 */
export const createSource = async (payload: {
  projectId: string
  displayName?: string
  address?: Partial<LiveApiModel.SourceAddress>
  props?: any
}) => {
  const collectionId = getUser().id

  const { source } = await CoreContext.clients.LiveApi().source.createSource({
    metadata: { props: payload.props || {} },
    collectionId,
    address: payload.address,
    preview: {
      webrtc: {
        enabled: true,
        displayName: payload.displayName || 'RTMP Source',
      },
    },
  })

  // Trigger event to update state
  await triggerInternal('SourceAdded', source)

  // Add source to project

  const response = await CoreContext.clients
    .LiveApi()
    .source.addSourceToProject({
      collectionId,
      projectId: payload.projectId,
      sourceId: source.sourceId,
    })

  await triggerInternal('ProjectSourceAdded', {
    projectId: response.project.projectId,
    source,
  })

  return source
}

/**
 * Get all sources in the collection
 *
 * @category Source
 */
const getSources = async () => {
  const collectionId = getUser().id

  const { sources } = await CoreContext.clients
    .LiveApi()
    .source.getSources({ collectionId })

  return sources
}

const getSource = async (payload: { sourceId: string }) => {
  const collectionId = getUser().id

  const { source } = await CoreContext.clients.LiveApi().source.getSource({
    collectionId,
    sourceId: payload.sourceId,
  })

  return source
}

/**
 * Update a source metadata and/or displayName
 *
 * @category Source
 */
export const updateSource = async (payload: {
  sourceId: string
  metadata?: any
  displayName?: string
}) => {
  const collectionId = getUser().id
  let updateMask: string[] = []
  let updateProps: Partial<LiveApiModel.UpdateSourceRequest> = {}
  if (payload.metadata) {
    updateMask.push('metadata')
    updateProps.metadata = payload.metadata
  }
  if (payload.displayName) {
    updateMask.push('preview.webrtc.displayName')
    updateProps = {
      ...updateProps,
      preview: {
        webrtc: {
          displayName: payload.displayName,
        },
      },
    }
  }
  const { source } = await CoreContext.clients.LiveApi().source.updateSource({
    collectionId,
    updateMask,
    sourceId: payload.sourceId,
    ...updateProps,
  })

  // Trigger event to update state
  await triggerInternal('SourceChanged', source)

  return source
}

/**
 * Delete a source
 *
 * @category Source
 */
export const deleteSource = async (payload: {
  projectId: string
  sourceId: string
  force?: boolean
}) => {
  const collectionId = getUser().id
  const removeRes = await CoreContext.clients
    .LiveApi()
    .source.removeSourceFromProject({
      collectionId,
      projectId: payload.projectId,
      sourceId: payload.sourceId,
    })

  await triggerInternal('ProjectSourceRemoved', {
    projectId: payload.projectId,
    sourceId: payload.sourceId,
  })

  const response = await CoreContext.clients
    .LiveApi()
    .source.deleteSource({ sourceId: payload.sourceId, collectionId })

  await triggerInternal('SourceRemoved', payload.sourceId)
  return response
}

/**
 * Create a project with optional metadata.
 *
 * ----
 * _Note: This is a low level function that necessitates careful management
 *  of the nodes within. Consider {@link ScenelessProject.create} instead._
 *
 * @category Project
 */
export const createProject = async (
  payload: {
    /** @private Settings associated with ScenelessProject (or other such wrapper) */
    settings?: { [prop: string]: any }
    /** Arbitrary metadata to associate with this project */
    props?: Props
    /** Pixel dimenions of the canvas (default: `{ x: 1280, y: 720 }`) */
    size?: { x: number; y: number }
  } = {},
) => {
  const { props = {}, size, settings = {} } = payload
  const response = await CoreContext.Request.createProject({
    settings,
    props,
    size,
  })

  // Trigger event to update state
  await triggerInternal('ProjectAdded', response.project)

  // Return the base project directly, for convenience
  const internalProject = await hydrateProject(
    response.project,
    'ROLE_HOST' as SDK.Role,
  )
  return toBaseProject(internalProject)
}

/**
 * @private
 * Recreate a project's associated layout
 */
export const recreateLayout = async (payload: {
  projectId: string
  props?: Props
}) => {
  const { projectId, props = {} } = payload
  const collectionId = getUser().id

  // Get the Vapi project
  const response = await CoreContext.clients.LiveApi().project.getProject({
    collectionId,
    projectId,
    status: true,
  })

  // Return if the project is actively broadcasting
  if (
    [
      SDK.ProjectBroadcastPhase.PROJECT_BROADCAST_PHASE_RUNNING,
      SDK.ProjectBroadcastPhase.PROJECT_BROADCAST_PHASE_STARTING,
    ].includes(response.status.phase)
  ) {
    return
  }

  const metadata = response.project.metadata || {}
  const { layoutId } = metadata
  const { video } = response.project.rendering
  const { type } = response.project.metadata.props || {}

  // Create the new layout
  const layout = await CoreContext.Request.createLayout({
    collectionId,
    projectId,
    type: type || 'sceneless',
    settings: {},
    size: {
      x: video.width,
      y: video.height,
    },
  })

  // Set the new layout on the project
  const updateResponse = await CoreContext.clients
    .LiveApi()
    .project.updateProject({
      collectionId,
      projectId,
      updateMask: ['metadata'],
      metadata: {
        ...metadata,
        layoutId: layout.id,
      },
    })

  CoreContext.log.debug('New layout assigned to project:', { layout })

  // Trigger event to update state
  await triggerInternal('ProjectChanged', { project: updateResponse.project })

  // Delete the previous layout
  await CoreContext.clients.LayoutApi().layout.deleteLayout({
    layoutId,
  })

  CoreContext.log.debug('Previous layout deleted:', { layoutId })

  // Return the base project directly, for convenience
  const internalProject = await hydrateProject(
    updateResponse.project,
    'ROLE_HOST' as SDK.Role,
  )

  // Add props to the root node
  await internalProject.compositor.update(
    internalProject.compositor.getRoot().id,
    props,
  )

  /** return original project as well as internal project */
  return { project: toBaseProject(internalProject), internalProject }
}
/**
 * Delete a project.
 *
 * @category Project
 */
export const deleteProject = async (payload: {
  projectId: SDK.Project['id']
}) => {
  const { projectId } = payload
  await CoreContext.Request.deleteProject({
    projectId,
  })

  // Trigger event to update state
  await triggerInternal('ProjectRemoved', { projectId })
  return
}

/**
 * Update a project's metadata with custom data opaque to the SDK.
 * Existing props are not affected unless explicitly overwritten.
 *
 * @category Project
 */
export const updateProjectProps = async (payload: {
  projectId: SDK.Project['id']
  /** Arbitrary metadata to associate with this project */
  props?: Props
}) => {
  const { projectId } = payload
  const collectionId = getUser().id
  const project = getProject(projectId)

  const props = {
    ...project.props,
    ...payload.props,
  }
  const response = await CoreContext.clients.LiveApi().project.updateProject({
    collectionId,
    projectId,
    updateMask: ['metadata'],
    metadata: {
      ...project.videoApi.project.metadata,
      props,
    },
  })

  // Trigger event to update state
  await triggerInternal('ProjectChanged', { project: response.project })
  return
}

/**
 * @private Use updateProjectProps without internaltriggers
 */
export const updateProjectPropsWithoutTrigger = async (payload: {
  projectId: SDK.Project['id']
  /** Arbitrary metadata to associate with this project */
  props?: Props
}) => {
  const { projectId } = payload
  const collectionId = getUser().id
  const project = getProject(projectId)

  const props = {
    ...project.props,
    ...payload.props,
  }
  const response = await CoreContext.clients.LiveApi().project.updateProject({
    collectionId,
    projectId,
    updateMask: ['metadata'],
    metadata: {
      ...project.videoApi.project.metadata,
      props,
    },
  })
  return
}

/**
 * Set the active project for the user, setting up event handlers and
 *  disposing of event listeners for the previous active project.
 *
 * This project will be used as the default project
 *  for commands that do not specify `payload.projectId`
 *
 * @category Project
 */
export const setActiveProject = async (payload: {
  projectId: SDK.Project['id']
}): Promise<SDK.Project> => {
  const project = state.projects.find((x) => x.id === payload.projectId)
  if (!project) {
    state.activeProjectId = null
    triggerInternal('ActiveProjectChanged', { projectId: null })
    return
  }

  const currentProject = state.projects.find(
    (x) => x.id === state.activeProjectId,
  )
  if (project === currentProject) return
  if (currentProject) {
    // Perform any necessary cleanup
    Array.from(webrtcManager.rooms.keys()).map(webrtcManager.removeRoom)
    await CoreContext.clients
      .LayoutApi()
      .unsubscribeFromLayout(currentProject.layoutApi.layoutId)
    await CoreContext.clients
      .LiveApi()
      .unsubscribeFromProject(
        currentProject.videoApi.project.collectionId,
        currentProject.videoApi.project.projectId,
      )
    await CoreContext.clients
      .LiveApi()
      .unsubscribeFromCollection(currentProject.videoApi.project.collectionId)
  }

  await CoreContext.clients
    .LayoutApi()
    .subscribeToLayout(project.layoutApi.layoutId)

  await CoreContext.clients
    .LiveApi()
    .subscribeToProject(
      project.videoApi.project.collectionId,
      project.videoApi.project.projectId,
    )

  await CoreContext.clients
    .LiveApi()
    .subscribeToCollection(project.videoApi.project.collectionId)

  // Asynchronously ensure latest project state
  CoreContext.clients
    .LiveApi()
    .project.getProject({
      collectionId: project.videoApi.project.collectionId,
      projectId: project.videoApi.project.projectId,
      status: true,
    })
    .then((response) => {
      triggerInternal('ProjectChanged', {
        project: response.project,
        phase: response.status?.phase,
        broadcastId: response.status?.broadcastId,
      })
    })

  triggerInternal('ActiveProjectChanged', {
    projectId: project.id,
  })
  return toBaseProject(project)
}

/**
 * Initiate WebRTC connection to the room associated with this project.
 *
 * @category Project
 */
export const joinRoom = async (payload: {
  projectId: SDK.Project['id']
  /** A public name for other guests will see associated with your {@link Participant} */
  displayName?: string
}) => {
  const { projectId, displayName = 'Guest' } = payload
  const project = state.projects.find((x) => x.id === projectId)

  // Get the SFU token
  let token = project.sfuToken
  if (!token) {
    let { webrtcAccess } = await CoreContext.clients
      .LiveApi()
      .authentication.createWebRtcAccessToken({
        collectionId: project.videoApi.project.collectionId,
        projectId: project.videoApi.project.projectId,
        displayName,
      })
    token = webrtcAccess.accessToken
  }
  const tokenData = jwtDecode(token) as any
  const roomName = tokenData.video.room
  const url = new URL(CoreContext.clients.getLiveKitServer())
  const baseUrl = url.host + url.pathname
  const roomContext = webrtcManager.ensureRoom(baseUrl, roomName, token)
  roomContext.bindApiClient(CoreContext.clients)
  await roomContext.connect()

  project.sfuToken = token
  project.roomId = roomName
  const room = getRoom(roomName)
  trigger('RoomJoined', {
    projectId: project.id,
    room,
  })
  return room
}

/**
 * Create a node within the project's scene tree.
 * A node is functionally comparable to a DOM Node - it serves only as a vessel
 * of properties.
 *
 * A node is not inherently useful. It is up to the renderer to interpret the data it holds.
 * If a node is given data the renderer is not aware of, it will accomplish nothing.
 *
 * ----
 * _Note: This is a low level interface. Abstractions like {@link ScenelessProject}
 * prevent the need for node manipulations._
 *
 * @internal _Use with caution_
 * @category Node
 */
export const createNode = async (payload: {
  projectId?: string
  props?: { [prop: string]: any }
  parentId: string
  index?: number
}) => {
  let {
    props = {},
    parentId,
    index,
    projectId = state.activeProjectId,
  } = payload
  const project = getProject(projectId)

  // Update state
  const nodeId = await project.compositor.insert(props, parentId, index)
  triggerInternal('NodeAdded', { projectId, nodeId })
  triggerInternal('NodeChanged', { projectId, nodeId: parentId })
  return project.compositor.get(nodeId)
}

/**
 * Remove a node from the project's scene tree.
 *
 * ----
 * _Note: This is a low level interface. Abstractions like {@link ScenelessProject}
 * prevent the need for node manipulations._
 *
 * @internal _Use with caution_
 * @category Node
 */
export const deleteNode = async (payload: {
  projectId?: string
  nodeId: string
}) => {
  let { nodeId, projectId = state.activeProjectId } = payload
  const project = getProject(projectId)
  const parentId = project.compositor.getParent(nodeId)?.id

  // Update state
  project.compositor.remove(nodeId)
  triggerInternal('NodeRemoved', { projectId, nodeId })
  triggerInternal('NodeChanged', { projectId, nodeId: parentId })
}

/**
 * Update the properties of a node.
 * `payload.props` will be shallowly merged onto its existing `props`.
 *
 * ----
 * _Note: This is a low level interface. Abstractions like {@link ScenelessProject}
 * prevent the need for node manipulations._
 *
 * @internal _Use with caution_
 * @category Node
 */
export const updateNode = async (payload: {
  projectId?: string
  nodeId: string
  props: { [prop: string]: any }
}) => {
  let { nodeId, props = {}, projectId = state.activeProjectId } = payload
  const project = getProject(projectId)

  // Prune protected fields
  delete props.type
  delete props.sourceType

  // Update state
  project.compositor.update(nodeId, props)
  triggerInternal('NodeChanged', { projectId, nodeId })
  return project.compositor.get(nodeId)
}

/**
 * Update the layout of a node.
 *
 * ----
 * _Note: This is a low level interface. Abstractions like {@link ScenelessProject}
 * prevent the need for node manipulations._
 *
 * @internal _Use with caution_
 * @category Node
 */
export const setNodeLayout = async (payload: {
  projectId?: string
  nodeId: string
  layout: string
  layoutProps?: { [prop: string]: any }
}) => {
  let {
    nodeId,
    layout,
    projectId = state.activeProjectId,
    layoutProps = {},
  } = payload
  const project = getProject(projectId)

  // Update state
  project.compositor.update(nodeId, {
    layout,
    layoutProps,
  })
  triggerInternal('NodeChanged', { projectId, nodeId })
}

/**
 * Move a node to a different parent node.
 *
 * ----
 * _Note: This is a low level interface. Abstractions like {@link ScenelessProject}
 * prevent the need for node manipulations._
 *
 * @internal _Use with caution_
 * @category Node
 */
export const moveNode = async (payload: {
  projectId?: string
  nodeId: string
  parentId: string
  index?: number
}) => {
  const { nodeId, parentId, projectId = state.activeProjectId, index } = payload
  const project = getProject(projectId)

  // Update state
  project.compositor.move(nodeId, parentId, index)
  // TODO: Determine if this is necessary (likely need only the events from Event API)
  triggerInternal('NodeChanged', { projectId, nodeId })
}

/**
 * Swap the positions of two nodes, changing parents if necessary.
 *
 * ----
 * _Note: This is a low level interface. Abstractions like {@link ScenelessProject}
 * prevent the need for node manipulations._
 *
 * @internal _Use with caution_
 * @category Node
 */
export const swapNodes = async (payload: {
  projectId?: string
  nodeAId: string
  nodeBId: string
}) => {
  const { nodeAId, nodeBId, projectId = state.activeProjectId } = payload
  const project = getProject(projectId)

  const parentAId = project.compositor.getParent(nodeAId)?.id
  const parentBId = project.compositor.getParent(nodeBId)?.id

  // Update state
  project.compositor.swap(nodeAId, nodeBId)
  triggerInternal('NodeChanged', { projectId, nodeId: parentAId })
  triggerInternal('NodeChanged', { projectId, nodeId: parentBId })
}

/**
 * Change the order of a node's children.
 *
 * ----
 * _Note: This is a low level interface. Abstractions like {@link ScenelessProject}
 * prevent the need for node manipulations._
 *
 * @internal _Use with caution_
 * @category Node
 */
export const reorderNodes = async (payload: {
  projectId?: string
  parentId: string
  childIds: string[]
}) => {
  const { parentId, childIds, projectId = state.activeProjectId } = payload
  const project = getProject(projectId)

  // Update state
  project.compositor.reorder(parentId, childIds)
  triggerInternal('NodeChanged', { projectId, nodeId: parentId })
}

/**
 * Start broadcasting a project.
 *
 * ----
 * _Note: Destination, encoding, and rendering details will be read from the Project
 * at time of broadcast, so they should be updated ahead of time._
 *
 * @category Broadcast
 */

export const startBroadcast = async (payload: {
  projectId?: string
  dynamicSources?: DeepPartial<
    LiveApiModel.StartProjectBroadcastRequest['dynamicSources']
  >
  props?: Props
}) => {
  const { projectId = state.activeProjectId, dynamicSources,props } = payload
  const project = getProject(projectId)

  await CoreContext.clients.LiveApi().project.startProjectBroadcast({
    collectionId: project.videoApi.project.collectionId,
    projectId: project.videoApi.project.projectId,
    ...(dynamicSources && { dynamicSources }),
    ...(props && { triggerMetadata: { ...props } })
  })
  // Event is handled on receiving end of VideoAPI
}

/**
 * Stop broadcasting a project.
 *
 * @category Broadcast
 */
export const stopBroadcast = async (payload: { projectId?: string }) => {
  const { projectId = state.activeProjectId } = payload
  const project = getProject(projectId)
  await CoreContext.clients.LiveApi().project.stopProjectBroadcast({
    collectionId: project.videoApi.project.collectionId,
    projectId: project.videoApi.project.projectId,
  })
  // Event is handled on receiving end of VideoAPI
}

/**
 * Add a {@link Destination} to a project.
 *
 * @category Destination
 */
export const addDestination = async (payload: {
  projectId?: string
  rtmpUrl: string
  rtmpKey: string
  enabled: boolean
  props?: Props
}) => {
  const {
    rtmpUrl,
    rtmpKey,
    enabled,
    projectId = state.activeProjectId,
    props = {},
  } = payload
  const project = getProject(projectId)
  const address = {
    rtmpPush: {
      key: rtmpKey,
      url: rtmpUrl,
    },
  } as SDK.Destination['address']

  const response = await CoreContext.clients
    .LiveApi()
    .destination?.createDestination({
      collectionId: project.videoApi.project.collectionId,
      projectId: project.videoApi.project.projectId,
      address,
      enabled,
      metadata: {
        props,
      },
    })

  // Trigger event to update state
  await triggerInternal('DestinationAdded', response.destination)
  return toBaseDestination(response.destination)
}

/**
 * Remove a {@link Destination} from the project.
 *
 * @category Destination
 */
export const removeDestination = async (payload: {
  projectId?: string
  destinationId: string
}) => {
  const { destinationId, projectId = state.activeProjectId } = payload
  const project = getProject(projectId)

  await CoreContext.clients.LiveApi().destination?.deleteDestination({
    collectionId: project.videoApi.project.collectionId,
    projectId: project.videoApi.project.projectId,
    destinationId,
  })

  // Trigger event to update state
  await triggerInternal('DestinationRemoved', { projectId, destinationId })
  return
}

/**
 * Update an existing {@link Destination} on the project.
 *
 * @category Destination
 */
export const updateDestination = async (payload: {
  projectId?: string
  destinationId: string
  rtmpUrl: string
  rtmpKey: string
}) => {
  const {
    rtmpUrl,
    rtmpKey,
    destinationId,
    projectId = state.activeProjectId,
  } = payload
  const project = getProject(projectId)

  const rtmpPush = {
    key: rtmpKey,
    url: rtmpUrl,
  }

  const response = await CoreContext.clients
    .LiveApi()
    .destination?.updateDestination({
      collectionId: project.videoApi.project.collectionId,
      projectId: project.videoApi.project.projectId,
      destinationId,
      updateMask: ['address.rtmpPush'],
      address: {
        rtmpPush,
      },
    })

  // Trigger event to update state
  await triggerInternal('DestinationChanged', response.destination)
  return
}

/**
 * Update the metadata of an existing {@link Destination} on the project.
 *
 * @category Destination
 */
export const updateDestinationProps = async (payload: {
  projectId: string
  destinationId: string
  props: Props
}) => {
  const {
    projectId = state.activeProjectId,
    destinationId,
    props = {},
  } = payload
  const project = getProject(projectId)
  const destination = project.videoApi.project.destinations.find(
    (x) => x.destinationId === destinationId,
  )
  if (!destination) return

  const response = await CoreContext.clients
    .LiveApi()
    .destination?.updateDestination({
      collectionId: project.videoApi.project.collectionId,
      projectId: project.videoApi.project.projectId,
      destinationId,
      updateMask: ['metadata'],
      metadata: {
        ...(destination.metadata || {}),
        props: {
          ...(destination.metadata?.props || {}),
          ...props,
        },
      },
    })

  // Trigger event to update state
  await triggerInternal('DestinationChanged', response.destination)
  return
}

/**
 * Enable or disable an existing {@link Destination} on the project.
 *
 * @category Destination
 */
export const setDestinationEnabled = async (payload: {
  projectId?: string
  destinationId: string
  enabled: boolean
}) => {
  const { enabled, destinationId, projectId = state.activeProjectId } = payload
  const project = getProject(projectId)
  const destination = project.videoApi.project.destinations.find(
    (x) => destinationId === x.destinationId,
  )
  if (destination.enabled === enabled) return

  const response = await CoreContext.clients
    .LiveApi()
    .destination?.updateDestination({
      collectionId: project.videoApi.project.collectionId,
      projectId: project.videoApi.project.projectId,
      destinationId,
      updateMask: ['enabled'],
      enabled,
    })

  // Trigger event to update state
  await triggerInternal('DestinationChanged', response.destination)
}

/**
 * Overwrite project's first {@link Destination} with new configuration
 *  If no destination exists, one will be created instead.
 *
 * This is a helper to manage a single-destination project. For greater control,
 *  use {@link addDestination}, {@link removeDestination}, or {@link updateDestination}
 *
 * @category Destination
 */
export const setDestination = async (payload: {
  projectId?: string
  rtmpUrl: string
  rtmpKey: string
}) => {
  const { rtmpUrl, rtmpKey, projectId = state.activeProjectId } = payload
  const project = getProject(projectId)
  const rtmpPush = {
    key: rtmpKey,
    url: rtmpUrl,
  }
  const enabled = true

  if (project.videoApi.project.destinations.length > 0) {
    // Update existing
    const response = await CoreContext.clients
      .LiveApi()
      .destination?.updateDestination({
        collectionId: project.videoApi.project.collectionId,
        projectId: project.videoApi.project.projectId,
        destinationId: project.videoApi.project.destinations[0].destinationId,
        updateMask: ['address.rtmpPush'],
        address: { rtmpPush },
      })

    // Trigger event to update state
    await triggerInternal('DestinationChanged', response.destination)
  } else {
    // Create new
    const response = await CoreContext.clients
      .LiveApi()
      .destination?.createDestination({
        collectionId: project.videoApi.project.collectionId,
        projectId: project.videoApi.project.projectId,
        address: { rtmpPush },
        enabled,
      })

    // Trigger event to update state
    await triggerInternal('DestinationAdded', response.destination)
  }
}
