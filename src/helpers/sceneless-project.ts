/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
/**
 * Create and manage a project with a {@link ScenelessProject.Commands simple and opinionated interface}.
 *
 * A ScenelessProject is designed to fulfill all of the requirements of
 * a standard web-based broadcaster. It provides simple
 * management of WebRTC {@link Participant Participants},
 * custom layouts, backgrounds, and overlay content.
 *
 * Internally, any {@link Project} that meets a certain set of preconditions is
 * eligible to act as a ScenelessProject. The simplest way to ensure a project
 * can leverage these commands is by creating one with {@link create ScenelessProject.create()}.
 *
 * ```typescript
 * // Create a project for the user with default settings
 * const project = await ScenelessProject.create({
 *   backgroundImage: 'https://studio.golightstream.com/images/polygons.jpg',
 *   layout: 'Grid',
 * })
 *
 * // Pass the project in to receive a list of commands unique to a ScenelessProject
 * const projectCommands = ScenelessProject.commands(project)
 *
 * // Use the commands to update the project's contents (what participants/overlays will appear in the output stream)
 * projectCommands.addParticipant(participantId)
 * ```
 *
 * ----
 * _Note: When using a project interface such as this, avoid using
 * any {@link Command Commands} that operate on elements inside the project. This
 * includes any command which operates on a node (e.g. {@link Command.updateNode} or {@link Command.reorderNodes})._
 *
 * _This is an alternative to {@link Command.createProject}._
 *
 * @module ScenelessProject
 */
import { Track } from 'livekit-client'
import { CoreContext } from '../core/context'
import { getProject, getProjectRoom } from '../core/data'
import { Compositor, SDK } from '../core/namespaces'
import { Banner, BannerProps, BannerSource } from '../core/sources/Banners'
import { RoomParticipantSource } from '../core/sources/WebRTC'
import { ChatOverlayProps } from '../core/transforms/ChatOverlay'
import { Disposable, SceneNode } from '../core/types'
import { cloneDeep, deepEqual, findAll, generateId } from '../logic'
import { BackgroundProps } from './../core/transforms/Background'
import { LogoProps } from './../core/transforms/Logo'
import { OverlayProps } from './../core/transforms/Overlay'
import {
  defaultStyles,
  ForegroundLayers,
  validateEachChildren,
} from './database'
import LayoutName = Compositor.Layout.LayoutName
import { LiveApiModel } from '@api.stream/sdk'

export type { LayoutName }
export type { Banner, BannerSource, RoomParticipantSource }

export type ParticipantProps = {
  volume: number
  isMuted: boolean
  isHidden: boolean
}

export type HTMLVideoElementAttributes = {
  loop?: boolean
  autoplay?: boolean
  muted?: boolean
  playsinline?: boolean
  disablepictureinpicture?: boolean
}

type CreateSourceProps = {
  displayName?: string
  address?: Partial<LiveApiModel.Source['address']>
  props?: any
}

type GenerateGameSourceProps<T extends LiveApiModel.Source> = {
  address: T['address'] extends {
    dynamic: LiveApiModel.Source['address']['dynamic']
  }
    ? { dynamic: { id: 'console-integration' } }
    : never
  displayName?: string
  props?: any
}

type CreateGameSourceProps = GenerateGameSourceProps<LiveApiModel.Source>

// Local cache to track participants being added
const addingCache = {
  camera: new Set<string>(),
  screen: new Set<string>(),
  rtmp: new Set<string>(),
  game: new Set<string>(),
}

export type ParticipantType = 'camera' | 'screen'

interface ScenelessProject extends SDK.Project {}

// Note: Assume project is a valid sceneless project
// Note: In the future commands will be returned by an argument of SceneNode

// TODO: Define defaults
// TODO: Define emits

/**
 * These commands assist with management of WebRTC {@link Participant Participants},
 * custom layouts, backgrounds, and overlay content.
 *
 * Only a valid {@link ScenelessProject} can leverage these commands.
 */
export interface Commands {
  /**
   * Get the node that holds the stream's background
   * @private
   */
  getBackground(): Compositor.SceneNode
  /**
   * Get the node that holds the stream's content
   * @private
   */
  getContent(): Compositor.SceneNode
  /**
   * Get the node that holds the stream's foreground (overlays)
   * @private
   */
  getForeground(): Compositor.SceneNode
  /**
   * Get the active layout
   * @private
   */
  getLayout(): string
  /**
   * Get all banners stored on the project
   */
  getBanners(): Banner[]

  /**
   * Get all participants in the project
   * @private
   */
  getParticipants(): Compositor.SceneNode[]
  /**
   * play video overlay on foreground
   * @private
   */
  autoPlayVideoOverlay(
    overlayId: string,
    attributes: HTMLVideoElementAttributes,
  ): void

  /**
   * play background Video
   * @private
   */
  autoPlayBackgroundVideo(attributes?: HTMLVideoElementAttributes): void

  /**
   * Remove logo from stream
   */
  removeLogo(): Promise<void>

  /**
   * Add logo on stream
   * @param id
   * @param logo
   */
  addLogo(id: string, logo: LogoProps): Promise<void>

  /**
   * Get active logo
   */
  getLogo(): string

  /**
   * Add an chat comment to the stream.
   */
  addChatOverlay(id: string, Options: ChatOverlayProps): void

  /**
   * Add an any exisiting chat comment from the stream.
   */
  removeChatOverlay(id: string): void

  /**
   * get the active chat comment to the stream.
   */
  getChatOverlay(): ChatOverlayProps | null

  /**
   * Set the active layout and associated layoutProps
   */
  setLayout(layout: LayoutName, layoutProps: LayoutProps): void

  /**
   * Set the active background image
   */
  getBackgroundMedia(): string

  /**
   * Get the active background image
   */
  getBackgroundImage(): string
  /**
   * Get the active background video
   */
  getBackgroundVideo(): string

  /**
   * remove the active video overlay
   */
  removeBackgroundImage(): Promise<void>
  /**
   * remove the active image overlay
   */
  removeBackgroundVideo(): Promise<void>
  /**
     Set the active background image
   */
  setBackgroundImage(id: string, props: BackgroundProps): Promise<void>

  /**
   * Set the active background video
   */
  setBackgroundVideo(
    id: string,
    props: BackgroundProps & HTMLVideoElementAttributes,
  ): Promise<void>

  /* Updating the background video props. */
  updateBackgroundVideoProps(
    id: string,
    props: BackgroundProps & HTMLVideoElementAttributes,
  ): Promise<void>

  getImageOverlay(): string | null
  /**
   * Get the active video overlay
   */
  getVideoOverlay(): string | null
  /**
   * Get the active foreground image overlay
   */
  getCustomOverlay(): string | null
  /**
   * Set the active foreground image overlay
   */
  addImageOverlay(overlayId: string, props: OverlayProps): Promise<void>
  /**
   * set image overlay on foreground video layer
   */
  addVideoOverlay(
    overlayId: string,
    props: OverlayProps & HTMLVideoElementAttributes,
  ): Promise<void>

