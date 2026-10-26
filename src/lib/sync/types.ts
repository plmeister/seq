export type Operation =
  | { type: 'setBpm'; bpm: number }
  | { type: 'toggleStep'; trackId: string; stepIndex: number }
  | { type: 'setStep'; trackId: string; stepIndex: number; value: boolean }
  | { type: 'clearPattern' }
  | { type: 'updatePattern'; patternId: string; data: any }

export interface SyncMessage {
  id: string
  docId: string
  userId: string
  op: Operation
  version: number
  ts: number
}

export interface SyncTransport {
  send(msg: SyncMessage): Promise<void> | void
  subscribe(handler: (msg: SyncMessage) => void): () => void
}
