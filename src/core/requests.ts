/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { CoreContext } from './context'
import { Context } from './namespaces'
import { hydrateProject } from './data'
import { Helpers } from '.'
import { Metadata } from './types'
import { LiveApiModel } from '@api.stream/sdk'

export const updateProject = async (request: {
  collectionId: string
  projectId: string
  props?: Metadata
}) => {
  const { projectId, collectionId, props = {} } = request
  const { project } = await CoreContext.clients.LiveApi().project.getProject({
    collectionId,
    projectId,
  })
  const metadata = project.metadata
  const existingProps = metadata.props || {}
  const newProps = { ...existingProps, ...props }
  CoreContext.clients.LiveApi().project.updateProject({
    collectionId: project.collectionId,
    projectId: project.projectId,
    updateMask: ['metadata'],
    metadata: { layoutId: metadata.layoutId, props: newProps },
  })
}

export const createProject = async (request: {
  collectionId: string
  props?: { [prop: string]: any }
  meta?: Metadata // Arbitrary metadata (e.g. 'name')
  size?: { x: number; y: number }
  type?: 'sceneless' | 'freeform'
}) => {
  const type = request.type || 'sceneless'
  const size = request.size || {
    x: 1280,
    y: 720,
  }
  const props = request.props || {}

  // Create a project to go with the collection
  let createProjectResponse = await CoreContext.clients
    .LiveApi()
    .project.createProject({
      collectionId: request.collectionId,
      rendering: {
        video: {
          width: size.x,
          height: size.y,
          framerate: 30,
        },
      },
      composition: {
        studioSdk: {},
      },
      metadata: {},
      webrtc: {
        hosted: {},
      },
    })

  const layout = await CoreContext.clients.LayoutApi().layout.createLayout({
    layout: {
      projectId: createProjectResponse.project.projectId,
      collectionId: createProjectResponse.project.collectionId,
    },
  })

  const { displayName } = CoreContext.clients.getAccessToken()

  // Save the layoutId on the project (no need to await)
  const metadata = {
    type,
    layoutId: layout.id,
    hostDisplayName: displayName,
    ...(request.meta || {}),
  }
  let projectResponse = await CoreContext.clients
    .LiveApi()
    .project.updateProject({
      collectionId: request.collectionId,
      projectId: createProjectResponse.project.projectId,
      updateMask: ['metadata'],
      metadata,
    })
  createProjectResponse.project = projectResponse.project
  createProjectResponse.project.metadata = metadata

  if (type === 'sceneless') {
    await Helpers.ScenelessProject.createCompositor(layout.id, size, props)
  } else {
    await CoreContext.compositor.createProject(
      {
        props: {
          name: 'Root',
          layout: 'Free',
          ...props,
          isRoot: true,
          size,
        },
      },
      layout.id,
    )
  }

  return createProjectResponse
}

export const loadProjects = async () => {
  const collections = await loadCollections()

  let collection: LiveApiModel.Collection

  const { displayName, serviceUserId } = CoreContext.clients.getAccessToken()

  // Get a single collection, corresponding to a user
  if (collections.length === 0) {
    // If the user has no collections, create one
    const response = await CoreContext.clients
      .LiveApi()
      .collection.createCollection({
        metadata: {
          serviceUserId,
          displayName,
        },
      })
    collection = response.collection
  } else {
    // only 1 collection per user for studiosdk
    collection = collections[0]
  }

  await CoreContext.clients
    .LiveApi()
    .subscribeToCollection(collection.collectionId)

  // Take the Vapi Project and hydrate it with Compositor and Lapi project details
  const projects = await Promise.all(
    collection.projects.map((project) => hydrateProject(project)),
  )

  return {
    collectionId: collection.collectionId,
    userProps: collection.metadata || {},
    projects,
  }
}

export const loadCollections = async () => {
  let result = await CoreContext.clients.LiveApi().collection.getCollections({})
  return result.collections
}
