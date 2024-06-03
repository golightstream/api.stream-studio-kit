/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
interface IEngineState {
  name: 'state'
  payload: {
    destinations: { id: string; connected: string }[]
    sources: { id: string; connected: string }[]
  }
}

interface IEngineSourceConnect {
  name: 'source.connect'
  payload: {
    id: string
  }
}

interface IEngineSourceDisconnect {
  name: 'source.disconnect'
  payload: {
    id: string
  }
}

type TEngineEvent =
  | IEngineSourceConnect
  | IEngineSourceDisconnect
  | IEngineState
export class EngineWebsocket {
  private ws: WebSocket | null = null
  private readonly sources = new Set<string>()
  constructor(
    private readonly connectSource: (id: string) => Promise<void>,
    private readonly disconnectSource: (id: string) => Promise<void>,
  ) {
    this.connect = this.connect.bind(this)
    this.handleMessage = this.handleMessage.bind(this)
  }

  private getConnectionString() {
    if (!('apistreamCompositor' in window)) {
      return 'ws://127.0.0.1:8000'
    }

    const { eventsConfig } = (window as any).apistreamCompositor
    return `ws${eventsConfig.secure ? 's' : ''}://${eventsConfig.hostname}:${eventsConfig.port}${eventsConfig.token ? `?token=${eventsConfig.token}` : ''}`
  }

  public connect(): void {
    const handler = this.handleMessage.bind(this)

    this.ws = new WebSocket(this.getConnectionString())
    this.ws.addEventListener('message', handler)
    this.ws.addEventListener('error', (err) => {
      console.error('Unable to connect to websocket', err)
    })

    this.ws.addEventListener('close', () => {
      this.ws?.removeEventListener('message', handler)

      try {
        this.ws?.close()
        this.ws = null
      } catch (e) {
        /* */
      }

      setTimeout(() => {
        this.connect()
      }, 1000)
    })
  }

  public disconnect(): void {
    if (this.ws?.OPEN) {
      this.ws?.close()
    }
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
