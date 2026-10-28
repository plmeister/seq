<script lang="ts">
  import { projectStore } from "../lib/store/project.svelte";
  import type { PatternDef, RowDef, Cell } from "../lib/models/project";

  let { patternId }: { patternId: string } = $props();

  let pattern = $derived(projectStore.getPattern(patternId) as PatternDef | undefined);

  function toggle(row: RowDef, step: number) {
    if (!pattern) return;
    const key = `${row.id}:${step}`;
    const existing = pattern.cells?.[key];
    if (existing?.active) {
      projectStore.setCell(patternId, row.id, step, undefined);
    } else {
      const cell: Cell = { active: true, velocity: 0.8 };
      projectStore.setCell(patternId, row.id, step, cell);
    }
  }

  function isActive(row: RowDef, step: number) {
    if (!pattern) return false;
    const key = `${row.id}:${step}`;
    return !!pattern.cells?.[key]?.active;
  }
</script>

{#if pattern}
  <div class="editor">
    <div class="header">
      <span>{pattern.name} ({pattern.gridType})</span>
      <span>Length: {pattern.lengthSteps}</span>
    </div>
    <div class="grid">
      {#each [...pattern.rows].reverse() as row, r (row.id)}
        <div class="row">
          <div class="label">{row.label}</div>
          {#each Array(pattern.lengthSteps) as _, step}
            <button
              class="cell {isActive(row, step) ? 'active' : ''}"
              onclick={() => toggle(row, step)}
              aria-label={`row ${row.label} step ${step + 1}`}
            ></button>
          {/each}
        </div>
      {/each}
    </div>
  </div>
{:else}
  <div>No pattern selected</div>
{/if}

<style>
  .editor {
    border: 1px solid #333;
    padding: 8px;
    flex: 1;
  }
  .header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  .grid {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .label {
    width: 60px;
    text-align: right;
    padding-right: 8px;
    font-size: 12px;
  }
  .cell {
    width: 24px;
    height: 24px;
    background: #222;
    border: 1px solid #444;
  }
  .cell.active {
    background: #4ade80;
  }
</style>
