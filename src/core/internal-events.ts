/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { getProject, hydrateProject, toBaseProject } from './data'
import { subscribeInternal, trigger } from './events'
import { SDK } from './namespaces'
import { CoreContext } from './context'

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
      // TODO: Update state.user
    }
    /**
     * Project
     */
    case 'ActiveProjectChanged': {
      state.activeProjectId = payload.projectId
      trigger('ActiveProjectChanged', {
        projectId: payload.projectId,
      })
      return
    }
    case 'ProjectAdded': {
      const internalProject = await hydrateProject(payload.project)
      const baseProject = toBaseProject(internalProject)
      state.projects = [...state.projects, internalProject]
      trigger('ProjectAdded', { project: baseProject })
      return
    }
    case 'ProjectRemoved': {
      return
    }
    case 'ProjectChanged': {
      // Update state
      const { project } = payload.project
      const internalProject = getProject(project.projectId)
      if (!internalProject) return

      internalProject.videoApi.project = project
      internalProject.props = project.metadata

      // Re-emit the event for public consumption
      // TODO: Trigger public ProjectChanged (data.toBaseProject)
      trigger('ProjectChanged', {
        project: toBaseProject(internalProject),
      })
      return
    }
    /**
     * Destination
      // TODO: Update state.projects[].videoApi.destinations with the full dest
      // TODO: Remove state updates from Destination commands
     */
    case 'DestinationAdded': {
      return
    }
    case 'DestinationRemoved': {
      return
    }
    case 'DestinationUpdated': {
      return
    }
    /**
     * Source
      // TODO: Add to user.sources
      // TODO: Add sources to User model returned to the user
      // TODO: Update state.projects[].videoApi.sources with the full soruce?
     */
    case 'SourceAdded': {
      return
    }
    case 'SourceRemoved': {
      return
    }
    case 'SourceUpdated': {
      return
    }
    /**
     * Node
     * TODO: Make sure this doesn't conflict with commands
     */
    case 'NodeAdded': {
      return
    }
    case 'NodeRemoved': {
      return
    }
    case 'NodeUpdated': {
      return
    }
  }
})

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
  // Invoked when a single exisitng model has changed
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
