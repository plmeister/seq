<script lang="ts">
  import { sequencerStore } from '../lib/store/sequencer.svelte'
  import { Player } from '../lib/engine/Player'
  import { YjsSync } from '../lib/collab/YjsSync'
  import { onDestroy } from 'svelte'

  const seq = sequencerStore.sequence
  let playing = $state(false)
  let currentStep = $state(0)
  const player = new Player()
  
  let room = $state(typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('room') || 'default' : 'default')
  let collab: YjsSync | null = null
  let connected = $state(false)

  function initCollab(r: string) {
    collab?.destroy()
    collab = new YjsSync(sequencerStore, { room: r })
    if (collab.provider) {
      collab.provider.on('status', (event: any) => {
        connected = event.status === 'connected'
      })
    }
  }

  initCollab(room)

  function changeRoom() {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    url.searchParams.set('room', room)
    window.history.pushState({}, '', url.toString())
    initCollab(room)
  }

  function toggle(trackId: string, stepIndex: number) {
    sequencerStore.toggleStep(trackId, stepIndex)
    const track = seq.pattern.tracks.find(t => t.id === trackId)
    if (track && collab) collab.pushToggle(trackId, stepIndex, track.steps[stepIndex])
  }

  $effect(() => {
    if (collab) collab.pushBpm(seq.bpm)
  })

  onDestroy(() => collab?.destroy())

  $effect(() => {
    if (!playing) {
      currentStep = 0
      player.stop()
      return
    }

    const ms = (60000 / seq.bpm) / 4
    const id = window.setInterval(() => {
      for (const track of seq.pattern.tracks) {
        if (track.steps[currentStep]) {
          player['synth']?.play(track.note)
        }
      }
      currentStep = (currentStep + 1) % seq.pattern.length
    }, ms)

    return () => {
      window.clearInterval(id)
      player.stop()
    }
  })
</script>

<div class="controls">
  <button onclick={() => (playing = true)} disabled={playing}>Play</button>
  <button onclick={() => (playing = false)} disabled={!playing}>Stop</button>
  <label>
    BPM
    <input type="number" bind:value={seq.bpm} min="60" max="200" />
  </label>
  <label>
    Room
    <input type="text" bind:value={room} />
  </label>
  <button onclick={changeRoom}>Join</button>
  <span class="status">{connected ? '● connected' : '○ offline'}</span>
</div>

<div class="grid">
  {#each seq.pattern.tracks as track, r (track.id)}
    <div class="row">
      {#each track.steps as on, c (c)}
        <button
          aria-label="{track.name} step {c}"
          class="cell {on ? 'on' : ''} {playing && currentStep === c ? 'current' : ''}"
          onclick={() => toggle(track.id, c)}
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
    flex-wrap: wrap;
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

  .status {
    font-size: 0.9rem;
    opacity: 0.8;
  }
</style>
