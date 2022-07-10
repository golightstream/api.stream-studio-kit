import { Background, BackgroundProps } from './../core/sources/Background'
import { sourceTypes } from './../compositor/sources'
import { Overlay, OverlayProps } from './../core/sources/Overlays'
import { getElementAttributes } from './../logic'
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

import { CoreContext } from '../core/context'
import { getProject, getProjectRoom, toBaseProject } from '../core/data'
import { SDK, Compositor } from '../core/namespaces'
import { Disposable } from '../core/types'
import { Track } from 'livekit-client'

import LayoutName = Compositor.Layout.LayoutName
import { Banner, BannerSource, BannerProps } from '../core/sources/Banners'
import { generateId } from '../logic'
export type { LayoutName }
export type { Banner, BannerSource }

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

// Local cache to track participants being added
const addingCache = {
  camera: new Set<string>(),
  screen: new Set<string>(),
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
   * Get all banners stored on the project
   */
  getOverlays(): Overlay[]

  /**
   * Get all participants in the project
   * @private
   */
  getParticipants(room: SDK.Room): Compositor.SceneNode[]
  /**
   * play video overlay on foreground
   * @private
   */
  // autoPlayVideoOverlay(
  //   overlayId: string,
  //   attributes: HTMLVideoElementAttributes,
  // ): void

  // /**
  //  * play background Video
  //  * @private
  //  */
  // autoPlayBackgroundVideo(attributes?: HTMLVideoElementAttributes): void
  /**
   * Set the active layout and associated layoutProps
   */
  setLayout(layout: LayoutName, layoutProps: LayoutProps): void
  /**
   * Get background media, it can be video or image
   */
  getBackgroundMedia(type? : string): string
  /**
   * Get the active background image
   */
  getBackgroundVideo(): string
  /**
   * Get the active background image
   */
  getBackgroundImage(): string
  /**
   * Set the active background image
   */
  setBackgroundImage(backgroundId: string, props: BackgroundProps): void

  /**
   * Set the active background image
   */
  setBackgroundVideo(
    backgroundId: string,
    props: BackgroundProps & HTMLVideoElementAttributes,
  ): void

  /**
   * Get the active foreground overlay
   */
  getImageOverlay(): string | string[]
  /**
   * Get the active foreground overlay
   */
  getVideoOverlay(): string | string[]
  /**
   * Set the active foreground overlay
   */
  addImageOverlay(overlayId: string, props: OverlayProps): Promise<void>
  /**
   * set image overlay on foreground layer
   */
  addVideoOverlay(
    overlayId: string,
    props: OverlayProps & HTMLVideoElementAttributes,
  ): Promise<void>

  /**
   * remove image overlay from foreground layer
   */
  removeVideoOverlay(overlayId: string): Promise<void>

  /**
   * remove image overlay from foreground layer
   */
  removeImageOverlay(overlayId: string): Promise<void>

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
   * @private
   * @deprecated Use addParticipant() with parameter `type`
   */
  addParticipantScreenshare(
    participantId: string,
    props: Partial<ParticipantProps>,
  ): Promise<void>
  /**
   * Remove a stream participant from the stream canvas.
   */
  removeParticipant(participantId: string, type: ParticipantType): void
  /**
   * @private
   * @deprecated Use removeParticipant() with parameter `type`
   */
  removeParticipantScreenshare(participantId: string): void
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

  const coreProject = getProject(_project.id)

  let bannerContainer = foreground?.children?.find(
    (x) => x.props.id === 'fg-banners',
  )

  const ensureForegroundContainers = async () => {
    const ensureBannerContainer = async () => {
      if (!bannerContainer) {
        const nodeId = await coreProject.compositor.insert({
          name: 'BannerContainer',
          id: 'fg-banners',
          layout: 'Column',
          layoutProps: {
            cover: true,
          },
        }, foreground.id)
        bannerContainer = foreground?.children?.find(x => x.props.id === nodeId)
        return nodeId
      } else {
        return bannerContainer.id
      }
    }

    // const ensureForegroundImageContainer = async () => {
    //   if (!foregroundImageContainer) {
    //     const nodeId = await coreProject.compositor.insert({
    //         name: 'ImageOverlay',
    //         id: 'fg-image',
    //         layout: 'Free',
    //       }, foreground.id)

    //     foregroundImageContainer = foreground?.children?.find(x => x.props.id === nodeId)
    //     return nodeId
    //   } else {
    //     return foregroundImageContainer.id
    //   }
    // }


    // const ensureForegroundVideoContainer = async () => {
    //   if (!foregroundVideoContainer) {
    //     const nodeId = await coreProject.compositor.insert({
    //         name: 'VideoOverlay',
    //         id: 'fg-video',
    //         layout: 'Free',
    //       }, foreground.id)
    //     foregroundVideoContainer = foreground?.children?.find(x => x.props.id === nodeId)
    //     return nodeId
    //   } else {
    //     return foregroundVideoContainer.id
    //   }
    // }

    // const baseForegroundLayers = await Promise.all([
    //   ensureBannerContainer(),
    //   ensureForegroundImageContainer(),
    //   ensureForegroundVideoContainer(),
    // ])
    // await coreProject.compositor.reorder(foreground.id, baseForegroundLayers)
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

    getOverlays() {
      return (getProject(_project.id).props.overlays || []) as Overlay[]
    },

    getParticipants(room: SDK.Room) {
      return content.children.filter((node) => {
        if (node.props.sourceType !== 'RoomParticipant') return false
        return true
      })
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
    setActiveBanner(id: string) {
      const existingBanners = commands.getBanners()
      const banner = existingBanners?.find((x) => x.id === id)
      bannerContainer?.children?.forEach((x) => {
        CoreContext.Command.deleteNode({
          nodeId: x.id,
        })
      })
      if (!banner) return
      return CoreContext.Command.createNode({
        parentId: bannerContainer?.id,
        props: {
          sourceType: 'Banner',
          bannerId: banner.id,
        },
      })
    },

    getActiveBanner(): string | null {
      return bannerContainer.children?.[0]?.props?.bannerId ?? null
    },

    getImageOverlay(): string | string[] {
      const existingImageOverlays = CoreContext.compositor
        .getSources('Overlay')
        .filter((x) => x.props.type === 'image-overlay')
      const foregroundImageIds = existingImageOverlays.map((f) => f?.id)
      return foregroundImageIds.length > 1
        ? foregroundImageIds
        : foregroundImageIds[0]
    },

    getVideoOverlay(): string | string[] {
      const existingVideoOverlays = CoreContext.compositor
        .getSources('Overlay')
        .filter((x) => x.props.type === 'video-overlay')
      const foregroundVideoIds = existingVideoOverlays.map((f) => f?.id)
      return foregroundVideoIds.length > 1
        ? foregroundVideoIds
        : foregroundVideoIds[0]
    },

    async removeImageOverlay(overlayId: string) {
      // find overlay node by id
      const existingOverlays = commands.getOverlays()

      return Command.updateProjectProps({
        projectId,
        props: {
          overlays: existingOverlays.filter((x) => x.id !== overlayId),
        },
      })
    },

    async removeVideoOverlay(overlayId: string) {
      // find overlay node by id
      const existingOverlays = commands.getOverlays()
      const reamningOverlays = existingOverlays.filter(
        (x) => x.id !== overlayId,
      )

      // get all children of the overlay node and update their opacity attributes
      const allForegroundOverlays = reamningOverlays.filter(
        (f) => f.props.type !== 'video-overlay',
      )

      allForegroundOverlays.forEach((overlay) => {
        overlay.props.meta = {
          style: { opacity: 1 },
        }
      })

      Command.updateProjectProps({
        projectId,
        props: {
          overlays: allForegroundOverlays,
        },
      })
    },

    async addImageOverlay(overlayId: string, props: OverlayProps = {}) {
      const existingOverlays = commands.getOverlays()

      const overlay = existingOverlays.find((x) => x.id === overlayId)

      if (overlay) {
        const overlayIndex = existingOverlays.findIndex(
          (x) => x.id === overlayId,
        )
        existingOverlays.splice(overlayIndex, 1, overlay)
        return Command.updateProjectProps({
          projectId,
          props: {
            overlays: existingOverlays,
          },
        })
      }

      const vidOverlay = existingOverlays.find(
        (x) => x.props.type === 'video-overlay',
      )
      const meta = props.meta || {}

      const newOverlay = {
        id: overlayId,
        props: {
          ...props,
          type: 'image-overlay',
          meta: {
            ...meta,
            ...{ ...(vidOverlay && { style: { opacity: 0 } }) },
          },
        },
      }

      const nonImageOverlays = existingOverlays.filter(
        (x) => x.props.type !== 'image-overlay',
      )

      Command.updateProjectProps({
        projectId,
        props: {
          overlays: [...nonImageOverlays, newOverlay],
        },
      })
    },

    async addVideoOverlay(
      overlayId: string,
      props: OverlayProps & HTMLVideoElementAttributes = {},
    ) {
      const existingOverlays = commands.getOverlays()
      const overlay = existingOverlays.find((x) => x.id === overlayId)

      if (overlay) {
        const overlayIndex = existingOverlays.findIndex(
          (x) => x.id === overlayId,
        )
        existingOverlays.splice(overlayIndex, 1, overlay)
        return Command.updateProjectProps({
          projectId,
          props: {
            overlays: existingOverlays,
          },
        })
      }

      // get all children of the overlay node and update their opacity attributes
      const allForegroundOverlays = existingOverlays.filter(
        (f) => f.props.type !== 'video-overlay',
      )

      allForegroundOverlays.forEach((overlay) => {
        overlay.props.meta = {
          style: {
            opacity: 0,
          },
        }
      })

      const meta = props.meta || {}

      const newOverlay = {
        id: overlayId,
        props: {
          ...props,
          type: 'video-overlay',
          meta,
        },
      }

      Command.updateProjectProps({
        projectId,
        props: {
          overlays: [...allForegroundOverlays, newOverlay],
        },
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

    getBackgroundMedia(type?: string) {
      const backgroundMedia = CoreContext.compositor.getSources('Background')
      const backgroundMediaIds = type
        ? backgroundMedia.filter((x) => x.props.type === type).map((x) => x.id)
        : backgroundMedia.map((x) => x.id)
      return backgroundMediaIds[0];
    },

    getBackgroundImage() {
      return commands.getBackgroundMedia('image-background')
    },

    getBackgroundVideo() {
      return commands.getBackgroundMedia('video-background')
    },

    async setBackgroundImage(
      backgroundId: string,
      props: BackgroundProps = {},
    ) {
      const exisitingBackground = (getProject(_project.id).props.background ||
        null) as Background
      if (exisitingBackground) {
        if (exisitingBackground.id === backgroundId) {
          return Command.updateProjectProps({
            projectId,
            props: {
              background: exisitingBackground,
            },
          })
        }
      }

      const meta = props.meta || {}

      const newBackground = {
        id: backgroundId,
        props: {
          ...props,
          type: 'image-background',
          meta,
        },
      }

      Command.updateProjectProps({
        projectId,
        props: {
          background: newBackground,
        },
      })
    },

    async setBackgroundVideo(
      backgroundId: string,
      props: BackgroundProps & HTMLVideoElementAttributes = {},
    ) {
      const exisitingBackground = (getProject(_project.id).props.background ||
        null) as Background
      if (exisitingBackground) {
        if (exisitingBackground.id === backgroundId) {
          return Command.updateProjectProps({
            projectId,
            props: {
              background: exisitingBackground,
            },
          })
        }
      }

      const meta = props.meta || {}

      const newBackground = {
        id: backgroundId,
        props: {
          ...props,
          type: 'video-background',
          meta,
        },
      }

      Command.updateProjectProps({
        projectId,
        props: {
          background: newBackground,
        },
      })
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
    addParticipantScreenshare(
      participantId: string,
      props: Partial<ParticipantProps> = {},
    ) {
      return commands.addParticipant(participantId, props, 'screen')
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
    removeParticipantScreenshare(participantId: string) {
      return commands.removeParticipant(participantId, 'screen')
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
          // If the participant is not in the room, remove the node
          if (!nodeParticipant) return true

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
  }

  // beforeInit(commands)
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
) => {
  return CoreContext.Command.createProject({
    settings,
    props,
  }) as Promise<ScenelessProject>
}

// export const beforeInit = (commands: Commands) => {
//   /** autoPlay last applied video overlay on refresh */
//   const videoOverLay = commands.getVideoOverlay() as string

//   if (videoOverLay) {
//     commands.autoPlayVideoOverlay(videoOverLay, {
//       muted: true,
//       autoplay: true,
//     })
//   }

//   /** autoPlay last applied video background on refresh */
//   const backgroundVideo = commands.getBackgroundVideo()
//   if (backgroundVideo) {
//     commands.autoPlayBackgroundVideo({
//       muted: true,
//       autoplay: true,
//     })
//   }
// }
/** @private */
export const createCompositor = async (
  layoutId: string,
  size: { x: number; y: number },
  settings: ScenelessSettings,
) => {
  const { backgroundImage, layout, layoutProps = {} } = settings

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
        layout: 'Free',
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
        layout: 'Free',
      },
      root.id,
    ),
  ])
  await project.reorder(root.id, baseLayers)

  const foreground = root.children.find((x) => x.props.id === 'foreground')

  const baseForegroundLayers = await Promise.all([
    project.insert(
      {
        name: 'ImageOverlay',
        sourceType: 'Image',
        // this will enable to register a transfrom on another source
        // doing so will enable to resume source
        proxySource: 'Overlay',
        id: 'image-overlay',
        layout: 'Free',
        style: {
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        },
      },
      foreground.id,
    ),
    project.insert(
      {
        name: 'BannerContainer',
        id: 'fg-banners',
        // NOTE: This is not ideal - currently only using layout
        //  "Column" for its built-in animations
        layout: 'Column',
        layoutProps: {
          cover: true,
        },
      },
      foreground.id,
    ),
    project.insert(
      {
        name: 'VideoOverlay',
        layout: 'Free',
        sourceType: 'Video',
        // this will enable to register a transfrom on another source
        // doing so will enable to resume source
        proxySource: 'Overlay',
        id: 'video-overlay',
        style: {
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        },
      },
      foreground.id,
    ),
  ])

  await project.reorder(foreground.id, baseForegroundLayers)

  const background = root.children.find((x) => x.props.id === 'bg')

  const baseBackgroundLayers = await Promise.all([
    project.insert(
      {
        name: 'ImageBackground',
        sourceType: 'Image',
        proxySource: 'Background',
        id: 'image-background',
        layout: 'Free',
        src: backgroundImage,
        style: {
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        },
      },
      background.id,
    ),
    project.insert(
      {
        name: 'VideoBackground',
        sourceType: 'Video',
        proxySource: 'Background',
        id: 'video-background',
        layout: 'Free',
        style: {
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        },
      },
      background.id,
    ),
  ])

  await project.reorder(background.id, baseBackgroundLayers)

  return project
}
