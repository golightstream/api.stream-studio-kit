/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { updateMediaStreamTracks } from '../../helpers/webrtc'
import { CoreContext } from '../context'
import { Compositor, SDK } from '../namespaces'
import { toBaseProject, getProject, getProjectRoom } from '../data'

type SourceDeclaration = Compositor.Source.SourceDeclaration

interface IEngineState {
	name: 'state';
	payload: {
		destinations: { id: string; connected: string }[];
		sources: { id: string; connected: string }[];
	};
}

interface IEngineSourceConnect {
	name: 'source.connect';
	payload: {
		id: string;
	};
}

interface IEngineSourceDisconnect {
	name: 'source.disconnect';
	payload: {
		id: string;
	};
}

type TEngineEvent = IEngineSourceConnect | IEngineSourceDisconnect | IEngineState;
class EngineWebsocket {
  private ws: WebSocket | null = null;
  private readonly sources = new Set<string>();
  constructor(
    private readonly connectSource: (id: string) => Promise<void>,
    private readonly disconnectSource: (id: string) => Promise<void>,
  ) {
    this.connect = this.connect.bind(this)
    this.handleMessage = this.handleMessage.bind(this)
  }

  public connect(): void {
    const handler = this.handleMessage.bind(this)

    this.ws = new WebSocket('ws://127.0.0.1:8000')
    this.ws.addEventListener('message', handler)
    this.ws.addEventListener('error', (err) => {
      console.error('Unable to connect to websocket', err)
    })

		this.ws.addEventListener('close', () => {
			this.ws?.removeEventListener('message', handler);

			try {
				this.ws?.close();
				this.ws = null;
			} catch (e) { /* */ }

			setTimeout(() => {
				this.connect();
			}, 1000);
		});
  }

  private handleMessage(e: MessageEvent<string>): void {
    try {
      const payload: TEngineEvent = JSON.parse(e.data)

      if (payload.name === 'state') {
        this.sources.clear()
        console.info('[Engine]: state', payload.payload)
        for (const src of payload.payload.sources) {
          if (src.connected) {
            if (!this.sources.has(src.id)) {
              this.sources.add(src.id)
              this.connectSource(src.id)
            }
          }
        }
      } else if (payload.name === 'source.disconnect') {
        console.info('[Engine]: source disconnect', payload.payload.id)
        this.sources.delete(payload.payload.id)
        this.disconnectSource(payload.payload.id)
      } else if (payload.name === 'source.connect') {
        console.info('[Engine]: source connect', payload.payload.id)
        this.sources.add(payload.payload.id)
        this.connectSource(payload.payload.id)
      }
    } catch (e) {
      console.error('unable to handle message: ', e)
    }
  }
}

function setupEngineWebsocket(
  connectSource: (id: string) => Promise<void>,
  disconnectSource: (id: string) => Promise<void>,
) {
  return new EngineWebsocket(
    connectSource,
    disconnectSource,
  )
}

const lookupDevice = (devices: MediaDeviceInfo[], src: string): { videoDevice: MediaDeviceInfo; audioDevice: MediaDeviceInfo | null } | null => {
  const videoDevice = devices.find(device => device.label === src && device.kind === 'videoinput');
  const audioDevice = devices.find(device => (device.label === `Monitor of ${src}`) && (device.kind === 'audioinput'));
  if (videoDevice && audioDevice) {
    return { videoDevice, audioDevice };
  }

  // Handle a standard browser context for testing locally.
  if (videoDevice) {
    if (videoDevice.label === 'Logitech BRIO (046d:085e)') {
      const audio = devices.find(device => /*(device.groupId === videoDevice.groupId) &&*/(device.kind === 'audioinput') && device.label === 'Loopback Audio 2 (Virtual)');
      return { videoDevice, audioDevice: audio! };
    }

    if (videoDevice.label === 'OBS Virtual Camera (m-de:vice)') {
      const audio = devices.find(device => /*(device.groupId === videoDevice.groupId) &&*/(device.kind === 'audioinput') && device.label === 'Loopback Audio (Virtual)');

      return { videoDevice, audioDevice: audio! };
    }

    return { videoDevice, audioDevice: null };
  }

  return null;
}

