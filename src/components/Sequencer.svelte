<script lang="ts">
  import { Synth } from '../lib/audio'
  import { onDestroy } from 'svelte'

  const notes = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25] // C4 to C5
  const steps = 16

  let grid: boolean[][] = Array(notes.length).fill(0).map(() => Array(steps).fill(false))
  let bpm = 120
  let playing = false
  let currentStep = 0
  let interval: number | null = null

  const synth = new Synth()

  function toggle(row: number, col: number) {
    grid[row][col] = !grid[row][col]
    grid = grid // trigger reactivity
  }

  function start() {
    if (playing) return
    playing = true
    synth.resume()
    const ms = (60000 / bpm) / 4 // 16th notes
    interval = window.setInterval(() => {
      for (let r = 0; r < notes.length; r++) {
        if (grid[r][currentStep]) {
          synth.play(notes[r])
        }
      }
      currentStep = (currentStep + 1) % steps
    }, ms)
  }

  function stop() {
    playing = false
    if (interval !== null) {
      clearInterval(interval)
      interval = null
    }
    currentStep = 0
  }

  onDestroy(() => {
    stop()
  })
</script>

<div class="controls">
  <button on:click={start} disabled={playing}>Play</button>
  <button on:click={stop} disabled={!playing}>Stop</button>
  <label>
    BPM
    <input type="number" bind:value={bpm} min="60" max="200" />
  </label>
</div>

<div class="grid">
  {#each notes as note, r}
    <div class="row">
      {#each Array(steps) as _, c}
        <button
          class="cell {grid[r][c] ? 'on' : ''} {playing && currentStep === c ? 'current' : ''}"
          on:click={() => toggle(r, c)}
        />
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
