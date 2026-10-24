<script lang="ts">
  import { Synth } from '../lib/audio'

  const notes = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25] // C4 to C5
  const steps = 16

  let grid = $state<boolean[][]>(Array.from({ length: notes.length }, () => Array(steps).fill(false)))
  let bpm = $state(120)
  let playing = $state(false)
  let currentStep = $state(0)

  const synth = new Synth()

  function toggle(row: number, col: number) {
    grid[row][col] = !grid[row][col] // deep $state proxy, no reassignment needed
  }

  // Scheduler: effect owns the interval, so Play/Stop and BPM changes
  // automatically tear down and rebuild the loop.
  $effect(() => {
    if (!playing) {
      currentStep = 0
      return
    }

    synth.resume()
    const ms = 60000 / bpm / 4 // 16th notes
    const id = window.setInterval(() => {
      for (let r = 0; r < notes.length; r++) {
        if (grid[r][currentStep]) {
          synth.play(notes[r])
        }
      }
      currentStep = (currentStep + 1) % steps
    }, ms)

    return () => window.clearInterval(id)
  })
</script>

<div class="controls">
  <button onclick={() => (playing = true)} disabled={playing}>Play</button>
  <button onclick={() => (playing = false)} disabled={!playing}>Stop</button>
  <label>
    BPM
    <input type="number" bind:value={bpm} min="60" max="200" />
  </label>
</div>

<div class="grid">
  {#each notes as _note, r (r)}
    <div class="row">
      {#each Array(steps) as _, c (c)}
        <button
          aria-label="note {r} step {c}"
          class="cell {grid[r][c] ? 'on' : ''} {playing && currentStep === c ? 'current' : ''}"
          onclick={() => toggle(r, c)}
        ></button>
      {/each}
    </div>
  {/each}
</div>

<style>
  .controls {
    display: flex;
    gap: 1rem;
    align-items: center;
    margin-bottom: 1rem;
  }

  .grid {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .row {
    display: flex;
    gap: 2px;
  }

  .cell {
    width: 40px;
    height: 40px;
    padding: 0;
    background: #222;
  }

  .cell.on {
    background: #4a9;
  }

  .cell.current {
    outline: 2px solid #fff;
  }
</style>
