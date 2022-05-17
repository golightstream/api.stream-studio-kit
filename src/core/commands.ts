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
 * _See: **{@link ScenelessProject.Commands}**_
 *
 * @module Commands
 */

import { Project } from './context'
import {
  getProject,
  hydrateProject,
  toBaseDestination,
  toBaseProject,
} from './data'
import { CoreContext } from './context'
import decode from 'jwt-decode'
import { Metadata } from './types'
import { SDK, Events, Compositor } from './namespaces'
import { webrtcManager } from './webrtc'
import { getRoom } from './webrtc/simple-room'

const { trigger, state } = CoreContext

/**
 * Create a project with optional metadata.
 * 
 * ----
 * _Note: This is a low level function that necessitates careful management
 *  of the nodes within. Consider {@link ScenelessProject.create} instead._
 *
 * **Emits {@link ProjectAdded}**
 *
 * @internal _Use with caution_
 * @category Project
 */
export const createProject = async (
  payload: {
    /** @private Props associated with ScenelessProject (or other such wrapper) */
    props?: Metadata
    /** Arbitrary metadata to associate with this project */
    meta?: Metadata
    /** Pixel dimenions of the canvas (default: `{ x: 1280, y: 720 }`) */
    size?: { x: number; y: number }
  } = {},
) => {
  const { props = {}, size, meta = {} } = payload
  const collectionId = state.collectionId
  const vapiProject = await CoreContext.Request.createProject({
    collectionId,
    props,
    meta,
    size,
  })
  const project = await hydrateProject(vapiProject.project)
  const baseProject = toBaseProject(project)

  // Update state
  state.projects = [...state.projects, project]
  /** @event ProjectAdded */
  trigger('ProjectAdded', {
    project: baseProject,
  })
  return baseProject
}

/**
 * Update a project's metadata with custom data opaque to the SDK.
 * 
 * ----
 * **Emits {@link ProjectMetaUpdated}**
 *
 * @category Project
 */
export const updateProjectMeta = async (payload: {
  projectId: Project['id']
  /** Arbitrary metadata to associate with this project */
  meta?: Metadata
}) => {
  const { projectId, meta = {} } = payload
  const project = state.projects.find((x) => x.id === payload.projectId)
  if (!project) {
    return
  }

  const metadata = {
    ...project.props,
    ...meta,
  }
  await CoreContext.clients.LiveApi().project.updateProject({
    collectionId: project.videoApi.project.collectionId,
    projectId,
    updateMask: ['metadata'],
    metadata,
  })

  // Update state
  project.props = metadata
  trigger('ProjectMetaUpdated', {
    projectId,
    meta: project.props,
  })
  return metadata
}

/**
 * Set the active project for the user. This project will be used as the
 *  default project for commands that do not specify `payload.projectId`
 * 
 * ----
 * **Emits {@link ActiveProjectChanged}**
 *
 * @category Project
 */
