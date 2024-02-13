/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { updateMediaStreamTracks } from '../../helpers/webrtc'
import { connectDevice } from '../../logic'
import { CoreContext, log } from '../context'
import { getProject, toBaseProject } from '../data'
import { Compositor, SDK } from '../namespaces'

export type GameSource = {
  id: string
  value: MediaStream
  props: {
    id: string
    /** should always just be game */
    type: string
    displayName?: string
    videoEnabled?: boolean
    audioEnabled?: boolean
    mirrored?: boolean
    external?: boolean
    participantId?: string
    trackId?: string
    rtmpUrl?: string
    rtmpKey?: string
  }
}

export const Game = {
  type: 'Game',
  valueType: MediaStream,
  props: {
    id: {},
    type: {},
    videoEnabled: {},
    audioEnabled: {},
  },
  init({ addSource, removeSource, updateSource, getSource }) {
    // Updated by engine socket events
    let gameSourceStreams: { [id: string]: MediaStream } = {}
    // Updated by corecontext events
    let previousGameSources: SDK.Source[] = []

    const updateGameSources = (sources: SDK.Source[]) => {
      // Get diffs
      const newSources = sources.filter((source) => {
        return !previousGameSources.some((s) => s.id === source.id)
      })

      const removedSources = previousGameSources.filter((source) => {
        return !sources.some((s) => s.id === source.id)
      })

      previousGameSources = sources

      // Add sources
      newSources.forEach(async (s) => {
        const srcObject = new MediaStream([])
        gameSourceStreams[s.id] = srcObject

        const videoTracks = srcObject.getVideoTracks()

        addSource({
          id: `game-${s.id}`,
          isActive: true,
          value: srcObject,
          props: {
            id: s.id,
            isMuted: false,
            participantId: s.id,
            type: 'game',
            videoEnabled: Boolean(videoTracks.length),
            audioEnabled: true,
          },
        } as Compositor.Source.NewSource)
      })

      // Remove sources
      removedSources.forEach((s) => {
        removeSource(`game-${s.id}`)
      })
    }

    CoreContext.on('ActiveProjectChanged', ({ projectId }) => {
      log.info('ActiveProjectChanged')
      const project = toBaseProject(getProject(projectId))
      const sources = project.sources.filter(
        (s) => s.props.type === 'integration',
      )
      log.info('Available sources', sources)
      updateGameSources(sources)
    })

    CoreContext.onInternal('SourceConnected', async (id) => {
      log.info('SourceConnected', id)
      const srcObject = gameSourceStreams[id]
      const deviceStream = await connectDevice(id)
      const source = getSource(`game-${id}`)

      if (source && deviceStream) {
        const audioTrack = deviceStream.getAudioTracks()[0]
        const videoTrack = deviceStream.getVideoTracks()[0]

        updateMediaStreamTracks(srcObject, {
          video: videoTrack,
          audio: audioTrack,
        })

        updateSource(`game-${id}`, {
          videoEnabled: Boolean(videoTrack),
          audioEnabled: Boolean(audioTrack),
          mirrored: false,
          external: true,
        })
      }
    })

    CoreContext.onInternal('SourceDisconnected', (id) => {
      log.info('SourceDisconnected', id)
      const stream = gameSourceStreams[id]
      const tracks = stream?.getTracks()
      tracks.forEach((track) => {
        gameSourceStreams[id].removeTrack(track)
      })
    })

    CoreContext.on('ProjectSourceAdded', ({ source, projectId }) => {
      log.info('ProjectSourceAdded', source, projectId)
      const project = toBaseProject(getProject(projectId))
      updateGameSources(
        project.sources.filter((s) => s?.props?.type === 'integration'),
      )
    })

    CoreContext.on('ProjectSourceRemoved', ({ sourceId, projectId }) => {
      log.info('ProjectSourceRemoved', sourceId, projectId)
      const project = toBaseProject(getProject(projectId))
      updateGameSources(
        project.sources.filter((s) => s?.props?.type === 'integration'),
      )
    })
  },
} as Compositor.Source.SourceDeclaration
