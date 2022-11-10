/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { CoreContext, setAppState, log } from './context'
import { asArray, omit, toDataNode, toSceneTree } from '../logic'
import { ApiStream, LiveApiModel, LayoutApiModel } from '@api.stream/sdk'
import { compositorAdapter, latestUpdateVersion } from './compositor-adapter'
import config from '../../config'
import * as Transforms from './transforms/index'
import * as Layouts from './layouts/index'
import * as Sources from './sources/index'
import * as Components from './components/index'
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

const BroadcastPhase = LiveApiModel.ProjectBroadcastPhase

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
  useComponents?: boolean
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
  dbAdapter?: Compositor.DBAdapter
  sources?: Compositor.Source.SourceDeclaration[]
  layouts?: Compositor.Layout.LayoutDeclaration[]
  transforms?: Compositor.Transform.TransformDeclaration[]
  components?: Compositor.Component.Component[]
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
    components = [],
    sources = [],
    defaultTransforms = {},
    useComponents = false,
    guestToken,
  } = settings
  const client = new ApiStream({
    sdkVersion: CoreContext.version,
    env: env,
    logLevel,
  })

  const conf = config(env)
  const guestProject = await client.load(guestToken)

  const compositor = Compositor.start({
    // Ensure components up to date unless joining a project as a guest
    updateOutdatedComponents: !guestProject && useComponents,
    dbAdapter: settings.dbAdapter || compositorAdapter,
    transformSettings: {
      defaultTransforms: {
        ...conf.defaults.transforms,
        ...defaultTransforms,
      },
    },
  })

  // Emit events to compositor
  CoreContext.subscribe((event, payload) => {
    compositor.triggerEvent(event, payload)
  })

  CoreContext.config = conf
  CoreContext.clients = client
  CoreContext.compositor = compositor
  CoreContext.logLevel = logLevel
  CoreContext.Request = await import('./requests')
  CoreContext.Command = await import('./commands')

  compositor.registerCommand('Core.StartBroadcast', () => {
    const project = getProject(CoreContext.state.activeProjectId)
    if (!project) return
    CoreContext.Command.startBroadcast({
      projectId: project.id,
    })
  })

  compositor.registerCommand('Core.StopBroadcast', () => {
    const project = getProject(CoreContext.state.activeProjectId)
    if (!project) return
    CoreContext.Command.stopBroadcast({
      projectId: project.id,
    })
  })

  // Tie context to global scope for debugging purposes
  window.__StudioKit = {
    ...CoreContext,
  }

  const getDeclarations = (modules: object) =>
    Object.values(modules).flatMap((x) => asArray(x.Declaration)) as any[]

  compositor.sources.registerSource([...getDeclarations(Sources), ...sources])
  compositor.transforms.registerTransform([
    ...getDeclarations(Transforms),
    ...transforms,
  ])
  compositor.layouts.registerLayout([...getDeclarations(Layouts), ...layouts])
  compositor.components.registerComponent([
    ...getDeclarations(Components),
    ...components,
  ])

  let initialProject: SDK.Project
  if (guestProject) {
    await client
      .LiveApi()
      .project.getProject({ ...guestProject })
      .then((resp) => hydrateProject(resp.project, guestProject.role))
      .then(async (project) => {
        setAppState({
          // As a contributor, `user` refers to the collection
          //  that the project belongs to. This will be referenced
          //  when making requests requiring `collectionId`.
          user: {
            id: guestProject.collectionId,
            props: {},
            name: null,
            metadata: {},
          },
          // TODO: Populate
          sources: [],
          projects: [project],
          activeProjectId: null,
        })

        project.isInitial = true
        initialProject = await CoreContext.Command.setActiveProject({
          projectId: project.id,
        })
      })
  }

  /**
   * Collection events from the Event API
   */
  client.LiveApi().on(EventType.EVENT_TYPE_COLLECTION, (event, type) => {
    log.info('Received: Collection event', type, event)
    switch (type) {
      case EventSubType.EVENT_SUB_TYPE_UPDATE: {
        triggerInternal('UserChanged', event.update.collection)
        return
      }
    }
  })

  /**
   * Destination events from the Event API
   */
  client.LiveApi().on(EventType.EVENT_TYPE_DESTINATION, (event, type) => {
    log.info('Received: Destination event', type, event)
    switch (type) {
      case EventSubType.EVENT_SUB_TYPE_CREATE: {
        const { destination } = event.create
        triggerInternal('DestinationAdded', destination)
        return
      }
      case EventSubType.EVENT_SUB_TYPE_UPDATE: {
        const { destination } = event.update
        triggerInternal('DestinationChanged', destination)
        return
      }
      case EventSubType.EVENT_SUB_TYPE_DELETE: {
        triggerInternal('DestinationRemoved', event.delete)
        return
      }
    }
  })

  /**
   * Source events from the Event API
   */
  client.LiveApi().on(EventType.EVENT_TYPE_SOURCE, (event, type) => {
    log.info('Received: Source event', type, event)
    switch (type) {
      case EventSubType.EVENT_SUB_TYPE_CREATE: {
        triggerInternal('SourceAdded', event.create.source)
        return
      }
      case EventSubType.EVENT_SUB_TYPE_UPDATE: {
        triggerInternal('SourceChanged', event.update.source)
        return
      }
      case EventSubType.EVENT_SUB_TYPE_DELETE: {
        triggerInternal('SourceRemoved', event.delete.sourceId)
        return
      }
      case EventSubType.EVENT_SUB_TYPE_ADD: {
        triggerInternal('ProjectSourceAdded', {
          projectId: event.add.projectId,
          source: event.add.source,
        })
        return
      }
      case EventSubType.EVENT_SUB_TYPE_REMOVE: {
        triggerInternal('ProjectSourceRemoved', {
          projectId: event.add.projectId,
          sourceId: event.add.sourceId,
        })
        return
      }
    }
  })

  /**
   * Project events from the Event API
   */
  client.LiveApi().on(EventType.EVENT_TYPE_PROJECT, (event, type) => {
    log.info('Received: Project event', type, event)
    switch (type) {
      case EventSubType.EVENT_SUB_TYPE_CREATE: {
        const project = event.create.project
        // Ignore the event if we already have the project in state
        if (getProject(project.projectId)) return
        triggerInternal('ProjectAdded', project)
        return
      }
      case EventSubType.EVENT_SUB_TYPE_UPDATE: {
        const { projectId, updateMask, project } = event.update
        const existingProject = getProject(project.projectId)
        if (!existingProject) return

        if (updateMask.includes('metadata')) {
          /**
           * @deprecated Use ProjectChanged
           */
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
      case EventSubType.EVENT_SUB_TYPE_DELETE: {
        triggerInternal('ProjectRemoved', { projectId: event.delete.projectId })
        return
      }
      case EventSubType.EVENT_SUB_TYPE_STATE: {
        // Get the project from memory since it is not included in event subtype `state`
        const project = getProject(event.state?.projectId)
        if (!project) return
        let broadcastId = event.state.broadcastId

        // Emit explicit external events for broadcast start/stop/error
        if (event.state.error) {
          trigger('BroadcastError', {
            projectId: project.id,
            broadcastId: event.state.broadcastId,
            error: event.state.error,
          })
        }
        if (event.state.phase) {
          const phase = event.state.phase
          if (phase === BroadcastPhase.PROJECT_BROADCAST_PHASE_RUNNING) {
            trigger('BroadcastStarted', {
              projectId: project.id,
              broadcastId: event.state.broadcastId,
            })
          } else if (phase === BroadcastPhase.PROJECT_BROADCAST_PHASE_STOPPED) {
            broadcastId = null
            trigger('BroadcastStopped', {
              projectId: project.id,
              broadcastId: event.state.broadcastId,
            })
          }
        }

        triggerInternal('ProjectChanged', {
          project: project.videoApi.project,
          phase: event.state.phase,
          broadcastId,
        })
        return
      }
    }
  })

  /**
   * Layout events from the Event API
   * Listen for remote changes to nodes within a project.
   **/
  client
    .LayoutApi()
    .on(LayoutApiModel.EventType.EVENT_TYPE_LAYER, (layer, type) => {
      if (type === LayoutApiModel.EventSubType.EVENT_SUB_TYPE_CREATE) {
        log.debug('Received: Node Insert', layer.create)
        const { connectionId, layoutId } = layer.create.requestMetadata
        if (CoreContext.connectionId === connectionId) return

        const node = layerToNode(layer.create)
        const project = getProjectByLayoutId(layoutId)
        const nodes = [node, ...project.compositor.nodes.map(toDataNode)]
        const tree = toSceneTree(nodes, node.id)
        project.compositor.local.insert(tree)
        triggerInternal('NodeAdded', { projectId: project.id, nodeId: node.id })
      } else if (type === LayoutApiModel.EventSubType.EVENT_SUB_TYPE_UPDATE) {
        log.debug('Received: Node Update', layer.update)
        const {
          connectionId,
          layoutId,
          updateVersions = {},
        } = layer.update.requestMetadata
        if (CoreContext.connectionId === connectionId) return

        const node = layerToNode(layer.update)

        // Check whether we have a more recent change and ignore if we do
        const latestUpdateId = latestUpdateVersion[node.id] || 0
        if (latestUpdateId > updateVersions[node.id]) {
          return log.info(
            'Ignoring node update - updateID is less than latest.',
          )
        }
        latestUpdateVersion[node.id] = updateVersions[node.id]

        const project = getProjectByLayoutId(layoutId)
        project.compositor.local.update(
          layer.update.id,
          node.props,
          node.childIds,
        )
        triggerInternal('NodeChanged', {
          projectId: project.id,
          nodeId: node.id,
        })
      } else if (type === LayoutApiModel.EventSubType.EVENT_SUB_TYPE_DELETE) {
        log.debug('Received: Node Delete', layer.delete)
        const { connectionId, layoutId } = layer.delete.requestMetadata
        if (CoreContext.connectionId === connectionId) return

        const project = getProjectByLayoutId(layoutId)
        project.compositor.local.remove(layer.delete.id)
        triggerInternal('NodeRemoved', {
          projectId: project.id,
          nodeId: layer.delete.id,
        })
      } else if (type === LayoutApiModel.EventSubType.EVENT_SUB_TYPE_BATCH) {
        log.debug('Received: Node Batch Update', layer.batch)
        const {
          connectionId,
          layoutId,
          updateVersions = {},
        } = layer.batch.requestMetadata
        if (CoreContext.connectionId === connectionId) return

        const project = getProjectByLayoutId(layoutId)
        layer.batch.layers.forEach((batch) => {
          try {
            const [type, args] = Object.entries(batch)[0]
            if (type === 'create') {
              const node = layerToNode(args)
              project.compositor.local.insert(node)
              triggerInternal('NodeAdded', {
                projectId: project.id,
                nodeId: node.id,
              })
            } else if (type === 'update') {
              const node = layerToNode(args)

              // Check whether we have a more recent change and ignore if we do
              const latestUpdateId = latestUpdateVersion[node.id] || 0
              if (latestUpdateId > updateVersions[node.id]) {
                return log.info(
                  'Ignoring node update - updateID is less than latest.',
                )
              }
              latestUpdateVersion[node.id] = updateVersions[node.id]

              project.compositor.local.update(
                node.id,
                node.props,
                node.childIds,
              )
              triggerInternal('NodeChanged', {
                projectId: project.id,
                nodeId: node.id,
              })
            } else if (type === 'delete') {
              project.compositor.local.remove(args.id)
              triggerInternal('NodeRemoved', {
                projectId: project.id,
                nodeId: args.id,
              })
            }
          } catch (e) {
            log.warn('Error handling batch item', e, { item: batch })
          }
        })

        // Trigger a single change on the root node
        if (project)
          triggerInternal('NodeChanged', {
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
      role: (role || LiveApiModel.Role.ROLE_GUEST) as LiveApiModel.Role,
    })
  }

  const studio = {
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
  } as Partial<SDK.Studio>

  if (!useComponents) {
    studio.render = render
  }

  return studio as SDK.Studio
}

/**
 * Register the access token and make API request to gather user data.
 */
const load = async (
  accessToken: string,
  size?: {
    x: number
    y: number
  },
): Promise<SDK.User> => {
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
  const result = await CoreContext.Request.loadUser(size)

  // TODO: Move to UserLoaded event handler
  setAppState({
    user: result.user,
    sources: result.sources,
    projects: result.projects,
    activeProjectId: null,
  })

  user = getBaseUser()
  trigger('UserLoaded', user)
  return user
}
