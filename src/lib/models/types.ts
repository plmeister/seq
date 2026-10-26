export interface Track {
  id: string
  name: string
  note: number // frequency in Hz
  steps: boolean[] // length = patternLength
}

export interface Pattern {
  id: string
  length: number // number of steps (e.g., 16)
  tracks: Track[]
}

export interface Sequence {
  id: string
  name: string
  bpm: number
  pattern: Pattern
  swing?: number // 0-1, for future use
}
