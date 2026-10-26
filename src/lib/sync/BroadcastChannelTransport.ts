import type { SyncMessage, SyncTransport } from './types'

export class BroadcastChannelTransport implements SyncTransport {
  private channel: BroadcastChannel
  private handlers = new Set<(msg: SyncMessage) => void>()

  constructor(name: string = 'seq-sync') {
    this.channel = new BroadcastChannel(name)
    this.channel.onmessage = (ev) => {
      const msg = ev.data as SyncMessage
      for (const h of this.handlers) h(msg)
    }
  }

  send(msg: SyncMessage): void {
    this.channel.postMessage(msg)
  }

  subscribe(handler: (msg: SyncMessage) => void): () => void {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }
}
