# seq — agent notes

Browser step sequencer. Vite + Svelte 5 + TypeScript, no backend.

## Architecture decisions

- **Svelte 5 runes only.** No Svelte 4 idioms: use `mount()` from `svelte`
  (not `new App(...)`), `$state` / `$derived` / `$effect` / `$props`
  (not `export let`, not stores for local component state), and plain event
  attributes (`onclick={...}`, `oninput={...}`) instead of `on:click` directives.
- **Never reassign state to force reactivity.** `$state` deep-proxies objects and
  arrays, so `grid[row][col] = x` is enough (the old `grid = grid` trick is gone).
- **Side effects live in `$effect` with a cleanup return.** The sequencer's
  `setInterval` is created by an effect keyed on `playing` / `bpm` and cleared by
  its cleanup function — no `onMount` / `onDestroy` / manual `clearInterval` bookkeeping.
- **Keyed `{#each}` blocks** (`as item, i (key)`) wherever rows/cells come from a
  fixed list, so DOM nodes are stable when the grid changes.
- **Audio is isolated in `src/lib/audio.ts`** (`Synth` class wrapping `AudioContext`).
  Components call it; they don't touch Web Audio nodes directly. `resume()` must be
  called from a user-gesture path (instantiated on Play) because of autoplay policy.
- **Timing note:** the current clock is `setInterval`-driven. If timing drift becomes
  audible, replace with a lookahead scheduler (`AudioContext.currentTime` + scheduled
  `osc.start(t)`), keeping the effect-owned lifecycle.

## Conventions

- `src/components/*.svelte` for UI, `src/lib/*.ts` for framework-free logic.
- TypeScript everywhere; keep `strict` from `@tsconfig/svelte` happy.
- Dark UI baseline in `src/app.css`; component styles stay in the component.
