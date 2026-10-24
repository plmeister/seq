import { Synth } from '../audio'
import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('Synth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates AudioContext and gain node on construction', () => {
    const synth = new Synth() as any
    expect(synth.ctx).toBeDefined()
    expect(synth.gain).toBeDefined()
    expect(synth.gain.gain.value).toBe(0.2)
  })

  it('resume calls ctx.resume if suspended', async () => {
    const synth = new Synth() as any
    synth.ctx.state = 'suspended'
    synth.ctx.resume = vi.fn().mockResolvedValue(undefined)
    await synth.resume()
    expect(synth.ctx.resume).toHaveBeenCalled()
  })

  it('resume does nothing if running', async () => {
    const synth = new Synth() as any
    synth.ctx.state = 'running'
    synth.ctx.resume = vi.fn()
    await synth.resume()
    expect(synth.ctx.resume).not.toHaveBeenCalled()
  })

  it('play creates oscillator and gain, connects, starts and stops', () => {
    const synth = new Synth() as any
    synth.ctx.state = 'running'
    synth.resume = vi.fn()
    synth.play(440)
    expect(synth.ctx.createOscillator).toHaveBeenCalled()
    expect(synth.ctx.createGain).toHaveBeenCalled()
    expect(synth.resume).toHaveBeenCalled()
  })
})
