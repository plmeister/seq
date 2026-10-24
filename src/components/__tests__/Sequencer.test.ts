import { render, screen, fireEvent } from '@testing-library/svelte'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Sequencer from '../Sequencer.svelte'

// Mock Synth to avoid real WebAudio
vi.mock('../../lib/audio', () => {
  return {
    Synth: class MockSynth {
      ctx: any = { state: 'running', currentTime: 0 }
      resume = vi.fn().mockResolvedValue(undefined)
      play = vi.fn()
    },
  }
})

describe('Sequencer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('renders Play/Stop buttons and BPM input', () => {
    render(Sequencer)
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument()
    expect(screen.getByRole('spinbutton')).toBeInTheDocument()
  })

  it('Stop is disabled initially, Play enabled', () => {
    render(Sequencer)
    expect(screen.getByRole('button', { name: /stop/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /play/i })).not.toBeDisabled()
  })

  it('creates 8 rows × 16 cells = 128 cells', () => {
    render(Sequencer)
    const cells = screen.getAllByRole('button', { name: /note .* step/i })
    expect(cells).toHaveLength(128)
  })

  it('clicking a cell toggles it on/off', async () => {
    render(Sequencer)
    const cells = screen.getAllByRole('button', { name: /note .* step/i })
    const first = cells[0]
    expect(first.classList.contains('on')).toBe(false)
    await fireEvent.click(first)
    expect(first.classList.contains('on')).toBe(true)
    await fireEvent.click(first)
    expect(first.classList.contains('on')).toBe(false)
  })

  it('Play/Stop toggle disabled states', async () => {
    render(Sequencer)
    const play = screen.getByRole('button', { name: /play/i })
    const stop = screen.getByRole('button', { name: /stop/i })
    await fireEvent.click(play)
    expect(play).toBeDisabled()
    expect(stop).not.toBeDisabled()
    await fireEvent.click(stop)
    expect(play).not.toBeDisabled()
    expect(stop).toBeDisabled()
  })
})
