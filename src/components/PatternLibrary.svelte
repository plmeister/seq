<script lang="ts">
  import { projectStore } from "../lib/store/project.svelte";
  import type { PatternDef } from "../lib/models/project";

  let { onSelect }: { onSelect?: (p: PatternDef) => void } = $props();

  function create() {
    const p = projectStore.createPattern();
    if (onSelect) onSelect(p);
  }

  function duplicate(id: string) {
    const p = projectStore.duplicatePattern(id);
    if (p && onSelect) onSelect(p);
  }
</script>

<div class="library">
  <div class="header">
    <span>Patterns</span>
    <button onclick={create}>+ New</button>
  </div>
  <ul>
    {#each projectStore.getPatterns() as pat}
      <li>
        <button class="pat" onclick={() => onSelect?.(pat)}>{pat.name} ({pat.lengthSteps})</button>
        <button onclick={() => duplicate(pat.id)}>⧉</button>
      </li>
    {/each}
  </ul>
</div>

<style>
  .library {
    border: 1px solid #333;
    padding: 8px;
    width: 200px;
  }
  .header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  li {
    display: flex;
    gap: 4px;
    margin-bottom: 4px;
  }
  .pat {
    flex: 1;
    text-align: left;
  }
</style>
