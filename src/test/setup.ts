import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

class MockAudioParam {
  value = 0
  setValueAtTime = vi.fn().mockReturnThis()
  linearRampToValueAtTime = vi.fn().mockReturnThis()
  exponentialRampToValueAtTime = vi.fn().mockReturnThis()
}

class MockGainNode {
  gain = new MockAudioParam()
  connect = vi.fn()
}

class MockOscillatorNode {
  type = 'square'
  frequency = new MockAudioParam()
  connect = vi.fn()
  start = vi.fn()
  stop = vi.fn()
}

class MockAudioContext {
  state = 'running'
  currentTime = 0
  destination = {}
  createGain = vi.fn(() => new MockGainNode())
  createOscillator = vi.fn(() => new MockOscillatorNode())
  resume = vi.fn().mockResolvedValue(undefined)
}

;(globalThis as any).AudioContext = MockAudioContext
;(globalThis as any).webkitAudioContext = MockAudioContext
;(window as any).AudioContext = MockAudioContext
;(window as any).webkitAudioContext = MockAudioContext
