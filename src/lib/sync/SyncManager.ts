import type { SequencerStore } from '../store/sequencer.svelte'
import type { Operation, SyncMessage, SyncTransport } from './types'

export class SyncManager {
  private store: SequencerStore
  private transport: SyncTransport | null = null
  private docId: string
  private userId: string
  private version = 0
  private unsub: (() => void) | null = null

  constructor(store: SequencerStore, docId: string, userId: string) {
    this.store = store
    this.docId = docId
    this.userId = userId
  }

  connect(transport: SyncTransport) {
    this.transport = transport
    this.unsub = transport.subscribe(msg => this.onMessage(msg))
  }

  disconnect() {
    this.unsub?.()
    this.unsub = null
    this.transport = null
  }

  applyLocal(op: Operation) {
    this.version++
    const msg: SyncMessage = {
      id: crypto.randomUUID(),
      docId: this.docId,
      userId: this.userId,
      op,
      version: this.version,
      ts: Date.now(),
    }
    this.transport?.send(msg)
    // Local echo handled by store mutation; in real collab, apply remote or use OT/CRDT
    this.applyOp(op)
  }

  private onMessage(msg: SyncMessage) {
    if (msg.docId !== this.docId) return
    if (msg.userId === this.userId) return // ignore own
    this.version = Math.max(this.version, msg.version)
    this.applyOp(msg.op)
  }

  private applyOp(op: Operation) {
    switch (op.type) {
      case 'setBpm':
        this.store.setBpm(op.bpm)
        break
      case 'toggleStep':
        this.store.toggleStep(op.trackId, op.stepIndex)
        break
      case 'setStep':
        this.store.setStep(op.trackId, op.stepIndex, op.value)
        break
      case 'clearPattern':
        this.store.clearPattern()
        break
    }
  }
}
