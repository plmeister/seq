export class Synth {
  ctx: AudioContext
  gain: GainNode

  constructor() {
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    this.gain = this.ctx.createGain()
    this.gain.gain.value = 0.2
    this.gain.connect(this.ctx.destination)
  }

  async resume() {
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume()
    }
  }

  play(freq: number, duration = 0.1) {
    this.resume()
    const osc = this.ctx.createOscillator()
    const env = this.ctx.createGain()

    osc.type = 'square'
    osc.frequency.value = freq

    env.gain.setValueAtTime(0, this.ctx.currentTime)
    env.gain.linearRampToValueAtTime(1, this.ctx.currentTime + 0.001)
    env.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration)

    osc.connect(env)
    env.connect(this.gain)

    osc.start()
    osc.stop(this.ctx.currentTime + duration + 0.01)
  }
}
