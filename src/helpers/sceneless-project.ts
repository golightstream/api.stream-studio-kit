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
import { LogoProps } from './../core/sources/Logo'
import { Background, BackgroundProps } from './../core/sources/Background'
import { Overlay, OverlayProps } from './../core/sources/Overlays'
import { CoreContext } from '../core/context'
import { getProject, getProjectRoom } from '../core/data'
import { SDK, Compositor } from '../core/namespaces'
import { Disposable, SceneNode } from '../core/types'
import { Track } from 'livekit-client'
import { Banner, BannerSource, BannerProps } from '../core/sources/Banners'
import { RoomParticipantSource } from '../core/sources/WebRTC'
import { generateId } from '../logic'
import { ChatOverlayProps } from '../core/transforms/ChatOverlay'

import LayoutName = Compositor.Layout.LayoutName

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

  removeLogo(id: string): void

  addLogo(id: string, logo: LogoProps): void

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
   * @deprecated Use getBackgroundMedia2() instead with type
   */
  getBackgroundMedia(): string
  /**
   * Get the active background image
   */
  /**
   * Set the active background image
   * @deprecated Use setBackgroundImage2() instead with id
   */
  setBackgroundImage(src: string): void

  /**
   * Set the active background video
   * @deprecated Use setBackgroundVideo2() instead with id
   */
  setBackgroundVideo(src: string, attributes?: HTMLVideoElementAttributes): void

  /**
   * set image overlay on foreground layer
   * @deprecated Use addImageOverlay2() instead
   */
  addImageOverlay(overlayId: string, src: string): Promise<void>
  /**
   * set video overlay on foreground layer
   * @deprecated Use addVideoOverlay2() instead
   */
  addVideoOverlay(
    overlayId: string,
    src: string,
    attributes?: HTMLVideoElementAttributes,
  ): Promise<void>

  /**
   * remove the active video overlay
   * @deprecated Use removeVideoOverlay2() instead
   */
  removeVideoOverlay(overlayId: string): Promise<void>
  /**
   * remove the active image overlay
   * @deprecated Use removeImageOverlay2() instead
   */
  removeImageOverlay(overlayId: string): Promise<void>
  /**
   * Get the active image overlay
   * @deprecated Use getImageOverlay2() instead
   */
  getImageOverlay(): string | string[]
  /**
   * Get the active video overlay
   * @deprecated Use getVideoOverlay2() instead
   */
  getVideoOverlay(): string | string[]
  /**
   * Get the active background image
   * @deprecated Use getBackgroundImage2() instead
   */
  getBackgroundImage(): string
  /**
   * Get the active background video
   * @deprecated Use getBackgroundVideo2() instead
   */
  getBackgroundVideo(): string

  getBackgroundMedia2(type?: string): string
  /**
   * Get the active background video
   */
  getBackgroundVideo2(): string
  /**
   * Get the active background image
   */
  getBackgroundImage2(): string
  /**
   * Set the active background image
   */
  setBackgroundImage2(backgroundId: string, props: BackgroundProps): void

  /**
   * Set the active background video
   */
  setBackgroundVideo2(
    backgroundId: string,
    props: BackgroundProps & HTMLVideoElementAttributes,
  ): void

  /**
   * Get the active foreground image overlay
   */
  getCustomOverlay(): string | string[]
  /**
   * Get the active foreground image overlay
   */
  getImageOverlay2(): string | string[]
  /**
   * Get the active foreground video overlay
   */
  getVideoOverlay2(): string | string[]
  /**
   * Set the active foreground image overlay
   */
  addImageOverlay2(overlayId: string, props: OverlayProps): Promise<void>
  /**
   * set image overlay on foreground video layer
   */
  addVideoOverlay2(
    overlayId: string,
    props: OverlayProps & HTMLVideoElementAttributes,
  ): Promise<void>

  /**
   * add html overlay
   */
  addCustomOverlay(overlayId: string, props: OverlayProps): Promise<void>
  /**
   * remove video overlay from foreground layer
   */
  removeCustomOverlay(overlayId: string): Promise<void>
  /**
   * remove video overlay from foreground layer
   */
  removeVideoOverlay2(overlayId: string): Promise<void>

  /**
   * remove image overlay from foreground layer
   */
  removeImageOverlay2(overlayId: string): Promise<void>

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
  let backgroundVideoContainer = background?.children?.find(
    (x) => x.props.id === 'video-background',
  )

  let backgroundContainer = background?.children?.find(
    (x) => x.props.id === 'bg-image',
  )

  let backgroundImageContainer = background?.children?.find(
    (x) => x.props.id === 'image-background',
  )
  let foregroundImageContainer = foreground?.children?.find(
    (x) => x.props.id === 'fg-image',
  )

  let foregroundImageContainer2 = foreground?.children?.find(
    (x) => x.props.id === 'image-overlay',
  )

  let foregroundOverlayContainer = foreground?.children?.find(
    (x) => x.props.id === 'iframe-overlay',
  )

  let foregroundVideoContainer2 = foreground?.children?.find(
    (x) => x.props.id === 'video-overlay',
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
        bannerContainer = foreground?.children?.find(
          (x) => x.props.id === nodeId,
        )
        return nodeId
      } else {
        return bannerContainer.id
      }
    }
    const ensureForegroundImageContainer = async () => {
      if (!foregroundImageContainer) {
        const nodeId = await coreProject.compositor.insert(
          {
            name: 'ImageOverlay',
            id: 'fg-image',
            layout: 'Free',
          },
          foreground.id,
        )

        foregroundImageContainer = foreground?.children?.find(
          (x) => x.props.id === nodeId,
        )
        return nodeId
      } else {
        return foregroundImageContainer.id
      }
    }

    const ensureForegroundImageContainer2 = async () => {
      if (!foregroundOverlayContainer) {
        const nodeId = await coreProject.compositor.insert(
          {
            name: 'Overlay',
            sourceType: 'Overlay',
            id: 'overlay',
            layout: 'Free',
            style: {
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            },
          },
          foreground.id,
        )

        foregroundOverlayContainer = foreground?.children?.find(
          (x) => x.props.id === nodeId,
        )
        return nodeId
      } else {
        return foregroundOverlayContainer.id
      }
    }

    const ensureForegroundVideoContainer2 = async () => {
      if (!foregroundVideoContainer2) {
        const nodeId = await coreProject.compositor.insert(
          {
            name: 'VideoOverlay2',
            sourceType: 'Video2',
            // this will enable to register a transfrom on another source
            // doing so will enable to resume source
            proxySource: 'Overlay',
            id: 'video-overlay',
            layout: 'Free',
            style: {
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            },
          },
          foreground.id,
        )

        foregroundVideoContainer2 = foreground?.children?.find(
          (x) => x.props.id === nodeId,
        )
        return nodeId
      } else {
        return foregroundVideoContainer2.id
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
          (x) => x.props.id === nodeId,
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
          (x) => x.props.id === nodeId,
        )
        return nodeId
      } else {
        return foregroundLogoContainer.id
      }
    }

    const ensureBackgroundContainer = async () => {
      if (!backgroundContainer) {
        const nodeId = await coreProject.compositor.insert(
          {
            name: 'ImageBackground',
            id: 'bg-image',
            tagName: 'img',
            sourceType: 'Element',
            attributes: {
              src: '',
            },
            fields: {
              style: {
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: 0
              },
            },
          },
          background.id,
        )
        backgroundContainer = background?.children?.find(
          (x) => x.props.id === nodeId,
        )
        return nodeId
      } else {
        return backgroundContainer.id
      }
    }

    const ensureBackgroundImageContainer = async () => {
      if (!backgroundImageContainer) {
        const nodeId = await coreProject.compositor.insert(
          {
            name: 'ImageBackground2',
            sourceType: 'Image2',
            proxySource: 'Background',
            id: 'image-background',
            layout: 'Free',
            src: '',
            style: {
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            },
          },
          background.id,
        )
        backgroundImageContainer = background?.children?.find(
          (x) => x.props.id === nodeId,
        )
        return nodeId
      } else {
        return backgroundImageContainer.id
      }
    }

    const ensureBackgroundVideoContainer = async () => {
      if (!backgroundVideoContainer) {
        const nodeId = await coreProject.compositor.insert(
          {
            name: 'VideoBackground',
            sourceType: 'Video2',
            proxySource: 'Background',
            id: 'video-background',
            layout: 'Free',
            style: {
              width: '100%',
              height: '100%',
              position: 'absolute',
              objectFit: 'cover',
            },
          },
          background.id,
        )
        backgroundVideoContainer = background?.children?.find(
          (x) => x.props.id === nodeId,
        )
        return nodeId
      } else {
        return backgroundVideoContainer.id
      }
    }
    try {
      const baseForegroundLayers = await Promise.all([
        ensureBannerContainer(),
        ensureForegroundImageContainer(),
        ensureForegroundImageContainer2(),
        ensureForegroundVideoContainer(),
        ensureForegroundVideoContainer2(),
        ensureForegroundLogoContainer(),
      ])

      await coreProject.compositor.reorder(foreground.id, baseForegroundLayers)

      const baseBackgroundLayers = await Promise.all([
        ensureBackgroundContainer(),
        ensureBackgroundImageContainer(),
        ensureBackgroundVideoContainer(),
      ])

      await coreProject.compositor.reorder(background.id, baseBackgroundLayers)
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

    getOverlays() {
      return (getProject(_project.id).props.overlays || []) as Overlay[]
    },

    getParticipants() {
      return content.children.filter((node) => {
        if (node.props.sourceType !== 'RoomParticipant') return false
        return true
      })
    },

    getLogo() {
      return commands.getProp('logo')?.id
    },

    removeLogo() {
      return commands.setProp('logo', null)
    },

    getImageOverlay(): string | string[] {
      const foregroundImageIds =
        foregroundImageContainer?.children?.map(
          (x) => x?.props?.sourceProps?.id,
        ) ?? []
      return foregroundImageIds.length > 1
        ? foregroundImageIds
        : foregroundImageIds[0]
    },

    getVideoOverlay(): string | string[] {
      const foregroundVideoIds =
        foregroundVideoContainer?.children?.map(
          (x) => x?.props?.sourceProps?.id,
        ) ?? []
      return foregroundVideoIds.length > 1
        ? foregroundVideoIds
        : foregroundVideoIds[0]
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
      const overlay = foregroundVideoContainer?.children?.find(
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
      const vidOverlay = foregroundVideoContainer?.children?.find(
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
      const videoOverlay = foregroundVideoContainer?.children?.find(
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
          id: overlayId,
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
            fields: {
              style: {
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: 1,
              },
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
            fields: {
              style: {
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              },
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
    addLogo(logoId: string, props: LogoProps) {
      const exisitingLogo = (getProject(_project.id).props.logo ||
        null) as Background
      if (exisitingLogo) {
        if (exisitingLogo.id === logoId) {
          return Command.updateProjectProps({
            projectId,
            props: {
              logo: exisitingLogo,
            },
          })
        }
      }

      const meta = props.meta || { style: { height: '100%', width: '100%' } }

      const newLogo = {
        id: logoId,
        props: {
          ...props,
          type: 'logo',
          meta,
        },
      }

      Command.updateProjectProps({
        projectId,
        props: {
          logo: newLogo,
        },
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
        return CoreContext.Command.createNode({
          parentId: bannerContainer?.id,
          props: {
            sourceType: 'ChatOverlay',
            chatOverlayId: id,
            id,
            ...options,
          },
        })
      } else {
        CoreContext.Command.updateNode({
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

    removeChatOverlay(id: string) {
      // Remove dependent nodes from stream
      bannerContainer?.children?.forEach((x) => {
        if (x.props.chatOverlayId !== id) return
        CoreContext.Command.deleteNode({
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

    getImageOverlay2(): string | string[] {
      const existingImageOverlays = CoreContext.compositor
        .getSources('Overlay')
        .filter((x) => x.props?.meta?.type === 'image-overlay')
      const foregroundImageIds = existingImageOverlays.map((f) => f?.id)
      return foregroundImageIds.length > 1
        ? foregroundImageIds
        : foregroundImageIds[0]
    },

    getVideoOverlay2(): string | string[] {
      const existingVideoOverlays = CoreContext.compositor
        .getSources('Overlay')
        .filter((x) => x.props.type === 'video-overlay')
      const foregroundVideoIds = existingVideoOverlays.map((f) => f?.id)
      return foregroundVideoIds.length > 1
        ? foregroundVideoIds
        : foregroundVideoIds[0]
    },

    getCustomOverlay(): string | string[] {
      const existingCustomOverlays = CoreContext.compositor
        .getSources('Overlay')
        .filter((x) => x.props?.meta?.type === 'html-overlay')
      const foregroundCustomOverlayIds = existingCustomOverlays.map(
        (f) => f?.id,
      )
      return foregroundCustomOverlayIds.length > 1
        ? foregroundCustomOverlayIds
        : foregroundCustomOverlayIds[0]
    },

    async removeCustomOverlay(overlayId: string) {
      // find overlay node by id
      const existingOverlays = commands.getOverlays()

      return Command.updateProjectProps({
        projectId,
        props: {
          overlays: existingOverlays.filter((x) => x.id !== overlayId),
        },
      })
    },

    async removeImageOverlay2(overlayId: string) {
      // find overlay node by id
      const existingOverlays = commands.getOverlays()

      return Command.updateProjectProps({
        projectId,
        props: {
          overlays: existingOverlays.filter((x) => x.id !== overlayId),
        },
      })
    },

    async removeVideoOverlay2(overlayId: string) {
      // find overlay node by id
      const existingOverlays = commands.getOverlays()
      const reamningOverlays = existingOverlays.filter(
        (x) => x.id !== overlayId,
      )

      // get all children of the overlay node and update their opacity attributes
      const allForegroundOverlays = reamningOverlays.filter(
        (f) => f.props.type !== 'video-overlay',
      )

      const newForegroundLayers = allForegroundOverlays.map((overlay) => {
        return {
          ...overlay,
          props: {
            ...overlay.props,
            meta: {
              ...overlay.props.meta,
              style: { opacity: 1 },
            },
          },
        }
      })

      Command.updateProjectProps({
        projectId,
        props: {
          overlays: newForegroundLayers,
        },
      })
    },

    async addCustomOverlay(overlayId: string, props: OverlayProps = {}) {
      const existingOverlays = commands.getOverlays()

      const overlay = existingOverlays.find((x) => x.id === overlayId)

      if (overlay) {
        const overlayIndex = existingOverlays.findIndex(
          (x) => x.id === overlayId,
        )
        if (overlayIndex > -1) {
          const shallowOverlays = JSON.parse(JSON.stringify(existingOverlays))

          shallowOverlays.splice(overlayIndex, 1, overlay)

          return Command.updateProjectProps({
            projectId,
            props: {
              overlays: shallowOverlays,
            },
          })
        }
      }

      const vidOverlay = existingOverlays.find(
        (x) => x.props.type === 'video-overlay',
      )
      const meta = props.meta || { type: 'html-overlay' }

      const newOverlay = {
        id: overlayId,
        props: {
          ...props,
          type: 'overlay',
          meta: {
            ...meta,
            ...{ ...(vidOverlay && { style: { opacity: 0 } }) },
          },
        },
      }

      const nonHTMLOverlays = existingOverlays.filter(
        (x) => x.props.type !== 'overlay',
      )

      Command.updateProjectProps({
        projectId,
        props: {
          overlays: [...nonHTMLOverlays, newOverlay],
        },
      })
    },

    async addImageOverlay2(overlayId: string, props: OverlayProps = {}) {
      const existingOverlays = commands.getOverlays()

      const overlay = existingOverlays.find((x) => x.id === overlayId)

      if (overlay) {
        const overlayIndex = existingOverlays.findIndex(
          (x) => x.id === overlayId,
        )
        if (overlayIndex > -1) {
          const shallowOverlays = JSON.parse(JSON.stringify(existingOverlays))

          shallowOverlays.splice(overlayIndex, 1, overlay)

          return Command.updateProjectProps({
            projectId,
            props: {
              overlays: shallowOverlays,
            },
          })
        }
      }

      const vidOverlay = existingOverlays.find(
        (x) => x.props.type === 'video-overlay',
      )
      const meta = props.meta || { type: 'image-overlay' }

      const newOverlay = {
        id: overlayId,
        props: {
          ...props,
          type: 'overlay',
          meta: {
            ...meta,
            ...{ ...(vidOverlay && { style: { opacity: 0 } }) },
          },
        },
      }

      const nonImageOverlays = existingOverlays.filter(
        (x) => x.props.type !== 'overlay',
      )

      Command.updateProjectProps({
        projectId,
        props: {
          overlays: [...nonImageOverlays, newOverlay],
        },
      })
    },

    async addVideoOverlay2(
      overlayId: string,
      props: OverlayProps & HTMLVideoElementAttributes = {},
    ) {
      const existingOverlays = commands.getOverlays()
      const overlay = existingOverlays.find((x) => x.id === overlayId)

      if (overlay) {
        const overlayIndex = existingOverlays.findIndex(
          (x) => x.id === overlayId,
        )
        if (overlayIndex > -1) {
          const shallowOverlays = JSON.parse(JSON.stringify(existingOverlays))

          shallowOverlays.splice(overlayIndex, 1, overlay)

          return Command.updateProjectProps({
            projectId,
            props: {
              overlays: shallowOverlays,
            },
          })
        }
      }

      // get all children of the overlay node and update their opacity attributes
      const allForegroundOverlays = existingOverlays?.filter(
        (f) => f.props.type !== 'video-overlay',
      )

      const newForegroundLayers = allForegroundOverlays?.map((overlay) => {
        return {
          ...overlay,
          props: {
            ...overlay.props,
            meta: {
              ...overlay.props.meta,
              style: { opacity: 0 },
            },
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
          overlays: [...newForegroundLayers, newOverlay],
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

    getBackgroundMedia2(type?: string) {
      const backgroundMedia = CoreContext.compositor.getSources('Background')
      const backgroundMediaIds = type
        ? backgroundMedia.filter((x) => x.props.type === type).map((x) => x.id)
        : backgroundMedia.map((x) => x.id)
      return backgroundMediaIds[0]
    },

    getBackgroundImage2() {
      return commands.getBackgroundMedia2('image-background')
    },

    getBackgroundVideo2() {
      return commands.getBackgroundMedia2('video-background')
    },

    async setBackgroundImage2(
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

    async setBackgroundVideo2(
      backgroundId: string,
      props: BackgroundProps & HTMLVideoElementAttributes = {},
    ) {
      const exisitingBackground = (getProject(_project.id).props.background ||
        null) as Background
      if (exisitingBackground) {
        if (exisitingBackground.id === backgroundId) {
          return await Command.updateProjectProps({
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

      await Command.updateProjectProps({
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
  }
  const ensureValid = async () => {
    await ensureForegroundContainers()
    beforeInit(commands)
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

export const beforeInit = (commands: Commands) => {
  /** autoPlay last applied video overlay on refresh */
  const videoOverLay = commands.getVideoOverlay() as string

  if (videoOverLay) {
    commands.autoPlayVideoOverlay(videoOverLay, {
      muted: true,
      autoplay: true,
    })
  }

  /** autoPlay last applied video background on refresh */
  const backgroundVideo = commands.getBackgroundVideo()
  if (backgroundVideo) {
    commands.autoPlayBackgroundVideo({
      muted: true,
      autoplay: true,
    })
  }
}
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
        name: 'Overlay',
        sourceType: 'Overlay',
        id: 'overlay',
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
        id: 'fg-video',
        layout: 'Free',
      },
      foreground.id,
    ),
    project.insert(
      {
        name: 'VideoOverlay2',
        layout: 'Free',
        sourceType: 'Video2',
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
    project.insert(
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
        fields: {
          style: {
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity : 0
          },
        },
      },
      background.id,
    ),
    project.insert(
      {
        name: 'ImageBackground2',
        sourceType: 'Image2',
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
        sourceType: 'Video2',
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
