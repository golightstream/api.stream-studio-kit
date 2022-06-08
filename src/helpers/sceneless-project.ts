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

import * as Layout from '../compositor/html/html-layouts'
import { CoreContext } from '../core/context'
import { getProjectRoom } from '../core/data'
import { SDK, Compositor } from '../core/namespaces'
import { Disposable } from '../core/types'
import { Track } from 'livekit-client'

import LayoutName = Layout.LayoutName
export type { LayoutName }

export type ParticipantProps = {
  volume: number
  isMuted: boolean
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
   * Set the active layout and associated layoutProps
   */
  setLayout(layout: LayoutName, layoutProps: LayoutProps): void
  /**
   * Get the active background image
   */
  getBackgroundImage(): string
  /**
   * Set the active background image
   */
  setBackgroundImage(src: string): void
  /**
   * Set one participant to "showcase". This participant will expand to fill
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
   * This does not affect the underlying MediaStreamTrack.
   */
  setParticipantMuted(participantId: string, isMuted: boolean): void
  /**
   * Remove all participants from the stream canvas who are not actively
   * sending a MediaStreamTrack for display.
   */
  pruneParticipants(): void
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
    getBackgroundImage() {
      return background.props.attributes.src
    },
    setBackgroundImage(src: string) {
      CoreContext.Command.updateNode({
        nodeId: background.id,
        props: {
          attributes: {
            ...background.props.attributes,
            src,
          },
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
      return CoreContext.on('NodeChanged', (payload) => {
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

      const { isMuted = false, volume = 1 } = props
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
      const childListener = CoreContext.on('NodeChanged', (payload) => {
        if (payload.nodeId !== content.id) return
        const previous = participantNode
        participantNode = commands.getParticipantNode(participantId)
        if (previous !== participantNode) {
          sendState()
        }
      })

      // Watch for changes to the participant node
      const participantListener = CoreContext.on('NodeChanged', (payload) => {
        if (!participantNode || payload.nodeId !== participantNode.id) return
        sendState()
      })

      sendState()

      // Return disposable for listener
      return () => {
        childListener()
        participantListener()
      }
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
  }
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
}
type ScenelessProps = {
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
  props: ScenelessProps = {},
  meta: SDK.Metadata = {},
) => {
  return CoreContext.Command.createProject({
    props,
    meta,
  }) as Promise<ScenelessProject>
}

/** @private */
export const createCompositor = async (
  layoutId: string,
  size: { x: number; y: number },
  props: ScenelessProps,
) => {
  const { backgroundImage, layout, layoutProps = {} } = props

  // TODO: Batch insert
  const project = await CoreContext.compositor.createProject(
    {
      props: {
        name: 'Root',
        type: 'sceneless-project',
        layout: 'Layered',
        size,
        isRoot: true,
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
        tagName: 'img',
        sourceType: 'Element',
        attributes: {
          src: backgroundImage,
        },
        style: {
          objectFit: 'cover',
        },
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
  return project
}
