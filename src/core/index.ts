/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { CoreContext, setAppState, log } from './context'
import { omit, toDataNode, toSceneTree } from '../logic'
import { ApiStream, LiveApiModel, LayoutApiModel } from '@api.stream/sdk'
import { compositorAdapter } from './compositor-adapter'
import config from '../../config'
import * as Transforms from './transforms/index'
import * as Layouts from './layouts/index'
import * as Sources from './sources/index'
import './internal-events'

// Register default scene components
import {
  getAccessTokenData,
  getBaseUser,
  getProject,
  getProjectByLayoutId,
  hydrateProject,
  layerToNode,
} from './data'
import { render } from '../helpers/compositor'

export * from './namespaces'
import { Compositor, SDK } from './namespaces'
import { GuestOptions, LogLevel } from './types'
import { LayoutDeclaration } from '../compositor/html/html-layouts'

const BroadcastPhase = LiveApiModel.ProjectBroadcastPhase

const { registerTransform, setDefaultTransforms } = Compositor.Transform
const { registerLayout } = Compositor.Layout
const { registerSource } = Compositor.Source

const { trigger, triggerInternal } = CoreContext

const EventType = LiveApiModel.EventType
const EventSubType = LiveApiModel.EventSubType

/**
 * Basic application settings.
 */
export type Settings = {
  env?: 'dev' | 'stage' | 'prod'
  logLevel?: LogLevel
  guestToken?: string
}

/**
 * @experimental Experimental settings that should be used with caution.
 *
 * ----
 * _Note: Custom layouts and transforms should not be registered
 *  unless the same layouts and transforms are accessible by the
 *  server rendering the output stream._
 */
export type AdvancedSettings = {
  sources?: Compositor.Source.SourceDeclaration[]
  layouts?: Compositor.Layout.LayoutDeclaration[]
  transforms?: Compositor.Transform.TransformDeclaration[]
  defaultTransforms?: Compositor.Transform.DefaultTransformMap
}

let initResult: SDK.Studio
/**
 * Create a singleton {@link Studio} instance to serve as the root for
 * all SDK functionality.
 */