const connectDevice = async (id: string) => {
  const srcObject = new MediaStream([])
  const devs = await navigator.mediaDevices.enumerateDevices()

  const devices = lookupDevice(devs, id)
  if (devices) {
    const constraints: MediaStreamConstraints = {
      video: {
        width: 999999,
        height: 999999,
        deviceId: { exact: devices.videoDevice.deviceId },
      },
    }

    if (devices.audioDevice) {
      constraints.audio = {
        autoGainControl: false,
        channelCount: 2,
        echoCancellation: false,
        latency: 0,
        noiseSuppression: false,
        sampleRate: 128000,
        sampleSize: 16,

        deviceId: {
          exact: devices.audioDevice.deviceId,
        },
      }
    }
    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    if (stream) {
      return stream
    } else {
      console.warn(`No stream found for source ${id}.`)
    }

  } else {
    console.warn(`No device found for source ${id}.`)
  }
}

export type RTMPSource = {
  id: string
  value: MediaStream
  props: {
    id: string
    /** should always just be rtmp */
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



export const RTMP = {
  type: 'RTMP',
  valueType: MediaStream,
  props: {
    id: {},
    type: {},
    videoEnabled: {},
    audioEnabled: {},
  },
  init({
    addSource,
    removeSource,
    updateSource,
    getSource,
  }) {
    let listeners: { [id: string]: Function } = {}

    let engineSocket: EngineWebsocket
    // Updated by engine socket events
    let rtmpSourceStreams: { [id: string]: MediaStream } = {}

    let previousTracks: SDK.Track[] = []
    // Updated by corecontext events
    let previousRTMPSources: SDK.Source[] = []

    let room: SDK.Room

    const updateRTMPSources = (sources: SDK.Source[]) => {
      // Get diffs
      const newSources = sources.filter((source) => {
        return !previousRTMPSources.some((s) => s.id === source.id)
      })

      const removedSources = previousRTMPSources.filter((source) => {
        return !sources.some((s) => s.id === source.id)
      })

      previousRTMPSources = sources

      // Add sources
      newSources.forEach(async (s) => {
        const srcObject = new MediaStream([])
        rtmpSourceStreams[s.id] = srcObject

        const videoTracks = srcObject.getVideoTracks()

        addSource({
          id: `rtmp-${s.id}`,
          isActive: true,
          value: srcObject,
          props: {
            id: s.id,
            isMuted: false,
            participantId: s.id,
            type: 'rtmp',
            videoEnabled: Boolean(videoTracks.length),
            audioEnabled: true,
          },
        } as Compositor.Source.NewSource)

      })

      // Remove sources
      removedSources.forEach((s) => {
        removeSource(`rtmp-${s.id}`)
      })

    }

    let previousRoom: SDK.Room

    CoreContext.on('ActiveProjectChanged', ({ projectId }) => {
      const project = toBaseProject(getProject(projectId))
      updateRTMPSources(project.sources)
      if (project.role === SDK.Role.ROLE_RENDERER) {
        // Listen for engine socket events
        if (!engineSocket) {
          engineSocket =  setupEngineWebsocket(
            async function connectSource (id) {
              const srcObject = rtmpSourceStreams[id]
              const project = toBaseProject(getProject(projectId))

              const deviceStream = await connectDevice(id)
              const source = getSource(`rtmp-${id}`)

              if (source && deviceStream) {
                const audioTrack = deviceStream.getAudioTracks()[0]
                const videoTrack = deviceStream.getVideoTracks()[0]

                updateMediaStreamTracks(srcObject, {
                  video: videoTrack,
                  audio: audioTrack,
                })

                updateSource(`rtmp-${id}`, {
                  videoEnabled: Boolean(videoTrack),
                  audioEnabled: Boolean(audioTrack),
                  mirrored: false,
                  external: true,
                })
              }

            },
            async function disconnectSource (id) {
              const project = toBaseProject(getProject(projectId))
              const source = project.sources.find((s) => s.id === id)
              const stream = rtmpSourceStreams[id]
              const tracks = stream?.getTracks()
              tracks.forEach((track) => {
                rtmpSourceStreams[id].removeTrack(track)
              })
            },
          )
          engineSocket.connect()
        }
      } else {
      }
    })

    CoreContext.on('RoomJoined', ({ projectId, room }) => {
      const project = toBaseProject(getProject(projectId))
      if (project.role !== SDK.Role.ROLE_RENDERER) {
        let previousParticipants = [] as SDK.Participant[]
        /*  Updating the source of the camera. 
            Adding multi camera support
         */
        const updatePreviewStreams = () => {
          previousTracks
            .filter((p) => p?.type === 'screen_share' && p?.isExternal === true)
            .forEach((track) => {
              if (track.type === 'screen_share') {
                const srcObject = rtmpSourceStreams[track.participantId]
                const participant = room.getParticipant(track.participantId)
                // only do anything if it is for an RTMP source
                if (previousRTMPSources.some((source) => source.id === participant.id)) {
                  const videoTrack = room.getTrack(track.id)
                  const source = getSource(`rtmp-${participant?.id}`)
                  if (source) {
                    const audioTrack = room.getTrack(
                      participant?.meta[track.id]?.microphone,
                    )
                    updateMediaStreamTracks(srcObject, {
                      video: videoTrack?.mediaStreamTrack,
                      audio: audioTrack?.mediaStreamTrack
                    })

                    updateSource(`rtmp-${participant?.id}`, {
                      videoEnabled: Boolean(videoTrack && !videoTrack.isMuted),
                      audioEnabled: Boolean(audioTrack && !audioTrack.isMuted),
                      mirrored: participant?.meta[track.id]?.isMirrored,
                      external: track?.isExternal,
                    })
                  }
                }
              }
            })

          // Update existing participants' tracks
          previousParticipants
            .forEach((x) => {
              const source = getSource(`rtmp-${x.id}`)
              if (!source) {
                return
              }
              const srcObject = rtmpSourceStreams[x.id]
              const videoId = x.trackIds.find((trackId) => {
                const track = room.getTrack(trackId)
                return track?.type === 'screen_share' && !track?.isExternal
              })
              const audioId = x.trackIds.find((x) => {
                const track = room.getTrack(x)
                return track?.type === 'microphone' && !track?.isExternal
              })

              const videoTrack = room.getTrack(videoId)
              const audioTrack = room.getTrack(audioId)

              // replace tracks on existing mediaSTream
              updateMediaStreamTracks(srcObject, {
                video: videoTrack?.mediaStreamTrack,
                audio: audioTrack?.mediaStreamTrack,
              })
              updateSource(source.id, {
                videoEnabled: Boolean(videoTrack && !videoTrack.isMuted),
                audioEnabled: Boolean(audioTrack && !audioTrack.isMuted),
                mirrored: x?.meta?.isMirrored,
              })
            })
        }

        // listen for changes to available tracks
        room.useTracks((tracks) => {
          // Filter for those that are rtmp
          const rtmpTracks = tracks
            .filter((t) =>
              previousRTMPSources.some((s) => s.id === t.participantId)
            )
            .filter((t) => ['screen_share', 'microphone'].includes(t.type))

          // get tracks not contained in previous tracks
          const newTracks = rtmpTracks.filter((track) =>
            !previousTracks.some((x) => x.id === track.id) &&
            Boolean(track?.mediaStreamTrack)
          )

          // get previous tracks not contained in current tracks
          const removedTracks = previousTracks.filter(
            (t) => !rtmpTracks.some((x) => x.id === t.id)
          )

          // Filter out racks that have a mediaStreamTrack
          previousTracks = rtmpTracks.filter((t) => Boolean(t?.mediaStreamTrack))

          newTracks.forEach((track) => {
            if (track.type === 'screen_share' && track.mediaStreamTrack.kind === 'video') {
              const srcObject = rtmpSourceStreams[track.participantId]
              const audioTrack = previousTracks.find((t) => {
                return t.participantId === track.participantId &&
                  t.mediaStreamTrack.kind === 'audio'
              })
              updateMediaStreamTracks(srcObject, {
                video: track?.mediaStreamTrack,
                audio: audioTrack?.mediaStreamTrack,
              })
              updateSource(`rtmp-${track.participantId}`, {
                videoEnabled: Boolean(track && !track?.isMuted),
                audioEnabled: Boolean(audioTrack && !audioTrack?.isMuted),
              })
            }
          })

          removedTracks.forEach((track) => {
            rtmpSourceStreams[track.participantId].removeTrack(track.mediaStreamTrack)
          })

          updatePreviewStreams()
        })
      }
    })

    CoreContext.on('ProjectSourceAdded', ({ source, projectId }) => {
      const project = toBaseProject(getProject(projectId))
      updateRTMPSources(project?.sources)
    })

    CoreContext.on('ProjectSourceRemoved', ({ sourceId, projectId }) => {
      const project = toBaseProject(getProject(projectId))
      updateRTMPSources(project?.sources)
    })
  }
} as Compositor.Source.SourceDeclaration
