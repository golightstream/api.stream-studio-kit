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
  constructor(private readonly onUpdate: (sources: Set<string>) => void) {
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
            this.sources.add(src.id)
          }
        }
      } else if (payload.name === 'source.disconnect') {
        console.info('[Engine]: source disconnect', payload.payload.id)
        this.sources.delete(payload.payload.id)
      } else if (payload.name === 'source.connect') {
        console.info('[Engine]: source connect', payload.payload.id)
        this.sources.add(payload.payload.id)
      }
      this.onUpdate(this.sources)
    } catch (e) {
      console.error('unable to handle message: ', e)
    }
  }
}

function setupEngineWebsocket(onUpdate: (sources: Set<string>) => void) {
  return new EngineWebsocket(onUpdate)
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
    let engineSocket: EngineWebsocket
    let previousSources: SDK.Source[] = []
    const update = (sources: SDK.Source[]) => {
      // Get diffs
      const newSources = sources.filter((source) => {
        return !previousSources.some((s) => s.id === source.id)
      })

      const removedSources = previousSources.filter((source) => {
        return !sources.some((s) => s.id === source.id)
      })

      // Remove sources
      previousSources.forEach((s) => {
        removeSource(s.id)
      })

      const project = toBaseProject(getProject(CoreContext.state.activeProjectId))
      // Add sources
      newSources.forEach(async (s) => {
        const srcObject = new MediaStream([])
        if (project.role === SDK.Role.ROLE_RENDERER)  {
          // TODO: use RTMP sturr
          const srcObject = new MediaStream([])
          const devs = await navigator.mediaDevices.enumerateDevices()

          // Or something like this ¯\_(ツ)_/¯
          const devices = lookupDevice(devs, s.id)
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
              return addSource({
                id: s.id,
                isActive: true,
                value: stream,
                props: {
                  id: s.id,
                  isMuted: false,
                  participantId: s.id,
                  type: 'rtmp',
                  videoEnabled: true,
                  audioEnabled: true,
                  displayName: s.id,
                },
              } as Compositor.Source.NewSource)
            }
          } 
          // TODO: add source with blank shit
          addSource({
            id: s.id,
            isActive: true,
            value: srcObject,
            props: {
              id: s.id,
              participantId: s.id,
              isMuted: false,
              type: 'rtmp',
              audioEnabled: false,
              videoEnabled: false,
              displayName: s.id,
            }
          })
          return
        }
        else {
          addSource({
            id: s.id,
            isActive: true,
            value: srcObject,
            props: {
              id: s.id,
              participantId: s.id,
              isMuted: false,
              type: 'rtmp',
              videoEnabled: false,
              audioEnabled: false,
              displayName: s.id,
            }
          })
          // TODO: use WebRTC
        }
      })

    }

    CoreContext.on('ActiveProjectChanged', ({ projectId }) => {
      const project = toBaseProject(getProject(projectId))
      update(project.sources)
      if (project.role === SDK.Role.ROLE_RENDERER) {
        // TODO: some actual stuff
        if (!engineSocket) {
          engineSocket =  setupEngineWebsocket((sources) => { sources.forEach((s) => console.log(s)) })
          engineSocket.connect()
        }
      }
    })

    CoreContext.on('ProjectSourceAdded', ({ source, projectId }) => {
      const project = toBaseProject(getProject(projectId))
      update(project?.sources)
    })

    CoreContext.on('ProjectSourceRemoved', ({ sourceId, projectId }) => {
      const project = toBaseProject(getProject(projectId))
      update(project?.sources)
    })
  }
} as Compositor.Source.SourceDeclaration