  updateVideoOverlayProps(
    id: string,
    props: OverlayProps & HTMLVideoElementAttributes,
  ): Promise<void>
  /**
   * add html overlay
   */
  addCustomOverlay(id: string, props: OverlayProps): Promise<void>
  /**
   * remove video overlay from foreground layer
   */
  removeCustomOverlay(): Promise<void>
  /**
   * remove the active video overlay
   */
  removeVideoOverlay(): Promise<void>
  /**
   * remove the active image overlay
   */
  removeImageOverlay(): Promise<void>

  /* A generic function that takes a string and a callback function as parameters. The callback
  function takes a generic type as a parameter. */
  useLayerState<T>(sourceType: string, cb: (state: T) => void): void
  /** Set one participant to "showcase". This participant will expand to fill
   * the space of the stream without affecting the underlying layout.
   */
  setShowcase(
    participantId: string,
    /** @default `'camera'` */
    type?: ParticipantType,
  ): ReturnType<typeof CoreContext.Command.updateNode>
  /**
   * @hook
   * Receive information about the showcased participant.
   * As with other hooks, the callback will be invoked when its value changes.
   */
  useShowcase(
    cb: (state: { participantId: string; type: ParticipantType }) => void,
  ): Disposable

  /**
   * @private
   * Get the node associated with an RTMP Source
   */
  getRTMPNode(id: string): Compositor.SceneNode

  /**
   * Use the RTMP nodes that are on currently on stage.
   */
  useRTMPNodes(cb: (nodes: Compositor.SceneNode[]) => void): Disposable

  /**
   * Add an RTMP Source to the canvas
   */
  addRTMPSource(
    id: string,
    props: Partial<ParticipantProps>,
    type?: ParticipantType,
  ): Promise<void>

  /**
   * Remove an RTMP source from the canvas
   */
  removeRTMPSource(id: string): void

  /**
   * @private
   * Get the node associated with an RTMP Source
   */
  getGameSourceNode(id: string): Compositor.SceneNode

  /**
   * Use the RTMP nodes that are on currently on stage.
   */
  useGameSourceNodes(cb: (nodes: Compositor.SceneNode[]) => void): Disposable

  /**
   * Add an RTMP Source to the canvas
   */
  addGameSource(
    id: string,
    props: Partial<ParticipantProps>,
    type?: ParticipantType,
  ): Promise<void>

  /**
   * Remove an RTMP source from the canvas
   */
  removeGameSource(id: string): void
  /**
   * Add a participant camera track to the stream canvas.
   * Available participants can be gleaned from the WebRTC {@link Room} using
   * {@link Room.useParticipants}.
   *
   * A participant will remain on stream even if there is no active feed, until
   * it is removed using {@link removeParticipantTrack removeParticipantTrack()} or {@link pruneParticipants pruneParticipants()}.
   */
  addParticipantTrack(
    trackId: string,
    props: Partial<ParticipantProps>,
    /**
     * The type of participant feed to add.
     * @default `'camera'`
     */
    type?: ParticipantType,
  ): Promise<void>
  /**
   * Remove a stream participant from the stream canvas.
   */
  removeParticipantTrack(trackId: string, type?: ParticipantType): void

  /**
   * Add a participant to the stream canvas.
   * Available participants can be gleaned from the WebRTC {@link Room} using
   * {@link Room.useParticipants}.
   *
   * A participant will remain on stream even if there is no active feed, until
   * it is removed using {@link removeParticipant removeParticipant()} or {@link pruneParticipants pruneParticipants()}.
   */

  addParticipant(
    participantId: string,
    props: Partial<ParticipantProps>,
    /**
     * The type of participant feed to add.
     * @default `'camera'`
     */
    type?: ParticipantType,
  ): Promise<void>
  /**
   * Remove a stream participant from the stream canvas.
   */
  removeParticipant(participantId: string, type: ParticipantType): void
  /**
   * @private
   * Get the node associated with a room participant
   * */
  getParticipantNode(
    id: string,
    /** @default `'camera'` */
    type?: ParticipantType,
  ): Compositor.SceneNode
  /**
   * Get {@link ParticipantProps} associated with a participant/type.
   */
  getParticipantState(
    participantId: string,
    /** @default `'camera'` */
    type?: ParticipantType,
  ): ParticipantProps
  /**
   * @hook
   * Receive {@link ParticipantProps} associated with a participant/type
   * via invoked callback anytime one of the property values changes.
   */
  useParticipantState(
    participantId: string,
    cb: (state: ParticipantProps) => void,
    /** @default `'camera'` */
    type?: ParticipantType,
  ): Disposable
  /**
   * Change a participant's volume.
   * This does not affect the underlying MediaStreamTrack.
   */
  setParticipantVolume(
    participantId: string,
    /**
     * Accepted values from [0 - 1]
     */
    volume: number,
  ): void
  /**
   * Mute a participant without changing their volume.
   *  This does not affect the underlying MediaStreamTrack.
   *
   * Participants muted in this way will not stop sending
   *  audio data, but it will not play on the receiving end.
   *
   * A host may use this to override a guest's settings
   *  for the stream output.
   */
  setParticipantMuted(participantId: string, isMuted: boolean): void
  /**
   * Hide a participant video feed from the stream.
   *  This does not affect the underlying MediaStreamTrack.
   *
   * Participants hidden in this way will not stop sending
   *  video data, but it will not play on the receiving end.
   *
   * A host may use this to override a guest's settings
   *  for the stream output.
   */
  setParticipantHidden(participantId: string, isHidden: boolean): void
  /**
   * Remove all participants from the stream canvas who are not actively
   * sending a MediaStreamTrack for display.
   */
  pruneParticipants(): void
  /**
   * Create and store a banner on the project.
   *
   * Does not add the banner to the stream.
   */
  addBanner(props: BannerProps): void
  /**
   * Edit a banner on the project.
   */
  editBanner(id: string, props: BannerProps): void
  /**
   * Remove a banner from the project.
   */
  removeBanner(id: string): void
  /**
   * Fetch the active banner displayed on stream.
   */
  getActiveBanner(): string | null
  /**
   * Add an existing banner to the stream.
   * If no `id` is supplied, existing banners will be removed.
   */
  setActiveBanner(id: string): void
  /**
   * Get an arbitrary property from the project (`project.props{}`)
   */
  getProp(props: string): any
  /**
   * Set an arbitrary property on the project (`project.props{}`)
   */
  setProp(props: string, val: any): void
  /**
   * Use the latest value of an arbitrary property on the project (`project.props{}`)
   */
  useProp(props: string, cb: (val: any) => void): void
  /**
   * Add a source TEMPORARY
   */
  createSource(props?: CreateSourceProps): Promise<LiveApiModel.Source>
  /**
   * Remove a source TEMPORARY
   */
  deleteSource(sourceId: string): void

  /**
   * Set the active layout and associated layoutProps
   */
  createGameSource(props: CreateGameSourceProps): Promise<LiveApiModel.Source>
}

/**
 * Accepts a Project that was created using {@link ScenelessProject.create ScenelessProject.create()}
 * and returns several commands specialized for a Sceneless broadcasting experience.
 *
 * These commands assist with management of WebRTC {@link Participant Participants},
 * custom layouts, backgrounds, and overlay content.
 */