export const setActiveProject = async (payload: {
  projectId: Project['id']
}) => {
  const project = state.projects.find((x) => x.id === payload.projectId)
  if (!project) {
    state.activeProjectId = null
    trigger('ActiveProjectChanged', null)
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

  // get current project state
  let response = await CoreContext.clients.LiveApi().project.getProject({
    collectionId: project.videoApi.project.collectionId,
    projectId: project.videoApi.project.projectId,
    status: true,
  })
  project.videoApi.phase = response.status.phase

  // Update state
  state.activeProjectId = project.id
  trigger('ActiveProjectChanged', {
    projectId: project.id,
  })
  return toBaseProject(project)
}

/**
 * Initiate WebRTC connection to the room associated with this project.
 * 
 * ----
 * **Emits {@link RoomJoined}**
 *
 * @category Project
 */
export const joinRoom = async (payload: {
  projectId: Project['id']
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
  const tokenData = decode(token) as any
  const roomName = tokenData.video.room
  const url = new URL(CoreContext.clients.getLiveKitServer())
  const baseUrl = url.host + url.pathname
  const roomContext = webrtcManager.ensureRoom(baseUrl, roomName, token)
  roomContext.bindApiClient(CoreContext.clients)
  await roomContext.connect({
    logLevel: CoreContext.logLevel as any
  })

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
 * **Emits {@link NodeAdded}, {@link NodeChanged}**
 *
 * @internal _Use with caution_
 * @category Node
 */
export const createNode = async (payload: {
  projectId?: string
  props: { [prop: string]: any }
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
  props = { ...props, layoutId: project.layoutApi.layoutId, type: 'child' }

  // Update state
  const nodeId = await project.compositor.insert(props, parentId, index)
  trigger('NodeAdded', { projectId, nodeId })
  trigger('NodeChanged', { projectId, nodeId: parentId })
  return project.compositor.get(nodeId)
}

/**
 * Remove a node from the project's scene tree.
 * 
 * ----
 * _Note: This is a low level interface. Abstractions like {@link ScenelessProject} 
 * prevent the need for node manipulations._
 * 
 * **Emits {@link NodeRemoved}, {@link NodeChanged}**
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
  trigger('NodeRemoved', { projectId, nodeId })
  trigger('NodeChanged', { projectId, nodeId: parentId })
}

/**
 * Update the properties of a node.
 * `payload.props` will be shallowly merged onto its existing `props`.
 * 
 * ----
 * _Note: This is a low level interface. Abstractions like {@link ScenelessProject} 
 * prevent the need for node manipulations._
 * 
 * **Emits {@link NodeChanged}**
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
  trigger('NodeChanged', { projectId, nodeId })
  return project.compositor.get(nodeId)
}

/**
 * Update the layout of a node.
 *
 * ----
 * _Note: This is a low level interface. Abstractions like {@link ScenelessProject} 
 * prevent the need for node manipulations._
 * 
 * **Emits {@link NodeChanged}**
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
  trigger('NodeChanged', { projectId, nodeId })
}

/**
 * Move a node to a different parent node.
 * 
 * ----
 * _Note: This is a low level interface. Abstractions like {@link ScenelessProject} 
 * prevent the need for node manipulations._
 * 
 * **Emits {@link NodeChanged}**
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
  trigger('NodeChanged', { projectId, nodeId })
}

/**
 * Swap the positions of two nodes, changing parents if necessary.
 * 
 * ----
 * _Note: This is a low level interface. Abstractions like {@link ScenelessProject} 
 * prevent the need for node manipulations._
 * 
 * **Emits {@link NodeChanged}**
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
  trigger('NodeChanged', { projectId, nodeId: parentAId })
  trigger('NodeChanged', { projectId, nodeId: parentBId })
}

/**
 * Change the order of a node's children.
 * 
 * ----
 * _Note: This is a low level interface. Abstractions like {@link ScenelessProject} 
 * prevent the need for node manipulations._
 * 
 * **Emits {@link NodeChanged}**
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
  trigger('NodeChanged', { projectId, nodeId: parentId })
}

/**
 * Start broadcasting a project.
 * 
 * ----
 * _Note: Destination, encoding, and rendering details will be read from the Project
 * at time of broadcast, so they should be updated ahead of time._
 *
 * **Emits {@link BroadcastStarted}**
 *
 * @category Broadcast
 */
export const startBroadcast = async (payload: { projectId?: string }) => {
  const { projectId = state.activeProjectId } = payload
  const project = getProject(projectId)
  await CoreContext.clients.LiveApi().project.startProjectBroadcast({
    collectionId: project.videoApi.project.collectionId,
    projectId: project.videoApi.project.projectId,
  })
  // Event is handled on receiving end of VideoAPI
}

/**
 * Stop broadcasting a project.
 * 
 * ----
 * **Emits {@link BroadcastStopped}**
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
 * ----
 * **Emits {@link DestinationAdded}**
 *
 * @category Destination
 */
export const addDestination = async (payload: {
  projectId?: string
  rtmpUrl: string
  rtmpKey: string
  enabled: boolean
  metadata?: object
}) => {
  const {
    rtmpUrl,
    rtmpKey,
    enabled,
    projectId = state.activeProjectId,
    metadata,
  } = payload
  const project = getProject(projectId)
  const address = {
    rtmpPush: {
      key: rtmpKey,
      url: rtmpUrl,
    },
  } as SDK.Destination['address']

  const result = await CoreContext.clients
    .LiveApi()
    .destination?.createDestination({
      collectionId: project.videoApi.project.collectionId,
      projectId: project.videoApi.project.projectId,
      address,
      enabled,
      metadata,
    })

  // Update state
  project.videoApi.project.destinations.push(result.destination)

  const destination = toBaseDestination(result.destination)
  trigger('DestinationAdded', {
    projectId,
    destination,
  })
  return destination
}

/**
 * Remove a {@link Destination} from the project.
 * 
 * ----
 * **Emits {@link DestinationRemoved}**
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

  // Update state
  project.videoApi.project.destinations =
    project.videoApi.project.destinations.filter(
      (x) => x.destinationId !== destinationId,
    )

  trigger('DestinationRemoved', {
    projectId,
    destinationId,
  })
}

/**
 * Update an existing {@link Destination} on the project.
 * 
 * ----
 * **Emits {@link DestinationUpdated}**
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

  await CoreContext.clients.LiveApi().destination?.updateDestination({
    collectionId: project.videoApi.project.collectionId,
    projectId: project.videoApi.project.projectId,
    destinationId,
    updateMask: ['address.rtmpPush'],
    address: {
      rtmpPush,
    },
  })

  // Update state
  const destination = project.videoApi.project.destinations.find(
    (x) => destinationId === x.destinationId,
  )
  destination.address.rtmpPush = rtmpPush

  trigger('DestinationUpdated', {
    projectId,
    destinationId,
    rtmpKey,
    rtmpUrl,
  })
}

/**
 * Enable or disable an existing {@link Destination} on the project.
 * 
 * ----
 * **Emits {@link DestinationUpdated}**
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

  await CoreContext.clients.LiveApi().destination?.updateDestination({
    collectionId: project.videoApi.project.collectionId,
    projectId: project.videoApi.project.projectId,
    destinationId,
    updateMask: ['enabled'],
    enabled,
  })

  // Update state
  destination.enabled = enabled

  const event = enabled ? 'DestinationEnabled' : 'DestinationDisabled'
  trigger(event, {
    projectId,
    destinationId,
  })
}

/**
 * Overwrite project's first {@link Destination} with new configuration
 *  If no destination exists, one will be created instead.
 *
 * This is a helper to manage a single-destination project. For greater control,
 *  use {@link addDestination}, {@link removeDestination}, or {@link updateDestination}
 * 
 * ----
 * **Emits {@link DestinationSet}**
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
    await CoreContext.clients.LiveApi().destination?.updateDestination({
      collectionId: project.videoApi.project.collectionId,
      projectId: project.videoApi.project.projectId,
      destinationId: project.videoApi.project.destinations[0].destinationId,
      updateMask: ['address.rtmpPush'],
      address: { rtmpPush },
    })

    // Update state
    const destination = project.videoApi.project.destinations[0]
    destination.address.rtmpPush = rtmpPush
  } else {
    // Create new
    const result = await CoreContext.clients
      .LiveApi()
      .destination?.createDestination({
        collectionId: project.videoApi.project.collectionId,
        projectId: project.videoApi.project.projectId,
        address: { rtmpPush },
        enabled,
      })

    // Update state
    project.videoApi.project.destinations.push(result.destination)
  }

  trigger('DestinationSet', {
    projectId,
    rtmpUrl,
    rtmpKey,
  })
}
