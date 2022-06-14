/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import {
  getBaseUser,
  getProject,
  hydrateProject,
  toBaseDestination,
  toBaseProject,
} from './data'
import { InternalEventMap, subscribeInternal, trigger } from './events'
import { SDK } from './namespaces'
import { CoreContext, log } from './context'

const { state } = CoreContext

/**
 * Internal state event handlers
 *
 * Re-emits external events containing state for externally-facing models.
 * These events may be used by developers using the Studio Kit, and
 * are used to control the flow of data through hooks such as `useProject()`.
 */

subscribeInternal(async (event, payload) => {
  switch (event) {
    /**
     * User
     */
    case 'UserChanged': {
      const { metadata } = payload as InternalEventMap['UserChanged']

      // Update state
      state.user.metadata = metadata || {}
      state.user.props = metadata?.props || {}

      // Emit public event
      trigger('UserChanged', {
        user: getBaseUser(),
      })
      return
    }
    /**
     * Project
     */
    case 'ActiveProjectChanged': {
      const { projectId } = payload as InternalEventMap['ActiveProjectChanged']

      // Update state
      state.activeProjectId = projectId

      // Emit public event
      trigger('ActiveProjectChanged', {
        projectId,
      })
      return
    }
    case 'ProjectAdded': {
      const project = payload as InternalEventMap['ProjectAdded']
      const internalProject = await hydrateProject(project)
      const baseProject = toBaseProject(internalProject)

      // Update state
      state.projects = [...state.projects, internalProject]

      // Emit public event
      trigger('ProjectAdded', { project: baseProject })
      trigger('ProjectListChanged', {
        projectIds: state.projects.map((x) => x.id),
      })
      return
    }
    case 'ProjectRemoved': {
      const projectId = payload as InternalEventMap['ProjectRemoved']

      // Update state
      state.projects = state.projects.filter((x) => x.id !== projectId)

      // Emit public event
      trigger('ProjectRemoved', { projectId: payload })
      trigger('ProjectListChanged', {
        projectIds: state.projects.map((x) => x.id),
      })
      return
    }
    case 'ProjectChanged': {
      const { project, phase } = payload as InternalEventMap['ProjectChanged']
      const internalProject = getProject(project.projectId)
      if (!internalProject) return

      // Update state
      internalProject.videoApi.phase = phase
      internalProject.videoApi.project = project
      internalProject.props = project.metadata

      // Emit public event
      trigger('ProjectChanged', {
        project: toBaseProject(internalProject),
      })
      return
    }
    /**
     * Destination
     */
    case 'DestinationAdded': {
      const { projectId } = payload as InternalEventMap['DestinationAdded']
      const internalProject = getProject(projectId)
      if (!internalProject) return

      // Update state
      internalProject.videoApi.project.destinations.push(payload)

      // Emit public event
      trigger('DestinationAdded', {
        projectId,
        destination: toBaseDestination(payload),
      })
      return
    }
    case 'DestinationRemoved': {
      const { projectId, destinationId } =
        payload as InternalEventMap['DestinationAdded']
      const internalProject = getProject(projectId)
      if (!internalProject) return

      // Update state
      internalProject.videoApi.project.destinations =
        internalProject.videoApi.project.destinations.filter(
          (x) => x.destinationId !== destinationId,
        )

      // Emit public event
      trigger('DestinationRemoved', { projectId, destinationId })
      trigger('DestinationListChanged', {
        projectId,
        destinationIds: internalProject.videoApi.project.destinations.map(
          (x) => x.destinationId,
        ),
      })

      // TODO: Remove state updates from Destination commands
      return
    }
    case 'DestinationChanged': {
      // Update state

      // Emit public event

      // TODO: Remove state updates from Destination commands
      return
    }
    /**
     * Source
      // TODO: Add to state.sources
      // TODO: Add sources to User model returned to the user
      // TODO: Update state.projects[].videoApi.sources with the full source?
     */
    case 'SourceAdded': {
      // Update state

      // Emit public event

      return
    }
    case 'SourceRemoved': {
      // Update state

      // Emit public event

      return
    }
    case 'SourceUpdated': {
      // Update state

      // Emit public event

      return
    }
    /**
     * Node
     * TODO: Make sure this doesn't conflict with commands
     */
    case 'NodeAdded': {
      // Update state

      // Emit public event

      return
    }
    case 'NodeRemoved': {
      // Update state

      // Emit public event

      return
    }
    case 'NodeUpdated': {
      // Update state

      // Emit public event

      return
    }
  }
})

subscribeInternal(() => log.debug({ nextState: { ...state } }))

type ModelName = 'User' | 'Project' | 'Source' | 'Destination' | 'Node'
type Models = {
  User: SDK.User
  Project: SDK.Project
  Source: SDK.Source
  Destination: SDK.Destination
  Node: SDK.SceneNode
}

/**
 * Model hooks/getters
 *
 * Used to keep information about application state as it changes.
 *
 * Event handler propagates to hooks that are listening
 *  for a match of model/id.
 */

const watchers = new Set<{ model: ModelName; id?: string; cb: Function }>()

export function useModel<M extends ModelName>(
  model: M,
  id: string,
  cb: (model: Models[M]) => void,
): SDK.Disposable {
  // Invoked when a single existing model has changed
  //  Calls back to cb with new model (friendly-formatted)
  const watcher = { model, cb, id }
  watchers.add(watcher)

  return () => {
    watchers.delete(watcher)
  }
}

export function useModels<M extends ModelName>(
  model: M,
  cb: (ids: string[]) => void,
): SDK.Disposable {
  // Invoked when a model is added or removed
  //  Calls back to cb with the new list of model IDs
  const watcher = { model, cb }
  watchers.add(watcher)

  return () => {
    watchers.delete(watcher)
  }
}

// TODO: getModel/getModels

/**
 * @private
 */
const emitChange = (details: { model: ModelName; id?: string }) => {
  // TODO: Iterate watchers - if id matches exactly, (or neither exist)
  //  then invoke watcher.cb()
}
