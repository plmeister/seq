// Minimal CRDT skeleton for future Yjs-style collaboration
// Start simple: Last-Write-Wins (LWW) per step with client IDs + vector clocks
export interface LWWEntry<T> {
  value: T
  ts: number
  clientId: string
}

export class LWWMap<T> {
  private entries = new Map<string, LWWEntry<T>>()

  set(key: string, value: T, clientId: string, ts: number = Date.now()): boolean {
    const existing = this.entries.get(key)
    if (!existing) {
      this.entries.set(key, { value, ts, clientId })
      return true
    }
    if (ts > existing.ts || (ts === existing.ts && clientId > existing.clientId)) {
      this.entries.set(key, { value, ts, clientId })
      return true
    }
    return false
  }

  get(key: string): T | undefined {
    return this.entries.get(key)?.value
  }

  has(key: string): boolean {
    return this.entries.has(key)
  }

  toJSON(): Record<string, LWWEntry<T>> {
    const obj: Record<string, LWWEntry<T>> = {}
    for (const [k, v] of this.entries) {
      obj[k] = v
    }
    return obj
  }

  fromJSON(obj: Record<string, LWWEntry<T>>) {
    this.entries.clear()
    for (const [k, v] of Object.entries(obj)) {
      this.entries.set(k, v)
    }
  }
}
