import { createSequence } from '../models/factories'
import type { Sequence } from '../models'

export class SequencerStore {
  sequence = $state<Sequence>(createSequence())

  setBpm(bpm: number) {
    this.sequence.bpm = bpm
  }

  toggleStep(trackId: string, stepIndex: number) {
    const track = this.sequence.pattern.tracks.find(t => t.id === trackId)
    if (!track) return
    track.steps[stepIndex] = !track.steps[stepIndex]
  }

  setStep(trackId: string, stepIndex: number, value: boolean) {
    const track = this.sequence.pattern.tracks.find(t => t.id === trackId)
    if (!track) return
    track.steps[stepIndex] = value
  }

  clearPattern() {
    for (const track of this.sequence.pattern.tracks) {
      track.steps = Array(this.sequence.pattern.length).fill(false)
    }
  }
}

export const sequencerStore = new SequencerStore()
