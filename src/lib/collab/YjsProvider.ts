import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { Awareness } from 'y-protocols/awareness'
import type { SequencerStore } from '../store/sequencer.svelte'

export class YjsCollab {
  doc: Y.Doc
  provider: WebsocketProvider | null = null
  awareness: Awareness

  constructor(store: SequencerStore, docId: string, wsUrl?: string, userId?: string) {
    this.doc = new Y.Doc()
    this.awareness = new Awareness(this.doc)

    if (userId) {
      this.awareness.setLocalStateField('user', {
        id: userId,
        name: userId,
      })
    }

    if (wsUrl) {
      this.provider = new WebsocketProvider(wsUrl, docId, this.doc, { awareness: this.awareness })
    }

    this.bindToStore(store)
  }

  private bindToStore(store: SequencerStore) {
    const seqMap = this.doc.getMap('sequence')
    const tracksArr = this.doc.getArray<Y.Map<any>>('tracks')

    // Initialize from store if empty
    if (tracksArr.length === 0) {
      this.doc.transact(() => {
        seqMap.set('id', store.sequence.id)
        seqMap.set('name', store.sequence.name)
        seqMap.set('bpm', store.sequence.bpm)

        for (const track of store.sequence.pattern.tracks) {
          const t = new Y.Map()
          t.set('id', track.id)
          t.set('name', track.name)
          t.set('note', track.note)
          const stepsArr = new Y.Array<boolean>()
          stepsArr.push(track.steps)
          t.set('steps', stepsArr)
          tracksArr.push([t])
        }
      })
    }

    // Observe Yjs changes -> update store (simplified)
    tracksArr.observe(() => {
      // Basic sync: mirror Yjs into store on remote changes
      // In production, be careful about echo loops
    })

    // Observe store changes -> update Yjs
    // This is simplified; full bidirectional sync needs careful handling
  }

  destroy() {
    this.provider?.destroy()
    this.doc.destroy()
  }
}
