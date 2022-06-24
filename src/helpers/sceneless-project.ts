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
import { getProject, getProjectRoom } from '../core/data'
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

interface ScenelessProject extends SDK.Project { }

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
  getParticipants(room: SDK.Room): Compositor.SceneNode[]
  /**
   * play video overlay on foreground
   * @private
  */
  autoPlayVideoOverlay(overlayId: string, attributes: HTMLVideoElementAttributes): void

  /**
    * play background Video
    * @private
  */
  autoPlayBackgroundVideo(
    attributes?: HTMLVideoElementAttributes,
  ): void
  /**
   * Set the active layout and associated layoutProps
   */
  setLayout(layout: LayoutName, layoutProps: LayoutProps): void
  /**
   * Get background media, it can be video or image
   */
  getBackgroundMedia(): string
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
  setBackgroundImage(src: string): void

  /**
   * Set the active background image
   */
  setBackgroundVideo(src: string, attributes?: HTMLVideoElementAttributes): void

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
  addImageOverlay(overlayId: string, src: string): Promise<void>
  /**
   * set image overlay on foreground layer
   */
  addVideoOverlay(
    overlayId: string,
    src: string,
    attributes?: HTMLVideoElementAttributes,
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
export const commands = (project: ScenelessProject) => {
  const root = project.scene.getRoot()
  const { Command } = CoreContext

  const background = root.children.find((x) => x.props.id === 'bg')
  const content = root.children.find((x) => x.props.id === 'content')
  const foreground = root.children.find((x) => x.props.id === 'foreground')
  const bannerContainer = foreground.children.find(
    (x) => x.props.id === 'fg-banners',
  )
  const foregroundImageContainer = foreground.children.find(
    (x) => x.props.id === 'fg-image',
  )
  const foregroundVideoContainer = foreground.children.find(
    (x) => x.props.id === 'fg-video',
  )

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
      return (getProject(project.id).props.banners || []) as Banner[]
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

      const existingBanners = (getProject(project.id).props.banners ||
        []) as Banner[]
      return Command.updateProjectProps({
        projectId: project.id,
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
        projectId: project.id,
        props: {
          banners,
        },
      })
    },
    removeBanner(id: string) {
      const existingBanners = commands.getBanners()
      // Remove dependent nodes from stream
      bannerContainer.children.forEach((x) => {
        if (x.id !== id) return
        CoreContext.Command.deleteNode({
          nodeId: x.id,
        })
      })

      return Command.updateProjectProps({
        projectId: project.id,
        props: {
          banners: existingBanners.filter((x) => x.id !== id),
        },
      })
    },
    setActiveBanner(id: string) {
      const existingBanners = commands.getBanners()
      const banner = existingBanners.find((x) => x.id === id)
      bannerContainer.children.forEach((x) => {
        CoreContext.Command.deleteNode({
          nodeId: x.id,
        })
      })
      if (!banner) return
      return CoreContext.Command.createNode({
        parentId: bannerContainer.id,
        props: {
          sourceType: 'Banner',
          bannerId: banner.id,
        },
      })
    },

    getImageOverlay(): string | string[] {
      const foregroundImageIds = foregroundImageContainer.children.map(
        (x) => x?.props?.sourceProps?.id,
      )
      return foregroundImageIds.length > 1
        ? foregroundImageIds
        : foregroundImageIds[0]
    },

    getVideoOverlay(): string | string[] {
      const foregroundVideoIds = foregroundVideoContainer.children.map(
        (x) => x?.props?.sourceProps?.id,
      )
      return foregroundVideoIds.length > 1
        ? foregroundVideoIds
        : foregroundVideoIds[0]
    },

    autoPlayBackgroundVideo(attributes: HTMLVideoElementAttributes = {
      muted: true,
      autoplay: true
    }) {
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
        muted: true, autoplay: true
      },
    ) {
      // find overlay node by id
      const overlay = foregroundVideoContainer.children.find(
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

    async removeImageOverlay(overlayId: string) {
      // find overlay node by id
      const overlay = foregroundImageContainer.children.find(
        (x) => x.props?.sourceProps?.id === overlayId,
      )
      // if overlay exists, remove it
      if (overlay) {
        CoreContext.Command.deleteNode({
          nodeId: overlay.id,
        })
      }
    },

    async removeVideoOverlay(overlayId: string) {
      // find overlay node by id
      const overlay = foregroundVideoContainer.children.find(
        (x) => x.props?.sourceProps?.id === overlayId,
      )

      // if overlay exists, remove it
      if (overlay) {
        CoreContext.Command.deleteNode({
          nodeId: overlay.id,
        })
      }

      // get all children of the overlay node and update their opacity attributes
      const allForegroundChildrens = foreground.children.filter(
        (f) => f.props.id !== 'fg-video',
      )
      allForegroundChildrens.forEach((nodes) => {
        nodes.children.forEach((node) => {
          if (node.props?.fields?.style?.opacity === 0) {
            node.props.fields.style.opacity = 1
            CoreContext.Command.updateNode({
              nodeId: node.id,
              props: {
                ...node.props,
              },
            })
          }
        })
      })

    },

    async addImageOverlay(overlayId: string, src: string) {
      // Get the image overlay node from the foreground layer
      const imageOverlay = foregroundImageContainer.children.find(
        (x) => x.props.id === 'img-overlay',
      )

      // if the overlayid matches the image overlay id passed, return
      if (imageOverlay && imageOverlay?.props?.sourceProps?.id === overlayId) {
        return
      }

      //set the source of the image overlay node to the image src
      let imageProps = {
        id: 'img-overlay',
        sourceType: 'Element',
        sourceProps: {
          type: 'image',
          id: overlayId,
        },
        tagName: 'img',
        attributes: {
          src,
        },
        fields: {
          style: {
            transition: 'opacity 300ms ease 0ms, transform, width, height',
            '-webkit-transition':
              'opacity 300ms ease 0ms, transform, width, height',
            opacity: 1,
            objectFit: 'cover',
          },
        },
      }
      // get video overlay node from the foreground layer
      const vidOverlay = foregroundVideoContainer.children.find(
        (x) => x.props.id === 'vid-overlay',
      )

      // if the video overlay node exists, change the image overlay node to opacity 0
      if (vidOverlay) {
        imageProps.fields.style.opacity = 0
      }

      // If the overlay doesn't exist, create it
      if (!imageOverlay) {
        await CoreContext.Command.createNode({
          props: imageProps,
          parentId: foregroundImageContainer.id,
          index: foregroundImageContainer.children.length,
        })
      } else {
        // Otherwise, update the overlay node
        CoreContext.Command.updateNode({
          nodeId: imageOverlay.id,
          props: {
            ...imageOverlay.props,
            ...imageProps,
          },
        })
      }
    },

    async addVideoOverlay(
      overlayId: string,
      src: string,
      attributes: HTMLVideoElementAttributes = {
        playsinline: true,
        disablepictureinpicture: true,
        autoplay: true,
      },
    ) {
      // Get the video overlay node from the foreground layer
      const videoOverlay = foregroundVideoContainer.children.find(
        (x) => x.props.id === 'vid-overlay',
      )

      // if the video overlay node exists, and the overlay id matches the overlay id passed in, return
      if (videoOverlay && videoOverlay?.props?.sourceProps?.id === overlayId) {
        return
      }

      //set the source of the video overlay node to the src
      let videoProps = {
        id: 'vid-overlay',
        sourceType: 'LS-Video',
        sourceProps: {
          type: 'video',
          id: overlayId,
        },
        tagName: 'video',
        attributes: {
          ...attributes,
          src,
          id : overlayId
        },
      }

      // get all children of the overlay node and update their opacity attributes
      const allForegroundChildrens = foreground.children.filter(
        (f) => f.props.id !== 'fg-video',
      )
      allForegroundChildrens.forEach((nodes) => {
        nodes.children.forEach((node) => {
          if (node.props?.fields?.style?.opacity === 1) {
            node.props.fields.style.opacity = 0
            CoreContext.Command.updateNode({
              nodeId: node.id,
              props: {
                ...node.props,
              },
            })
          }
        })
      })

      // If the overlay doesn't exist, create it
      if (!videoOverlay) {
        await CoreContext.Command.createNode({
          props: videoProps,
          parentId: foregroundVideoContainer.id,
          index: foregroundVideoContainer.children.length,
        })
      } else {
        // Otherwise, update the overlay node
        CoreContext.Command.updateNode({
          nodeId: videoOverlay.id,
          props: {
            ...videoOverlay.props,
            ...videoProps,
          },
        })
      }
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

    getBackgroundMedia() {
      const backgroundChild = background.children.filter((x) => x)
      return backgroundChild[0]?.props?.attributes?.src
    },

    getBackgroundImage() {
      const backgroundChild = background.children.filter(
        (x) => x.props.id === 'bg-image',
      )
      return backgroundChild[0]?.props?.attributes?.src
    },

    getBackgroundVideo() {
      const backgroundChild = background.children.filter(
        (x) => x.props.id === 'bg-video',
      )
      return backgroundChild[0]?.props?.attributes?.src
    },

    async setBackgroundImage(src: string) {
      const backgroundImage = background.children.find(
        (x) => x.props.id === 'bg-image',
      )

      // if the video overlay node exists, and the overlay id matches the overlay id passed in, return
      if (backgroundImage && backgroundImage?.props?.attributes?.src === src) {
        return
      }

      const backgroundVideo = background.children.find(
        (x) => x.props.id === 'bg-video',
      )

      if (backgroundVideo) {
        CoreContext.Command.deleteNode({
          nodeId: backgroundVideo.id,
        })
      }

      if (!backgroundImage) {
        await CoreContext.Command.createNode({
          props: {
            name: 'ImageBackground',
            id: 'bg-image',
            tagName: 'img',
            sourceType: 'Element',
            attributes: {
              src,
            },
          },
          parentId: background.id,
          index: background.children.length,
        })
      } else {
        CoreContext.Command.updateNode({
          nodeId: backgroundImage.id,
          props: {
            attributes: {
              ...backgroundImage.props.attributes,
              src,
            },
          },
        })
      }
    },

    async setBackgroundVideo(
      src: string,
      attributes: HTMLVideoElementAttributes = {
        loop: true,
        autoplay: true,
      },
    ) {
      const backgroundVideo = background.children.find(
        (x) => x.props.id === 'bg-video',
      )

      // if the video overlay node exists, and the overlay id matches the overlay id passed in, return
      if (backgroundVideo && backgroundVideo?.props?.attributes?.src === src) {
        return
      }

      const backgroundImage = background.children.find(
        (x) => x.props.id === 'bg-image',
      )

      if (backgroundImage) {
        CoreContext.Command.deleteNode({
          nodeId: backgroundImage.id,
        })
      }

      if (!backgroundVideo) {
        await CoreContext.Command.createNode({
          props: {
            name: 'VideoBackground',
            id: 'bg-video',
            sourceType: 'LS-Video',
            attributes: {
              ...attributes,
              src,
            },
          },
          parentId: background.id,
          index: background.children.length,
        })
      } else {
        CoreContext.Command.updateNode({
          nodeId: backgroundVideo.id,
          props: {
            attributes: {
              ...backgroundVideo.props.attributes,
              ...attributes,
              src,
            },
          },
        })
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
      await CoreContext.Command.createNode({
        props: {
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
        index: content.children.length,
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
        participantNode = commands.getParticipantNode(participantId)
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
      const room = getProjectRoom(project.id)
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
      return project.props[prop]
    },
    setProp(prop, val) {
      return Command.updateProjectProps({
        projectId: project.id,
        props: {
          [prop]: val,
        },
      })
    },
    useProp(prop, cb) {
      return CoreContext.on('ProjectChanged', (payload) => {
        if (project.id === payload.project.id) {
          cb(payload.project.props[prop])
        }
      })
    },
  }


  beforeInit(commands);
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

export const beforeInit = (commands : Commands) =>{
  /** autoPlay last applied video overlay on refresh */
  const videoOverLay = commands.getVideoOverlay() as string;

  if (videoOverLay) {
    commands.autoPlayVideoOverlay(videoOverLay, {
      muted: true,
      autoplay: true
    });
  }

  /** autoPlay last applied video background on refresh */
  const backgroundVideo = commands.getBackgroundVideo();
  if (backgroundVideo) {
    commands.autoPlayBackgroundVideo({
      muted: true,
      autoplay: true
    })
  }
}
/** @private */
export const createCompositor = async (
  layoutId: string,
  size: { x: number; y: number },
  settings: ScenelessSettings,
) => {
  const {
    backgroundImage,
    layout,
    layoutProps = {},
  } = settings

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
        id: 'fg-image',
        layout: 'Free',
      },
      foreground.id,
    ),
    project.insert(
      {
        name: 'BannerContainer',
        id: 'fg-banners',
        layout: 'Column',
        layoutProps: {
          reverse: true,
        },
      },
      foreground.id,
    ),
    project.insert(
      {
        name: 'VideoOverlay',
        id: 'fg-video',
        layout: 'Free',
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
        id: 'bg-image',
        tagName: 'img',
        sourceType: 'Element',
        attributes: {
          src: backgroundImage,
        },
      },
      background.id,
    ),
  ])

  await project.reorder(background.id, baseBackgroundLayers)

  return project
}
