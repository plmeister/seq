import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { Awareness } from 'y-protocols/awareness'
import type { SequencerStore } from '../store/sequencer.svelte'
import type { Track } from '../models/types'

export class YjsSync {
  doc = new Y.Doc()
  awareness = new Awareness(this.doc)
  provider: WebsocketProvider | null = null
  private store: SequencerStore
  private syncing = false

  constructor(store: SequencerStore, opts: { room?: string; wsUrl?: string; userId?: string } = {}) {
    this.store = store
    const room = opts.room || 'default'
    const userId = opts.userId || crypto.randomUUID()
    
    this.awareness.setLocalStateField('user', { id: userId, name: userId })

    const wsUrl = opts.wsUrl || this.getDefaultWsUrl()
    this.provider = new WebsocketProvider(wsUrl, room, this.doc, { awareness: this.awareness })

    this.setupBindings()
  }

  private getDefaultWsUrl(): string {
    if (typeof window === 'undefined') return 'ws://localhost:3000'
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    // If running in dev on 5173, connect to 3000; else use same host
    if (host.includes(':5173')) return `${proto}//${host.replace(':5173', ':3000')}`
    return `${proto}//${host}`
  }

  private setupBindings() {
    const seqMap = this.doc.getMap('sequence')
    const tracksArr = this.doc.getArray<Y.Map<any>>('tracks')

    // Init from store if empty
    if (tracksArr.length === 0) {
      this.doc.transact(() => {
        seqMap.set('bpm', this.store.sequence.bpm)
        seqMap.set('name', this.store.sequence.name)
        for (const track of this.store.sequence.pattern.tracks) {
          const t = new Y.Map()
          t.set('id', track.id)
          t.set('note', track.note)
          t.set('name', track.name)
          const steps = new Y.Array<boolean>()
          steps.push(track.steps.slice())
          t.set('steps', steps)
          tracksArr.push([t])
        }
      })
    }

    // Yjs -> Store
    tracksArr.observeDeep(() => {
      if (this.syncing) return
      this.syncing = true
      try {
        const storeTracks = this.store.sequence.pattern.tracks
        for (let i = 0; i < tracksArr.length && i < storeTracks.length; i++) {
          const yt = tracksArr.get(i)
          const stepsArr = yt.get('steps') as Y.Array<boolean>
          for (let s = 0; s < stepsArr.length; s++) {
            const val = stepsArr.get(s)
            if (storeTracks[i].steps[s] !== val) {
              storeTracks[i].steps[s] = val
            }
          }
        }
        if (seqMap.get('bpm') !== this.store.sequence.bpm) {
          this.store.sequence.bpm = seqMap.get('bpm')
        }
      } finally {
        this.syncing = false
      }
    })

    // Store -> Yjs
    // Watch for local changes via effect from component or poll
  }

  pushBpm(bpm: number) {
    if (this.syncing) return
    this.doc.getMap('sequence').set('bpm', bpm)
  }

  pushToggle(trackId: string, stepIndex: number, value: boolean) {
    if (this.syncing) return
    const tracksArr = this.doc.getArray<Y.Map<any>>('tracks')
    for (let i = 0; i < tracksArr.length; i++) {
      const yt = tracksArr.get(i)
      if (yt.get('id') === trackId) {
        const stepsArr = yt.get('steps') as Y.Array<boolean>
        this.doc.transact(() => {
          stepsArr.delete(stepIndex, 1)
          stepsArr.insert(stepIndex, [value])
        })
        break
      }
    }
  }

  destroy() {
    this.provider?.destroy()
    this.doc.destroy()
  }
}
