import type { Pattern, Sequence, Track } from './types'

export const DEFAULT_NOTES = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25] // C4-C5

export function createTrack(id: string, name: string, note: number, steps: number): Track {
  return {
    id,
    name,
    note,
    steps: Array(steps).fill(false),
  }
}

export function createPattern(id: string, length: number = 16, notes: number[] = DEFAULT_NOTES): Pattern {
  return {
    id,
    length,
    tracks: notes.map((note, i) => createTrack(`track-${i}`, `Track ${i + 1}`, note, length)),
  }
}

export function createSequence(id: string = 'seq-1', name: string = 'Untitled'): Sequence {
  const pattern = createPattern('pat-1', 16)
  return {
    id,
    name,
    bpm: 120,
    pattern,
  }
}
