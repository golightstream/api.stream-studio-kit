/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
/**
 * Requests provide single-concern abstractions
 *  over the various backend APIs (Layout/Live).
 *
 * Not every external request is represented here. In some cases
 *  it is simpler to use the API SDK client interface directly.
 */
import {
  CoreContext,
  InternalProject,
  InternalSource,
  InternalUser,
  log
} from './context'
import { getAccessTokenData, getProject, getUser, hydrateProject } from './data'
import { Helpers } from '.'
import { Props, Role } from './types'
import { LiveApiModel } from '@api.stream/sdk'

export const createProject = async (request: {
  settings?: { [prop: string]: any }
  props?: Props // Arbitrary metadata (e.g. 'name')
  size?: { x: number; y: number }
  type?: 'sceneless' | 'freeform'
}) => {
  const collectionId = getUser().id
  const type = request.type || 'sceneless'
  const size = request.size || {
    x: 1280,
    y: 720,
  }
  const settings = request.settings || {}

  // Create a project to go with the collection
  let createProjectResponse = await CoreContext.clients
    .LiveApi()
    .project.createProject({
      collectionId,
      rendering: {
        video: {
          width: size.x,
          height: size.y,
          framerate: 30,
        },
      },
      composition: {
        studioSdk: { version: CoreContext.rendererVersion },
      },
      metadata: {},
      webrtc: {
        hosted: {},
      },
    })

  const layout = await createLayout({
    projectId: createProjectResponse.project.projectId,
    collectionId: createProjectResponse.project.collectionId,
    settings,
    size,
    type,
  })

  const { displayName } = getAccessTokenData()

  // Save the layoutId on the project (no need to await)
  const metadata = {
    type,
    layoutId: layout.id,
    hostDisplayName: displayName,
    props: request.props || {},
  }
  let projectResponse = await CoreContext.clients
    .LiveApi()
    .project.updateProject({
      collectionId,
      projectId: createProjectResponse.project.projectId,
      updateMask: ['metadata'],
      metadata,
    })
  createProjectResponse.project = projectResponse.project
  createProjectResponse.project.metadata = metadata

  return createProjectResponse
}

export const deleteProject = async (request: { projectId: string }) => {
  const { projectId } = request
  const project = getProject(projectId)
  const collectionId = getUser().id

  await Promise.all([
    CoreContext.clients.LiveApi().project.deleteProject({
      collectionId,
      projectId,
    }),
    CoreContext.clients.LayoutApi().layout.deleteLayout({
      layoutId: project.layoutApi.layoutId,
    }),
  ])
}

/**
 * Load the user data from whatever access token has been registered
 *  with the API.
 */
export const loadUser = async (size?: {
  x: number
  y: number
}): Promise<{
  user: InternalUser
  projects: InternalProject[]
  sources: InternalSource[]
}> => {
  const collections = await loadCollections()

  let collection: LiveApiModel.Collection

  const { displayName, serviceUserId } = getAccessTokenData()

  // Get a single collection, corresponding to a user
  if (collections.length === 0) {
    // If the user has no collections, create one
    const response = await CoreContext.clients
      .LiveApi()
      .collection.createCollection({
        metadata: {
          serviceUserId,
          displayName,
          props: {},
        },
      })
    collection = response.collection
  } else {
    // only 1 collection per user for studio-kit
    collection = collections[0]
  }

  await CoreContext.clients
    .LiveApi()
    .subscribeToCollection(collection.collectionId)

  // Take the Vapi Project and hydrate it with Compositor and Lapi project details
  const projects = await Promise.all(
    collection.projects.filter((p) => Boolean(p.metadata?.layoutId)).map((project) =>
      hydrateProject(project, 'ROLE_HOST' as Role, size),
    ),
  )

  return {
    user: {
      id: collection.collectionId,
      metadata: collection.metadata,
      props: collection.metadata?.props || {},
      name: displayName,
    },
    projects,
    sources: collection.sources,
  }
}

export const loadCollections = async () => {
  let result = await CoreContext.clients.LiveApi().collection.getCollections({})
  return result.collections
}

export const createLayout = async (request: {
  projectId: string
  collectionId: string
  settings: { [prop: string]: any }
  size: { x: number; y: number }
  type?: string
}) => {
  const { settings, size, type, projectId, collectionId } = request

  const layout = await CoreContext.clients.LayoutApi().layout.createLayout({
    layout: {
      projectId,
      collectionId,
    },
  })

  if (type === 'sceneless') {
    await Helpers.ScenelessProject.createCompositor(layout.id, size, settings)
  } else {
    await CoreContext.compositor.createProject(
      {
        props: {
          name: 'Root',
          layout: 'Free',
          ...settings,
          isRoot: true,
          size,
        },
      },
      layout.id,
    )
  }

  return layout
}
