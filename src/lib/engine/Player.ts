import { Synth } from '../audio'
import type { Sequence } from '../models'

export class Player {
  private synth: Synth
  private interval: number | null = null

  constructor(synth?: Synth) {
    this.synth = synth ?? new Synth()
  }

  start(sequence: Sequence, currentStep: number, onStep: (step: number) => void): number {
    this.stop()
    this.synth.resume()
    const ms = (60000 / sequence.bpm) / 4 // 16th notes
    this.interval = window.setInterval(() => {
      const step = currentStep
      for (const track of sequence.pattern.tracks) {
        if (track.steps[step]) {
          this.synth.play(track.note)
        }
      }
      onStep((step + 1) % sequence.pattern.length)
    }, ms)
    return this.interval
  }

  stop() {
    if (this.interval !== null) {
      clearInterval(this.interval)
      this.interval = null
    }
  }

  destroy() {
    this.stop()
  }
}