export const commands = (_project: ScenelessProject) => {
  const projectId = _project.id
  const root = _project.scene.getRoot()
  const { Command } = CoreContext

  const background = root.children.find((x) => x.props.id === 'bg')
  const content = root.children.find((x) => x.props.id === 'content')
  const foreground = root.children.find((x) => x.props.id === 'foreground')

  let foregroundImageIframeContainer = foreground?.children?.find(
    (x) => x.props.id === 'fg-image-iframe',
  )

  let foregroundLogoContainer = foreground?.children?.find(
    (x) => x.props.id === 'logo',
  )

  let foregroundVideoContainer = foreground?.children?.find(
    (x) => x.props.id === 'fg-video',
  )
  const coreProject = getProject(_project.id)

  let bannerContainer = foreground?.children?.find(
    (x) => x.props.id === 'fg-banners',
  )

  const ensureRootLayersProps = async () => {
    if (background?.props?.layout !== 'Layered') {
      await coreProject.compositor.update(background.id, {
        name: 'Background',
        id: 'bg',
        layout: 'Layered',
      })
    }
    if (foreground?.props?.layout !== 'Layered') {
      await coreProject.compositor.update(foreground.id, {
        id: 'foreground',
        name: 'Overlays',
        layout: 'Layered',
      })
    }
  }

  const ensureBackgroundChildLayersProps = async () => {
    if (!validateEachChildren(background.children, ['Background'])) {
      background.children.forEach(async (child) => {
        await CoreContext.Command.deleteNode({ nodeId: child.id })
      })
    }
  }

  const ensureForegroundContainers = async () => {
    const ensureBannerContainer = async () => {
      if (!bannerContainer) {
        const nodeId = await coreProject.compositor.insert(
          {
            name: 'BannerContainer',
            id: 'fg-banners',
            layout: 'Column',
            layoutProps: {
              cover: true,
            },
          },
          foreground.id,
        )
        bannerContainer = foreground?.children?.find((x) => x.id === nodeId)
        return nodeId
      } else {
        return bannerContainer.id
      }
    }
    const ensureForegroundImageAndIframeContainer = async () => {
      if (!foregroundImageIframeContainer) {
        const nodeId = await coreProject.compositor.insert(
          {
            name: 'ImageIframeOverlay',
            id: 'fg-image-iframe',
            layout: 'Free',
          },
          foreground.id,
        )

        foregroundImageIframeContainer = foreground?.children?.find(
          (x) => x.id === nodeId,
        )
        return nodeId
      } else {
        return foregroundImageIframeContainer.id
      }
    }

    const ensureForegroundVideoContainer = async () => {
      if (!foregroundVideoContainer) {
        const nodeId = await coreProject.compositor.insert(
          {
            name: 'VideoOverlay',
            id: 'fg-video',
            layout: 'Free',
          },
          foreground.id,
        )
        foregroundVideoContainer = foreground?.children?.find(
          (x) => x.id === nodeId,
        )
        return nodeId
      } else {
        return foregroundVideoContainer.id
      }
    }

    const ensureForegroundLogoContainer = async () => {
      if (!foregroundLogoContainer) {
        const nodeId = await coreProject.compositor.insert(
          {
            name: 'Logo',
            layout: 'Free',
            sourceType: 'Logo',
            id: 'logo',
            style: {
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              position: 'unset',
            },
          },
          foreground.id,
        )
        foregroundLogoContainer = foreground?.children?.find(
          (x) => x.id === nodeId,
        )
        return nodeId
      } else {
        return foregroundLogoContainer.id
      }
    }

    try {
      const baseForegroundLayers = await Promise.all([
        ensureBannerContainer(),
        ensureForegroundImageAndIframeContainer(),
        ensureForegroundVideoContainer(),
        ensureForegroundLogoContainer(),
      ])

      await coreProject.compositor.reorder(foreground.id, baseForegroundLayers)
    } catch (e) {}
  }

  const commands: Commands = {
    getBackground() {
      return background
    },
    getContent() {
      return content
    },
    getForeground() {
      return foreground
    },
    getLayout() {
      return content.props.layout
    },
    getBanners() {
      return (getProject(_project.id).props?.banners || []) as Banner[]
    },
    getParticipants() {
      return content.children.filter((node) => {
        if (node.props.sourceType !== 'RoomParticipant') return false
        return true
      })
    },

    getLogo() {
      return foregroundLogoContainer?.children[0]?.props?.id
    },

    async removeLogo() {
      // find overlay node by id
      const [existingLogoNode, ...excessLogoNode] =
        foregroundLogoContainer?.children || ([] as SceneNode[])
      // if overlay exists, remove it
      excessLogoNode.forEach((x) => {
        CoreContext.Command.deleteNode({
          nodeId: x.id,
        })
      })
      if (existingLogoNode) {
        await CoreContext.Command.deleteNode({
          nodeId: existingLogoNode.id,
        })
      }
    },

    getImageOverlay(): string | null {
      const foregroundImage = foregroundImageIframeContainer?.children?.find(
        (x) => x?.props?.sourceProps?.type === 'image',
      )
      return foregroundImage?.props?.id
    },

    getVideoOverlay(): string | null {
      const foregroundVideo = foregroundVideoContainer?.children?.find(
        (x) => x?.props?.sourceProps?.type === 'video',
      )
      return foregroundVideo?.props?.id
    },

    autoPlayBackgroundVideo(
      attributes: HTMLVideoElementAttributes = {
        muted: true,
        autoplay: true,
      },
    ) {
      // find overlay node by id
      const backgroundVideo = background.children.find(
        (x) => x.props.id === 'bg-video',
      )
      // if overlay is not found, return
      if (!backgroundVideo) {
        return
      }
      // check if overlay is of type video
      // autoPlay overlay with muted audio
      // update overlay node with new attributes
      CoreContext.Command.updateNode({
        nodeId: backgroundVideo.id,
        props: {
          ...backgroundVideo.props,
          attributes: {
            ...backgroundVideo.props.attributes,
            ...attributes,
          },
        },
      })
    },

    autoPlayVideoOverlay(
      overlayId: string,
      attributes: HTMLVideoElementAttributes = {
        muted: true,
        autoplay: true,
      },
    ) {
      // find overlay node by id
      const overlay = foregroundVideoContainer?.children?.find(
        (x) => x.props?.sourceProps?.id === overlayId,
      )

      // if overlay is not found, return
      if (!overlay) {
        return
      }

      // check if overlay is of type video
      if (overlay.props.sourceProps.type === 'video') {
        // autoPlay overlay with muted audio
        // update overlay node with new attributes
        CoreContext.Command.updateNode({
          nodeId: overlay.id,
          props: {
            ...overlay.props,
            attributes: {
              ...overlay.props.attributes,
              ...attributes,
            },
          },
        })
      }
    },

    getBackgroundMedia() {
      const backgroundChild = background.children.filter((x) => x)
      return backgroundChild[0]?.props?.id
    },

    getBackgroundImage() {
      const backgroundChild = background.children.find(
        (x) => x.props?.sourceProps?.type === 'image',
      )
      return backgroundChild?.props?.id
    },

    getBackgroundVideo() {
      const backgroundChild = background.children.find(
        (x) => x.props?.sourceProps?.type === 'video',
      )
      return backgroundChild?.props?.id
    },

    async addLogo(id: string, props: LogoProps) {
      const [existingLogoNode, ...excessLogoNodes] =
        foregroundLogoContainer?.children || ([] as SceneNode[])
      // Delete all except one banner from the project
      excessLogoNodes.forEach((x) => {
        CoreContext.Command.deleteNode({
          nodeId: x.id,
        })
      })
      if (!existingLogoNode) {
        await CoreContext.Command.createNode({
          parentId: foregroundLogoContainer?.id,
          props: {
            sourceType: 'Logo',
            id: id,
            sourceProps: {
              ...props,
              meta: {
                style: { ...defaultStyles['logo'] },
                ...props.meta,
              },
            },
          },
        })
      } else {
        await CoreContext.Command.updateNode({
          nodeId: existingLogoNode.id,
          props: {
            sourceType: 'Logo',
            id: id,
            sourceProps: {
              ...props,
              meta: {
                style: { ...defaultStyles['logo'] },
                ...props.meta,
              },
            },
          },
        })
      }
    },

    addBanner(props: BannerProps = {}) {
      const meta = props.meta || {}
      const banner = {
        id: generateId(),
        props: {
          ...props,
          meta,
        },
      }

      const existingBanners = (getProject(projectId).props?.banners ||
        []) as Banner[]
      return Command.updateProjectProps({
        projectId,
        props: {
          banners: [...existingBanners, banner],
        },
      })
    },
    editBanner(id: string, props: BannerProps = {}) {
      const existingBanners = commands.getBanners()
      const banners = existingBanners.map((x) => {
        if (x.id !== id) return x
        return {
          ...x,
          props,
        }
      })
      return Command.updateProjectProps({
        projectId,
        props: {
          banners,
        },
      })
    },
    removeBanner(id: string) {
      const existingBanners = commands.getBanners()
      // Remove dependent nodes from stream
      bannerContainer?.children?.forEach((x) => {
        if (x.props.bannerId !== id) return
        CoreContext.Command.deleteNode({
          nodeId: x.id,
        })
      })

      return Command.updateProjectProps({
        projectId,
        props: {
          banners: existingBanners.filter((x) => x.id !== id),
        },
      })
    },
    async setActiveBanner(id: string) {
      const [nodeTocheckForChildren, ...{}] =
        bannerContainer?.children || ([] as SceneNode[])

      /* Checking if the existingBannerNode has a property called chatOverlayId. If it does, it deletes the
      node. */
      if (
        nodeTocheckForChildren?.props?.sourceType?.toLowerCase() ===
        'chatoverlay'
      ) {
        await CoreContext.Command.deleteNode({
          nodeId: nodeTocheckForChildren.id,
        })
      }

      const [existingBannerNode, ...excessBannerNodes] =
        bannerContainer?.children || ([] as SceneNode[])
      // Delete all except one banner from the project
      excessBannerNodes.forEach((x) => {
        CoreContext.Command.deleteNode({
          nodeId: x.id,
        })
      })
      if (!existingBannerNode) {
        return CoreContext.Command.createNode({
          parentId: bannerContainer?.id,
          props: {
            sourceType: 'Banner',
            bannerId: id,
          },
        })
      } else {
        CoreContext.Command.updateNode({
          nodeId: existingBannerNode.id,
          props: {
            sourceType: 'Banner',
            bannerId: id,
          },
        })
      }
    },

    getActiveBanner(): string | null {
      return bannerContainer.children?.[0]?.props?.bannerId ?? null
    },

    async addChatOverlay(id: string, options: ChatOverlayProps) {
      const [nodeTocheckForChildren, ...{}] =
        bannerContainer?.children || ([] as SceneNode[])

      /* Deleting the existing banner node if it exists. */
      if (
        nodeTocheckForChildren?.props?.sourceType?.toLowerCase() === 'banner'
      ) {
        await CoreContext.Command.deleteNode({
          nodeId: nodeTocheckForChildren.id,
        })
      }

      /* Destructuring an array. */
      const [existingBannerNode, ...excessBannerNodes] =
        bannerContainer?.children || ([] as SceneNode[])

      // Delete all except one banner from the project
      excessBannerNodes.forEach((x) => {
        CoreContext.Command.deleteNode({
          nodeId: x.id,
        })
      })

      /* Creating a banner node if it doesn't exist, or updating it if it does. */
      if (!existingBannerNode) {
        await CoreContext.Command.createNode({
          parentId: bannerContainer?.id,
          props: {
            sourceType: 'ChatOverlay',
            chatOverlayId: id,
            id,
            ...options,
          },
        })
      } else {
        await CoreContext.Command.updateNode({
          nodeId: existingBannerNode.id,
          props: {
            sourceType: 'ChatOverlay',
            chatOverlayId: id,
            id,
            ...options,
          },
        })
      }
    },

    async removeChatOverlay(id: string) {
      // Remove dependent nodes from stream
      bannerContainer?.children?.forEach(async (x) => {
        if (x.props.chatOverlayId !== id) return
        await CoreContext.Command.deleteNode({
          nodeId: x.id,
        })
      })
    },

    getChatOverlay(): ChatOverlayProps | null {
      /* Checking if the bannerContainer has a child and if that child has a chatOverlayId property. If it
        does, it returns the child as an IChatOverlay. If it doesn't, it returns null.
      */
      return bannerContainer.children?.[0]?.props?.chatOverlayId
        ? (bannerContainer.children?.[0]?.props as ChatOverlayProps) || null
        : null
    },

    getCustomOverlay(): string | null {
      const foregroundCustom = foregroundImageIframeContainer?.children?.find(
        (x) => x?.props?.sourceProps?.type === 'custom',
      )
      return foregroundCustom?.props?.id
    },

    async addImageOverlay(id: string, props: OverlayProps): Promise<void> {
      const [existingForegroundNode, ...excessForegroundNode] =
        foregroundImageIframeContainer?.children || ([] as SceneNode[])
      // Delete all except one banner from the project
      excessForegroundNode.forEach((x) => {
        CoreContext.Command.deleteNode({
          nodeId: x.id,
        })
      })
      const extendedDefaultStyles = {
        ...defaultStyles['image'],
        ...(foregroundVideoContainer?.children.length && { opacity: 0 }),
      }
      if (!existingForegroundNode) {
        await CoreContext.Command.createNode({
          parentId: foregroundImageIframeContainer?.id,
          props: {
            sourceType: 'Overlay',
            id: id,
            sourceProps: {
              ...props,
              type: 'image',
              meta: {
                style: { ...extendedDefaultStyles },
              },
            },
          },
        })
      } else {
        await CoreContext.Command.updateNode({
          nodeId: existingForegroundNode?.id,
          props: {
            sourceType: 'Overlay',
            id: id,
            sourceProps: {
              ...props,
              type: 'image',
              meta: {
                style: { ...extendedDefaultStyles },
              },
            },
          },
        })
      }
    },

    async addVideoOverlay(
      id: string,
      props: OverlayProps & HTMLVideoElementAttributes,
    ): Promise<void> {
      const [existingForegroundNode, ...excessForegroundNode] =
        foregroundVideoContainer?.children || ([] as SceneNode[])
      // Delete all except one banner from the project
      excessForegroundNode.forEach((x) => {
        CoreContext.Command.deleteNode({
          nodeId: x.id,
        })
      })

      // get all children of the overlay node and update their opacity attributes
      foregroundImageIframeContainer.children.forEach(
        ({ id, props: localProps }) => {
          if (localProps.sourceProps.meta?.style?.opacity !== 0) {
            const type = localProps.sourceProps
              .type as keyof typeof defaultStyles
            const extendedDefaultStyles = {
              ...defaultStyles[type],
              opacity: 0,
            }
            CoreContext.Command.updateNode({
              nodeId: id,
              props: {
                ...localProps,
                sourceProps: {
                  ...localProps.sourceProps,
                  meta: {
                    style: { ...extendedDefaultStyles },
                  },
                },
              },
            })
          }
        },
      )

      if (!existingForegroundNode) {
        await CoreContext.Command.createNode({
          parentId: foregroundVideoContainer?.id,
          props: {
            sourceType: 'Overlay',
            id: id,
            sourceProps: {
              ...props,
              type: 'video',
              meta: {
                style: { ...defaultStyles['video'] },
                ...props.meta,
              },
            },
          },
        })
      } else {
        await CoreContext.Command.updateNode({
          nodeId: existingForegroundNode?.id,
          props: {
            sourceType: 'Overlay',
            id: id,
            sourceProps: {
              ...props,
              type: 'video',
              meta: {
                style: { ...defaultStyles['video'] },
                ...props.meta,
              },
            },
          },
        })
      }
    },

    async updateVideoOverlayProps(
      id: string,
      props: OverlayProps & HTMLVideoElementAttributes,
    ): Promise<void> {
      const existingForegroundNode =
        foregroundVideoContainer?.children?.find((x) => x?.props?.id === id) ||
        null
      if (!existingForegroundNode) {
        return
      }
      await CoreContext.Command.updateNode({
        nodeId: existingForegroundNode?.id,
        props: {
          sourceType: 'Overlay',
          id: id,
          sourceProps: {
            ...existingForegroundNode?.props?.sourceProps,
            ...props,
            meta: {
              style: { ...defaultStyles['video'] },
              ...props.meta,
            },
          },
        },
      })
    },

    async addCustomOverlay(id: string, props: OverlayProps): Promise<void> {
      const [existingForegroundNode, ...excessForegroundNode] =
        foregroundImageIframeContainer?.children || ([] as SceneNode[])
      // Delete all except one banner from the project
      excessForegroundNode.forEach((x) => {
        CoreContext.Command.deleteNode({
          nodeId: x.id,
        })
      })
      const extendedDefaultStyles = {
        ...defaultStyles['custom'],
        ...(foregroundVideoContainer?.children.length && { opacity: 0 }),
      }
      if (!existingForegroundNode) {
        await CoreContext.Command.createNode({
          parentId: foregroundImageIframeContainer?.id,
          props: {
            sourceType: 'Overlay',
            id: id,
            sourceProps: {
              ...props,
              type: 'custom',
              meta: {
                style: { ...extendedDefaultStyles },
              },
            },
          },
        })
      } else {
        await CoreContext.Command.updateNode({
          nodeId: existingForegroundNode?.id,
          props: {
            sourceType: 'Overlay',
            id: id,
            sourceProps: {
              ...props,
              type: 'custom',
              meta: {
                style: { ...extendedDefaultStyles },
              },
            },
          },
        })
      }
    },

    async removeCustomOverlay(): Promise<void> {
      // find overlay node by id
      const [existingForegroundNode, ...excessForegroundNode] =
        foregroundImageIframeContainer?.children || ([] as SceneNode[])
      // if overlay exists, remove it
      excessForegroundNode.forEach((x) => {
        CoreContext.Command.deleteNode({
          nodeId: x.id,
        })
      })
      if (existingForegroundNode) {
        if (existingForegroundNode?.props?.sourceProps?.type === 'custom') {
          await CoreContext.Command.deleteNode({
            nodeId: existingForegroundNode.id,
          })
        }
      }
    },

    async removeImageOverlay(): Promise<void> {
      // find overlay node by id
      const [existingForegroundNode, ...excessForegroundNode] =
        foregroundImageIframeContainer?.children || ([] as SceneNode[])
      // if overlay exists, remove it
      excessForegroundNode.forEach((x) => {
        CoreContext.Command.deleteNode({
          nodeId: x.id,
        })
      })
      if (existingForegroundNode) {
        if (existingForegroundNode?.props?.sourceProps?.type === 'image') {
          await CoreContext.Command.deleteNode({
            nodeId: existingForegroundNode.id,
          })
        }
      }
    },

    async removeVideoOverlay(): Promise<void> {
      // find overlay node by id
      // find overlay node by id
      const [existingForegroundNode, ...excessForegroundNode] =
        foregroundVideoContainer?.children || ([] as SceneNode[])

      // if overlay exists, remove it
      excessForegroundNode.forEach((x) => {
        CoreContext.Command.deleteNode({
          nodeId: x.id,
        })
      })
      if (existingForegroundNode) {
        await CoreContext.Command.deleteNode({
          nodeId: existingForegroundNode.id,
        })
      }

      // get all children of the overlay node and update their opacity attributes
      foregroundImageIframeContainer?.children.forEach(({ id, props }) => {
        if (props.sourceProps.meta?.style?.opacity === 0) {
          const type = props.sourceProps.type as keyof typeof defaultStyles
          const extendedDefaultStyles = {
            ...defaultStyles[type],
            opacity: 1,
          }
          CoreContext.Command.updateNode({
            nodeId: id,
            props: {
              ...props,
              sourceProps: {
                ...props.sourceProps,
                meta: {
                  style: { ...extendedDefaultStyles },
                },
              },
            },
          })
        }
      })
    },

    setLayout(layout: LayoutName, layoutProps: LayoutProps = {}) {
      const showcase = content.props.layoutProps.showcase
      Command.setNodeLayout({
        nodeId: content.id,
        layout,
        layoutProps: {
          showcase,
          ...layoutProps,
        },
      })
    },

    async setBackgroundImage(
      id: string,
      props: BackgroundProps,
    ): Promise<void> {
      const [existingBackgroundNode, ...excessBackgroundNode] =
        background?.children || ([] as SceneNode[])
      // Delete all except one banner from the project
      excessBackgroundNode.forEach((x) => {
        CoreContext.Command.deleteNode({
          nodeId: x.id,
        })
      })
      if (!existingBackgroundNode) {
        await CoreContext.Command.createNode({
          parentId: background?.id,
          props: {
            id: id,
            sourceType: 'Background',
            sourceProps: {
              ...props,
              type: 'image',
              meta: {
                style: { ...defaultStyles['image'] },
                ...props?.meta,
              },
            },
          },
        })
      } else {
        await CoreContext.Command.updateNode({
          nodeId: existingBackgroundNode.id,
          props: {
            id: id,
            sourceType: 'Background',
            sourceProps: {
              ...props,
              type: 'image',
              meta: {
                style: { ...defaultStyles['image'] },
                ...props?.meta,
              },
            },
          },
        })
      }
    },

    async setBackgroundVideo(
      id: string,
      props: BackgroundProps & HTMLVideoElementAttributes,
    ): Promise<void> {
      const [existingBackgroundNode, ...excessBackgroundNode] =
        background?.children || ([] as SceneNode[])
      // Delete all except one banner from the project
      excessBackgroundNode.forEach((x) => {
        CoreContext.Command.deleteNode({
          nodeId: x.id,
        })
      })
      if (!existingBackgroundNode) {
        await CoreContext.Command.createNode({
          parentId: background?.id,
          props: {
            id: id,
            sourceType: 'Background',
            sourceProps: {
              ...props,
              type: 'video',
              meta: {
                style: { ...defaultStyles['video'] },
                ...props?.meta,
              },
            },
          },
        })
      } else {
        await CoreContext.Command.updateNode({
          nodeId: existingBackgroundNode.id,
          props: {
            id: id,
            sourceType: 'Background',
            sourceProps: {
              ...props,
              type: 'video',
              meta: {
                style: { ...defaultStyles['video'] },
                ...props?.meta,
              },
            },
          },
        })
      }
    },

    async updateBackgroundVideoProps(
      id: string,
      props: BackgroundProps & HTMLVideoElementAttributes,
    ): Promise<void> {
      const existingBackgroundNode =
        background?.children?.find((x) => x?.props?.id === id) || null
      if (!existingBackgroundNode) {
        return
      }
      await CoreContext.Command.updateNode({
        nodeId: existingBackgroundNode?.id,
        props: {
          sourceType: 'Background',
          id: id,
          sourceProps: {
            ...existingBackgroundNode?.props?.sourceProps,
            ...props,
            meta: {
              style: { ...defaultStyles['video'] },
              ...props.meta,
            },
          },
        },
      })
    },

    async removeBackgroundImage(): Promise<void> {
      // find overlay node by id
      const [existingBackgroundNode, ...excessBackgroundNode] =
        background?.children || ([] as SceneNode[])
      // if overlay exists, remove it
      excessBackgroundNode.forEach((x) => {
        CoreContext.Command.deleteNode({
          nodeId: x.id,
        })
      })
      if (existingBackgroundNode) {
        if (existingBackgroundNode.props.sourceProps.type === 'image') {
          await CoreContext.Command.deleteNode({
            nodeId: existingBackgroundNode.id,
          })
        }
      }
    },

    async removeBackgroundVideo(): Promise<void> {
      const [existingBackgroundNode, ...excessBackgroundNode] =
        background?.children || ([] as SceneNode[])
      // if overlay exists, remove it
      excessBackgroundNode.forEach((x) => {
        CoreContext.Command.deleteNode({
          nodeId: x.id,
        })
      })
      if (existingBackgroundNode) {
        if (existingBackgroundNode.props.sourceProps.type === 'video') {
          await CoreContext.Command.deleteNode({
            nodeId: existingBackgroundNode.id,
          })
        }
      }
    },

    /* A function that takes in a sourceType and a callback function. It then creates a shallow copy of
      the root node and finds all the nodes that have the same sourceType as the one passed in. It then
      creates a listener for when the node changes, is added, or is removed. When any of these events
      happen, it will call the callback function with the new state. */
    useLayerState<T>(sourceType: string, cb: (state: T) => void) {
      const shallowRoot = cloneDeep(root)
      let layerNode = findAll(
        shallowRoot,
        (x: SceneNode) => x.props.sourceType === sourceType,
      ) as SceneNode[]

      const sendState = () => {
        cb((layerNode?.map((l) => l.props) || {}) as T)
      }

      // Watch for changes to the parent children
      const layerChangeListener = CoreContext.onInternal(
        'NodeChanged',
        (payload) => {
          const changedLayer = layerNode?.find((l) => l.id === payload.nodeId)
          if (layerNode?.length && !changedLayer) return
          const previousLayerNode = layerNode
          const shallowRoot = cloneDeep(root)
          layerNode = findAll(
            shallowRoot,
            (x: SceneNode) => x?.props?.sourceType === sourceType,
          )
          if (!deepEqual(previousLayerNode, layerNode)) {
            sendState()
          }
        },
      )

      const layerAddListener = CoreContext.onInternal(
        'NodeAdded',
        (payload) => {
          const existingLayer = layerNode?.find((l) => l.id === payload.nodeId)
          if (existingLayer) return
          const shallowRoot = cloneDeep(root)
          layerNode = findAll(
            shallowRoot,
            (x: SceneNode) => x?.props?.sourceType === sourceType,
          )
          const addedLayer = layerNode?.find((l) => l.id === payload.nodeId)
          if (addedLayer?.props?.sourceType === sourceType) {
            sendState()
          }
        },
      )

      const layerRemoveListener = CoreContext.onInternal(
        'NodeRemoved',
        (payload) => {
          const removedLayer = layerNode?.find((l) => l.id === payload.nodeId)
          if (!removedLayer) return
          layerNode = layerNode?.filter((l) => l.id !== payload.nodeId)
          if (removedLayer?.props?.sourceType === sourceType) {
            sendState()
          }
        },
      )

      sendState()

      // Return disposable for listener
      return () => {
        layerChangeListener()
        layerAddListener()
        layerRemoveListener()
      }
    },
    setShowcase(participantId: string, type: ParticipantType = 'camera') {
      const node = commands.getParticipantNode(participantId, type)
      return CoreContext.Command.updateNode({
        nodeId: content.id,
        props: {
          layoutProps: {
            ...content.props.layoutProps,
            showcase: node?.id ?? null,
          },
        },
      })
    },
    useShowcase(
      cb: (state: { participantId: string; type: ParticipantType }) => void,
    ) {
      const sendState = () => {
        const nodeId = content.props.layoutProps.showcase
        const node = content.children.find((x) => x.id === nodeId)
        if (!node)
          return cb({
            participantId: null,
            type: null,
          })

        const { sourceProps } = node.props
        return cb({
          participantId: sourceProps.id,
          type: sourceProps.type,
        })
      }
      sendState()

      // Watch for changes to the parent children
      return CoreContext.onInternal('NodeChanged', (payload) => {
        if (payload.nodeId !== content.id) return
        sendState()
      })
    },

    getRTMPNode(id: string) {
      return content.children.find(
        (x) =>
          x.props.sourceProps?.id === id &&
          x.props.sourceProps?.type === 'rtmp',
      )
    },

    useRTMPNodes(cb) {
      let nodeIds: string[] = []
      const sendState = () => {
        const nodes = content.children.filter(
          (n) => n.props?.sourceProps?.type === 'rtmp',
        )
        nodeIds = nodes.map((n) => n.id)
        return cb(nodes)
      }

      sendState()

      const nodeAddedListener = CoreContext.onInternal(
        'NodeAdded',
        (payload) => {
          const node = _project.scene.get(payload.nodeId)
          if (node?.props?.sourceProps?.type === 'rtmp') {
            sendState()
          }
        },
      )

      const nodeRemovedListener = CoreContext.onInternal(
        'NodeRemoved',
        (payload) => {
          if (nodeIds.indexOf(payload.nodeId) !== -1) {
            sendState()
          }
        },
      )

      return () => {
        nodeAddedListener()
        nodeRemovedListener()
      }
    },

    async addRTMPSource(
      id: string,
      props: Partial<ParticipantProps> = {
        isMuted: true,
        isHidden: false,
        volume: 0,
      },
    ) {
      const type = 'rtmp'
      if (addingCache[type].has(id)) {
        return
      }
      const { isMuted = false, isHidden = false, volume = 1 } = props
      const existing = content.children.find(
        (x) =>
          x.props.sourceProps?.id === id && x.props.sourceProps?.type === type,
      )
      if (existing) return

      addingCache[type].add(id)
      // Get the participant type in the first position
      const currentFirst = content.children[0]
      let index = content.children.length

      await CoreContext.Command.createNode({
        props: {
          name: 'RTMP',
          sourceType: 'RTMP',
          sourceProps: {
            type,
            id,
          },
          volume,
          isMuted,
          isHidden,
        },
        parentId: content.id,
        index,
      }).finally(() => {
        addingCache[type].delete(id)
      })
    },

    removeRTMPSource(id: string) {
      const type = 'rtmp'
      content.children
        .filter(
          (x) =>
            x.props.sourceProps?.id === id &&
            x.props.sourceProps?.type === type &&
            x.props.sourceType === 'RTMP',
        )
        .forEach((x) => {
          CoreContext.Command.deleteNode({
            nodeId: x.id,
          })
        })
    },

    getGameSourceNode(id: string) {
      return content.children.find(
        (x) =>
          x.props.sourceProps?.id === id &&
          x.props.sourceProps?.type === 'game',
      )
    },

    useGameSourceNodes(cb) {
      let nodeIds: string[] = []
      const sendState = () => {
        const nodes = content.children.filter(
          (n) => n.props?.sourceProps?.type === 'game',
        )
        nodeIds = nodes.map((n) => n.id)
        return cb(nodes)
      }

      sendState()

      const nodeAddedListener = CoreContext.onInternal(
        'NodeAdded',
        (payload) => {
          const node = _project.scene.get(payload.nodeId)
          if (node?.props?.sourceProps?.type === 'game') {
            sendState()
          }
        },
      )

      const nodeRemovedListener = CoreContext.onInternal(
        'NodeRemoved',
        (payload) => {
          if (nodeIds.indexOf(payload.nodeId) !== -1) {
            sendState()
          }
        },
      )

      return () => {
        nodeAddedListener()
        nodeRemovedListener()
      }
    },

    async addGameSource(
      id: string,
      props: Partial<ParticipantProps> = {
        isMuted: true,
        isHidden: false,
        volume: 0,
      },
    ) {
      const type = 'game'
      if (addingCache[type].has(id)) {
        return
      }
      const { isMuted = false, isHidden = false, volume = 1 } = props
      const existing = content.children.find(
        (x) =>
          x.props.sourceProps?.id === id && x.props.sourceProps?.type === type,
      )
      if (existing) return

      addingCache[type].add(id)
      // Get the participant type in the first position
      const currentFirst = content.children[0]
      let index = content.children.length

      await CoreContext.Command.createNode({
        props: {
          name: 'Game',
          sourceType: 'Game',
          sourceProps: {
            type,
            id,
          },
          volume,
          isMuted,
          isHidden,
        },
        parentId: content.id,
        index,
      }).finally(() => {
        addingCache[type].delete(id)
      })
    },

    removeGameSource(id: string) {
      const type = 'game'
      content.children
        .filter(
          (x) =>
            x.props.sourceProps?.id === id &&
            x.props.sourceProps?.type === type &&
            x.props.sourceType === 'Game',
        )
        .forEach((x) => {
          CoreContext.Command.deleteNode({
            nodeId: x.id,
          })
        })
    },

    async addParticipantTrack(
      trackId: string,
      props: Partial<ParticipantProps> = {
        isMuted: true,
        isHidden: false,
        volume: 0,
      },
      type: ParticipantType = 'camera',
    ) {
      if (addingCache[type].has(trackId)) return

      const { isMuted = false, isHidden = false, volume = 1 } = props
      const existing = content.children.find(
        (x) =>
          x.props.sourceProps?.id === trackId &&
          x.props.sourceProps?.type === type,
      )
      if (existing) return

      addingCache[type].add(trackId)
      // Get the participant type in the first position
      const currentFirst = content.children[0]
      let index = content.children.length

      // If we're adding a screen and the first position is not already
      //  a screen, then we add it in the first position.
      if (
        type === 'screen' &&
        currentFirst?.props.sourceProps.type !== 'screen'
      ) {
        index = 0
      }
      await CoreContext.Command.createNode({
        props: {
          name: 'Participant',
          sourceType: 'RoomParticipant',
          sourceProps: {
            type,
            id: trackId,
          },
          volume,
          isMuted,
          isHidden,
        },
        parentId: content.id,
        index,
      }).finally(() => {
        addingCache[type].delete(trackId)
      })
    },

    removeParticipantTrack(trackId: string, type: ParticipantType = 'camera') {
      content.children
        .filter(
          (x) =>
            x.props.sourceProps?.id === trackId &&
            x.props.sourceProps?.type === type &&
            x.props.sourceType === 'RoomParticipant',
        )
        .forEach((x) => {
          CoreContext.Command.deleteNode({
            nodeId: x.id,
          })
        })
    },

    async addParticipant(
      participantId: string,
      props: Partial<ParticipantProps> = {},
      type: ParticipantType = 'camera',
    ) {
      if (addingCache[type].has(participantId)) return

      const { isMuted = false, isHidden = false, volume = 1 } = props
      const existing = content.children.find(
        (x) =>
          x.props.sourceProps?.id === participantId &&
          x.props.sourceProps?.type === type,
      )
      if (existing) return

      addingCache[type].add(participantId)
      // Get the participant type in the first position
      const currentFirst = content.children[0]
      let index = content.children.length

      // If we're adding a screen and the first position is not already
      //  a screen, then we add it in the first position.
      if (
        type === 'screen' &&
        currentFirst?.props.sourceProps.type !== 'screen'
      ) {
        index = 0
      }
      await CoreContext.Command.createNode({
        props: {
          name: 'Participant',
          sourceType: 'RoomParticipant',
          sourceProps: {
            type,
            id: participantId,
          },
          volume,
          isMuted,
          isHidden,
        },
        parentId: content.id,
        index,
      }).finally(() => {
        addingCache[type].delete(participantId)
      })
    },
    removeParticipant(participantId: string, type: ParticipantType = 'camera') {
      content.children
        .filter(
          (x) =>
            x.props.sourceProps?.id === participantId &&
            x.props.sourceProps?.type === type &&
            x.props.sourceType === 'RoomParticipant',
        )
        .forEach((x) => {
          CoreContext.Command.deleteNode({
            nodeId: x.id,
          })
        })
    },
    getParticipantNode(id: string, type: ParticipantType = 'camera') {
      return content.children.find(
        (x) =>
          x.props.sourceProps?.id === id && x.props.sourceProps?.type === type,
      )
    },
    getParticipantState(
      participantId: string,
      type: ParticipantType = 'camera',
    ) {
      return commands.getParticipantNode(participantId, type)
        ?.props as ParticipantProps
    },

    useParticipantState(
      participantId: string,
      cb: (state: ParticipantProps) => void,
      type = 'camera' as ParticipantType,
    ) {
      let participantNode = commands.getParticipantNode(participantId, type)

      const sendState = () => {
        cb(participantNode?.props as ParticipantProps)
      }

      // Watch for changes to the parent children
      const childListener = CoreContext.onInternal('NodeChanged', (payload) => {
        if (payload.nodeId !== content.id) return
        const previous = participantNode
        participantNode = commands.getParticipantNode(participantId, type)
        if (previous !== participantNode) {
          sendState()
        }
      })

      // Watch for changes to the participant node
      const participantListener = CoreContext.onInternal(
        'NodeChanged',
        (payload) => {
          if (!participantNode || payload.nodeId !== participantNode.id) return
          sendState()
        },
      )

      sendState()

      // Return disposable for listener
      return () => {
        childListener()
        participantListener()
      }
    },

    setParticipantVolume(participantId: string, volume: number) {
      const node = commands.getParticipantNode(participantId)
      if (!node) return
      CoreContext.Command.updateNode({
        nodeId: node.id,
        props: {
          volume,
        },
      })
    },
    setParticipantMuted(participantId: string, isMuted: boolean) {
      const node = commands.getParticipantNode(participantId)
      if (!node) return
      CoreContext.Command.updateNode({
        nodeId: node.id,
        props: {
          isMuted,
        },
      })
    },
    setParticipantHidden(participantId: string, isHidden: boolean) {
      const node = commands.getParticipantNode(participantId)
      if (!node) return
      CoreContext.Command.updateNode({
        nodeId: node.id,
        props: {
          isHidden,
        },
      })
    },
    pruneParticipants() {
      // Remove all participant nodes that do not have active tracks
      const room = getProjectRoom(projectId)
      if (!room) return

      content.children
        .filter((node) => {
          if (node.props.sourceType !== 'RoomParticipant') return false
          const nodeSourceType = node.props.sourceProps?.type

          // Get the participant associated with the node
          const nodeParticipant = room.getParticipant(
            node.props.sourceProps?.id,
          )

          // Get the participant track associated with the node
          const nodeParticipantTrack = room.getTrack(node.props.sourceProps?.id)

          // If the participant is not in the room, remove the node
          if (!nodeParticipant && !nodeParticipantTrack) return true

          // Keep "camera" nodes around as long as the participant is available.
          //  This is to facilitate camera switching or other such feed interruptions
          if (nodeSourceType === 'camera') return false

          // Get all tracks associated with the node's participant
          const participantTracks = nodeParticipant.trackIds
            .map((x) => room.getTrack(x))
            .filter(Boolean)

          // Determine whether there is a track available to the node
          const hasAvailableTrack = participantTracks.some((track) => {
            // Get the source type as it corresponds to the track's type
            const sourceType =
              track.type === Track.Source.Camera ||
              track.type === Track.Source.Microphone
                ? 'camera'
                : 'screen'

            // Return true if the node source has a matching track
            return sourceType === nodeSourceType
          })

          return !hasAvailableTrack
        })
        .forEach((x) => {
          CoreContext.Command.deleteNode({
            nodeId: x.id,
          })
        })
    },
    getProp(prop) {
      return getProject(_project.id).props[prop]
    },
    setProp(prop, val) {
      return Command.updateProjectProps({
        projectId,
        props: {
          [prop]: val,
        },
      })
    },
    useProp(prop, cb) {
      return CoreContext.on('ProjectChanged', (payload) => {
        if (projectId === payload.project.id) {
          cb(payload.project.props[prop])
        }
      })
    },
    createSource(payload) {
      return CoreContext.Command.createSource({
        projectId,
        ...payload,
      })
    },
    deleteSource(sourceId) {
      return CoreContext.Command.deleteSource({
        projectId,
        sourceId,
      })
    },
    createGameSource(payload) {
      const exisitingGameSource = getProject(
        _project.id,
      ).videoApi.project.sources.find(
        (source) => source.address?.dynamic?.id === 'console-integration',
      )
      if (!exisitingGameSource) {
        return CoreContext.Command.createSource({
          projectId,
          ...payload,
        })
      }
    },
  }
  const ensureValid = async () => {
    await ensureRootLayersProps()
    await ensureBackgroundChildLayersProps()
    await ensureForegroundContainers()
  }

  ensureValid()

  return commands
}

