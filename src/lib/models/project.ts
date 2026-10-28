export interface ProjectMeta {
  id: string
  name: string
  bpm: number
  swing?: number
  timeSignature?: [number, number]
  loopStart?: number // beats
  loopEnd?: number   // beats
}

export interface RowDef {
  id: string
  kind: 'note' | 'sample'
  label: string            // "C4", "Snare", etc
  value: number | string   // MIDI note number or sampleId
  color?: string
}

export interface Cell {
  active: boolean
  velocity?: number
  probability?: number
  microOffset?: number
}

export interface PatternDef {
  id: string
  name: string
  lengthSteps: number
  gridType: 'chromatic' | 'drum'
  rows: RowDef[]
  cells: Record<string, Cell | undefined>
}

export interface InstrumentDef {
  id: string
  type: 'synth' | 'sampler'
  name: string
  params: Record<string, any>
  rowMapping?: Record<string, string> // rowId -> sampleId/voiceId
}

export interface ClipDef {
  id: string
  patternId: string
  startBeat: number
  lengthBeats: number
  offsetBeats?: number
  muted?: boolean
  gain?: number
  transpose?: number
}

export interface TrackLaneDef {
  id: string
  name: string
  instrumentId: string
  volume: number // 0-1
  pan: number    // -1 to 1
  mute: boolean
  solo: boolean
  clips: ClipDef[]
}
