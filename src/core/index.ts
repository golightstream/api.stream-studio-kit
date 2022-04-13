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

// Register default scene components
import {
  getAccessTokenData,
  getProject,
  getProjectByLayoutId,
  hydrateProject,
  layerToNode,
  toBaseProject,
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

const { trigger } = CoreContext

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

  client
    .LiveApi()
    .on(LiveApiModel.EventType.EVENT_TYPE_COLLECTION, (collection, type) => {
      log.info('Received: Collection event', type, collection)
    })

  client
    .LiveApi()
    .on(LiveApiModel.EventType.EVENT_TYPE_DESTINATION, (destination, type) => {
      log.info('Received: Destination event', type, destination)
    })

  client
    .LiveApi()
    .on(LiveApiModel.EventType.EVENT_TYPE_SOURCE, (source, type) => {
      log.info('Received: Source event', type, source)
    })

  client
    .LiveApi()
    .on(LiveApiModel.EventType.EVENT_TYPE_PROJECT, (projectEvent, type) => {
      log.info('Received: Project event', type, projectEvent)
      switch (type) {
        case LiveApiModel.EventSubType.EVENT_SUB_TYPE_UPDATE: {
          const { projectId, updateMask, project } = projectEvent.update

          if (updateMask.includes('metadata')) {
            trigger('ProjectMetaUpdated', {
              projectId,
              meta: project.metadata,
            })
          }

          // Update state
          const localProject = getProject(projectEvent.update?.projectId)
          if (!localProject) return
          localProject.videoApi.project = project
          localProject.props = project.metadata
        }
        case LiveApiModel.EventSubType.EVENT_SUB_TYPE_STATE: {
          const project = getProject(projectEvent.state?.projectId)
          if (!project) return

          if (projectEvent.state.error) {
            trigger('BroadcastError', {
              projectId: project.id,
              error: projectEvent.state.error,
            })
            return
          }
          if (projectEvent.state.phase) {
            const phase = projectEvent.state.phase
            if (phase === BroadcastPhase.PROJECT_BROADCAST_PHASE_RUNNING) {
              trigger('BroadcastStarted', { projectId: project.id })
            } else if (
              phase === BroadcastPhase.PROJECT_BROADCAST_PHASE_STOPPED
            ) {
              trigger('BroadcastStopped', { projectId: project.id })
            }

            // Update state
            project.videoApi.phase = projectEvent.state.phase
          }
          break
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
      const url = project.videoApi.project.composition.studioSdk.rendererUrl
      let response = await client
        .LiveApi()
        .authentication.createGuestAccessToken({
          projectId,
          token: {
            direct: {
              displayName: 'Preview',
            },
          },
          url,
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

let loadResult: SDK.User
const load = async (accessToken: string): Promise<SDK.User> => {
  if (loadResult) return loadResult
  if (!accessToken) {
    log.warn('Access token required for load()')
    return
  }
  log.info('Loading user...')

  const client = CoreContext.clients

  // Init api clients (vapi and lapi) with this jwt
  await client.load(accessToken)

  // Load the projects and user data
  const { collectionId, projects, userProps } =
    await CoreContext.Request.loadProjects()

  const { displayName } = getAccessTokenData()

  setAppState({
    user: {
      name: displayName,
      props: {},
    },
    projects,
    collectionId,
    activeProjectId: null,
  })

  const projectMap = projects.map(toBaseProject)

  loadResult = {
    id: collectionId,
    projects: projectMap,
    // Append user props in case it is being used for storage
    props: userProps,
  }
  CoreContext.state.user.props = userProps

  trigger('UserLoaded', loadResult)
  return loadResult
}