export const init = async (
  settings: Settings & AdvancedSettings = {},
): Promise<SDK.Studio> => {
  if (initResult) return initResult

  // Default env to prod
  const env = settings.env || 'prod'
  const logLevel: LogLevel = settings.logLevel || 'Warn'

  // Update log levels
  const livekitLogger = log.getLogger('livekit')
  livekitLogger.setLevel(logLevel as any)
  log.setLevel(logLevel as any)
  log.info('Initializing Studio SDK...')

  const {
    layouts = [],
    transforms = [],
    sources = [],
    defaultTransforms = {},
    guestToken,
  } = settings
  const client = new ApiStream({
    sdkVersion: CoreContext.version,
    env: env,
    logLevel,
  })

  CoreContext.config = config(env)
  CoreContext.clients = client
  CoreContext.compositor = Compositor.start({ dbAdapter: compositorAdapter })
  CoreContext.logLevel = logLevel
  CoreContext.Request = await import('./requests')
  CoreContext.Command = await import('./commands')

  // Tie context to global scope for debugging purposes
  window.__StudioKit = {
    ...CoreContext,
  }

  setDefaultTransforms({
    ...defaultTransforms,
    ...CoreContext.config.defaults.transforms,
  })
  registerSource([...Object.values(Sources), ...sources])
  registerTransform([...Object.values(Transforms), ...transforms])
  registerLayout([
    ...(Object.values(Layouts) as LayoutDeclaration[]),
    ...layouts,
  ])

  const guestProject = await client.load(guestToken)
  let initialProject: SDK.Project
  if (guestProject) {
    await client
      .LiveApi()
      .project.getProject({ ...guestProject })
      .then((resp) => hydrateProject(resp.project))
      .then(async (project) => {
        project.isInitial = true
        CoreContext.state.projects = [project]
        initialProject = await CoreContext.Command.setActiveProject({
          projectId: project.id,
        })
      })
  }

  client.LiveApi().on(EventType.EVENT_TYPE_COLLECTION, (event, type) => {
    log.info('Received: Collection event', type, event)
    switch (type) {
      case EventSubType.EVENT_SUB_TYPE_UPDATE: {
        triggerInternal('UserChanged', event.update.collection)
        return
      }
    }
  })

  client.LiveApi().on(EventType.EVENT_TYPE_DESTINATION, (event, type) => {
    log.info('Received: Destination event', type, event)
    switch (type) {
      case EventSubType.EVENT_SUB_TYPE_CREATE: {
        const { destination } = event.create
        triggerInternal('DestinationAdded', {
          projectId: destination.projectId,
          destination,
        })
        return
      }
      case EventSubType.EVENT_SUB_TYPE_UPDATE: {
        return
      }
      case EventSubType.EVENT_SUB_TYPE_ADD: {
        return
      }
    }
  })

  client.LiveApi().on(EventType.EVENT_TYPE_SOURCE, (source, type) => {
    log.info('Received: Source event', type, source)
    switch (type) {
      case EventSubType.EVENT_SUB_TYPE_CREATE: {
        return
      }
      case EventSubType.EVENT_SUB_TYPE_UPDATE: {
        triggerInternal('SourceChanged', { source: source.update.source })
        return
      }
      case EventSubType.EVENT_SUB_TYPE_ADD: {
        return
      }
    }
  })

  client.LiveApi().on(EventType.EVENT_TYPE_PROJECT, (event, type) => {
    log.info('Received: Project event', type, event)
    switch (type) {
      case EventSubType.EVENT_SUB_TYPE_CREATE: {
        // Update state
        triggerInternal('ProjectAdded', event.create.project)
        return
      }
      case EventSubType.EVENT_SUB_TYPE_UPDATE: {
        const { projectId, updateMask, project } = event.update
        const existingProject = getProject(project.projectId)

        if (updateMask.includes('metadata')) {
          // Note: Deprecated
          trigger('ProjectMetaUpdated', {
            projectId,
            meta: project.metadata,
          })
        }

        triggerInternal('ProjectChanged', {
          project,
          phase: existingProject.videoApi.phase,
        })
        return
      }
      case EventSubType.EVENT_SUB_TYPE_STATE: {
        const project = getProject(event.state?.projectId)
        if (!project) return

        triggerInternal('ProjectChanged', {
          project: project.videoApi.project,
          phase: event.state.phase,
        })

        // Emit custom events for broadcast start/stop/error
        if (event.state.error) {
          trigger('BroadcastError', {
            projectId: project.id,
            error: event.state.error,
          })
        }
        if (event.state.phase) {
          const phase = event.state.phase
          // TODO: Keep these
          if (phase === BroadcastPhase.PROJECT_BROADCAST_PHASE_RUNNING) {
            trigger('BroadcastStarted', { projectId: project.id })
          } else if (phase === BroadcastPhase.PROJECT_BROADCAST_PHASE_STOPPED) {
            trigger('BroadcastStopped', { projectId: project.id })
          }
        }
        return
      }
    }
  })

  // Listen for remote changes to Layout / nodes
  client
    .LayoutApi()
    .on(LayoutApiModel.EventType.EVENT_TYPE_LAYER, (layer, type) => {
      if (type == LayoutApiModel.EventSubType.EVENT_SUB_TYPE_CREATE) {
        log.debug('Received: Node Insert', layer.create)
        const { connectionId, layoutId } = layer.create.requestMetadata
        if (CoreContext.connectionId === connectionId) return

        const node = layerToNode(layer.create)
        const project = getProjectByLayoutId(layoutId)
        const nodes = [node, ...project.compositor.nodes.map(toDataNode)]
        const tree = toSceneTree(nodes, node.id)
        project.compositor.local.insert(tree)
        trigger('NodeAdded', { projectId: project.id, nodeId: node.id })
      } else if (type == LayoutApiModel.EventSubType.EVENT_SUB_TYPE_UPDATE) {
        log.debug('Received: Node Update', layer.update)
        const { connectionId, layoutId } = layer.update.requestMetadata
        if (CoreContext.connectionId === connectionId) return

        const node = layerToNode(layer.update)
        const project = getProjectByLayoutId(layoutId)
        project.compositor.local.update(
          layer.update.id,
          node.props,
          node.childIds,
        )
        trigger('NodeChanged', { projectId: project.id, nodeId: node.id })
      } else if (type == LayoutApiModel.EventSubType.EVENT_SUB_TYPE_DELETE) {
        log.debug('Received: Node Delete', layer.delete)
        const { connectionId, layoutId } = layer.delete.requestMetadata
        if (CoreContext.connectionId === connectionId) return

        const project = getProjectByLayoutId(layoutId)
        project.compositor.local.remove(layer.delete.id)
        trigger('NodeRemoved', {
          projectId: project.id,
          nodeId: layer.delete.id,
        })
      } else if (type == LayoutApiModel.EventSubType.EVENT_SUB_TYPE_BATCH) {
        log.debug('Received: Node Batch Update', layer.batch)
        const { connectionId, layoutId } = layer.batch.requestMetadata
        if (CoreContext.connectionId === connectionId) return

        const project = getProjectByLayoutId(layoutId)
        layer.batch.layers.forEach((batch) => {
          const [type, args] = Object.entries(batch)[0]
          if (type === 'create') {
            const node = layerToNode(args)
            project.compositor.local.insert(node)
            trigger('NodeAdded', { projectId: project.id, nodeId: node.id })
          } else if (type === 'update') {
            const node = layerToNode(args)
            project.compositor.local.update(node.id, node.props, node.childIds)
            trigger('NodeChanged', { projectId: project.id, nodeId: node.id })
          } else if (type === 'delete') {
            project.compositor.local.remove(args)
            trigger('NodeRemoved', { projectId: project.id, nodeId: args.id })
          }
        })

        // Trigger a single change on the root node
        if (project)
          trigger('NodeChanged', {
            projectId: project.id,
            nodeId: project.compositor.getRoot().id,
          })
      }
    })

  const createGuestToken = (options: GuestOptions = {}, url?: string) => {
    const {
      displayName,
      role,
      maxDuration = CoreContext.config.defaults.guestTokenDuration,
      projectId = CoreContext.state.activeProjectId,
    } = options
    const project = getProject(projectId)

    const token = displayName
      ? {
          direct: {
            displayName,
          },
        }
      : {
          exchange: {
            maxDuration,
          },
        }

    return client.LiveApi().authentication.createGuestAccessToken({
      projectId,
      token,
      url,
      collectionId: project.videoApi.project.collectionId,
      maxDuration,
      role: role || LiveApiModel.Role.ROLE_GUEST,
    })
  }

  return {
    ...omit(CoreContext, [
      'clients',
      'config',
      'connectionId',
      'Request',
      'state',
      'trigger',
    ]),
    createDemoToken: async () => {
      console.warn('createDemoToken() is currently unavailable.')
      return ''
    },
    createPreviewLink: async (request = {}) => {
      const { maxDuration, projectId = CoreContext.state.activeProjectId } =
        request
      const project = getProject(projectId)
      let response = await client
        .LiveApi()
        .authentication.createGuestAccessToken({
          projectId,
          token: {
            direct: {
              displayName: 'Preview',
            },
          },
          url: CoreContext.config.compositorUrl,
          collectionId: project.videoApi.project.collectionId,
          maxDuration:
            maxDuration || CoreContext.config.defaults.previewTokenDuration,
          role: LiveApiModel.Role.ROLE_VIEWER,
        })
      return response.url
    },
    createGuestLink: async (baseUrl, options = {}) => {
      const response = await createGuestToken(options, baseUrl)
      return response.url
    },
    createGuestToken: async (options = {}) => {
      const response = await createGuestToken(options)
      return response.accessToken
    },
    initialProject,
    load,
    render,
  }
}

/**
 * Register the access token and make API request to gather user data.
 */
const load = async (accessToken: string): Promise<SDK.User> => {
  let user = getBaseUser()
  if (user) {
    log.info('Attempted to load user again - returning existing user')
    return user
  }

  if (!accessToken) {
    log.warn('Access token required for load()')
    return
  }
  log.info('Loading user...')

  const client = CoreContext.clients

  // Init API clients with this jwt
  await client.load(accessToken)

  // Load the projects and user data
  const result = await CoreContext.Request.loadUser()

  setAppState({
    user: result.user,
    // TODO: store internal sources from Live API User
    sources: [],
    projects: result.projects,
    activeProjectId: null,
  })

  user = getBaseUser()
  trigger('UserLoaded', user)
  return user
}