export type LayoutProps = {
  cover?: boolean
  /** Valid CSS for justify-content */
  justifyViewers?: 'flex-end' | 'center' | 'flex-start'
  /** Percentage */
  barWidth?: number
  barPosition?: 'bottom' | 'side'
  useGrid?: boolean
  reverse?: boolean
}
type ScenelessSettings = {
  backgroundImage?: string
  layout?: string
  layoutProps?: LayoutProps
}

/**
 * **An abstraction over {@link Command.createProject Command.createProject()}.**
 *
 * A Project created using this function will be compatible with {@link ScenelessProject.commands ScenelessProject.commands()}
 *
 * **Emits: ProjectAdded**
 */
export const create = async (
  settings: ScenelessSettings = {},
  props: SDK.Props = {},
  size?: { x: number; y: number },
) => {
  return CoreContext.Command.createProject({
    settings,
    props,
    size,
  }) as Promise<ScenelessProject>
}

/** @private */
export const createCompositor = async (
  layoutId: string,
  size: { x: number; y: number },
  settings: ScenelessSettings,
) => {
  const { layout, layoutProps = {} } = settings

  // TODO: Batch insert
  const project = await CoreContext.compositor.createProject(
    {
      props: {
        name: 'Root',
        type: 'sceneless-project',
        sourceType: 'Element',
        layout: 'Layered',
        size,
        isRoot: true,
        tagName: 'div',
        version: 'beta',
        fields: {
          style: { background: 'black' },
        },
      },
    },
    layoutId,
  )
  const root = project.getRoot()

  // Create the base nodes for sceneless workflow
  const baseLayers = await Promise.all([
    project.insert(
      {
        name: 'Background',
        id: 'bg',
        layout: 'Layered',
      },
      root.id,
    ),

    project.insert(
      {
        id: 'content',
        name: 'Content',
        layout,
        layoutProps,
      },
      root.id,
    ),
    project.insert(
      {
        id: 'foreground',
        name: 'Overlays',
        layout: 'Layered',
      },
      root.id,
    ),
  ])

  await project.reorder(root.id, baseLayers)

  const foreground = root.children.find((x) => x.props.id === 'foreground')
  const foregroundLayerPromises = ForegroundLayers.map((layer) =>
    project.insert(layer, foreground.id),
  )
  const baseForegroundLayers = await Promise.all(foregroundLayerPromises)
  await project.reorder(foreground.id, baseForegroundLayers)

  return project
}
