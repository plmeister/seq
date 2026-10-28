# seq DAW Plan

This document tracks the evolution from a single-pattern grid sequencer to a collaborative multi-user mini-DAW. All features described here are designed around Yjs for live collaboration.

## Goals
- Pattern blocks (reusable) editable by multiple users simultaneously
- Multiple tracks with per-track instruments
- Arrangement timeline with clips (place pattern blocks on a timeline)
- Drum machine mode (vertical position = different sound) and piano roll mode (vertical position = pitch)
- Live playback of the arrangement that updates as others edit patterns/clips/tracks
- Shareable by room/project id; works behind Authelia/Traefik

## Core Concepts
| Concept | What it is | Notes |
| --- | --- | --- |
| `Project` | Root document (Yjs doc) for a room/session. | Owns global transport (`bpm`, `timeSig`, `loop`), instruments, patterns, tracks, and UI state. |
| `Pattern` (Pattern Block) | Reusable, self-contained grid of events. | Multiple people edit the same pattern simultaneously (like clips in Ableton/FL Studio). |
| `RowDef` | Definition for a vertical row (pitch or sound). | Enables piano roll (`note` + MIDI pitch) or drum machine (`sampleId` + label). |
| `Instrument` | What produces sound for a track (synth, sampler, etc). | Shared or per-track; row mappings come from instrument/pattern. |
| `TrackLane` (Arrangement Track) | Mixer channel hosting clips with assigned instrument. | Arranged on timeline (not the steps themselves). |
| `Clip` | Instance of a `Pattern` placed on the timeline. | Has `patternId`, `startBeat`/`startStep`, `length`, `offset`, `gain`, `muted`. |
| `Timeline/Transport` | Global playback (playhead, loop range). | Start local-first; can share later. |
| `Awareness` | Who's editing what (cursor/selected pattern/clip). | For UX presence. |

## Data Model (Yjs-friendly)
Prefer `Y.Map`, `Y.Array` over deeply nested re-assignments. Use stable IDs everywhere.

```ts
interface ProjectMeta {
  id: string
  name: string
  bpm: number
  swing?: number
  timeSignature?: [number, number]
  loopStart?: number // beats
  loopEnd?: number   // beats
}

interface RowDef {
  id: string
  kind: 'note' | 'sample'
  label: string            // "C4", "Snare", etc
  value: number | string   // MIDI note number or sampleId
  color?: string
}

interface PatternDef {
  id: string
  name: string
  lengthSteps: number
  gridType: 'chromatic' | 'drum'
  rows: RowDef[]
  // key by `${rowId}:${step}` or row arrays; prefer Map for sparse edits
  cells: Record<string, Cell | undefined>
}

interface Cell {
  active: boolean
  velocity?: number
  probability?: number
  microOffset?: number
}

interface InstrumentDef {
  id: string
  type: 'synth' | 'sampler'
  name: string
  params: Record<string, any>
  rowMapping?: Record<string, string> // rowId -> sampleId/voiceId
}

interface ClipDef {
  id: string
  patternId: string
  startBeat: number
  lengthBeats: number
  offsetBeats?: number
  muted?: boolean
  gain?: number
  transpose?: number
}

interface TrackLaneDef {
  id: string
  name: string
  instrumentId: string
  volume: number // 0-1
  pan: number    // -1 to 1
  mute: boolean
  solo: boolean
  clips: ClipDef[]
}

// Y.Doc shape (conceptual)
ProjectY {
  meta: Y.Map<ProjectMeta>
  instruments: Y.Map<InstrumentDef>
  patterns: Y.Map<PatternDef>
  tracks: Y.Array<TrackLaneDef>
}
```

Notes:
- Cells keyed as `${rowId}:${step}` in a `Y.Map` (sparse + CRDT-friendly).
- `tracks` as `Y.Array` of track objects (with nested `Y.Array` for `clips`).
- Generate IDs client-side (nanoid). Don't sync transient UI state in heavy maps; use Awareness.
- Persistence extends current disk persistence of Y docs (room = project id).

## Audio Architecture
| Piece | Change | Rationale |
| --- | --- | --- |
| `Instrument` interface | `trigger(event: {rowDef: RowDef, time: number, velocity: number, transpose?: number}, ctx: AudioContext)` | Decouples grid from single sine wave. |
| `SynthInstrument` | Wrap existing logic, use `RowDef.value` as frequency/MIDI. | Backwards compatible. |
| `SamplerInstrument` | Load samples per `sampleId`, play on trigger. | Drum machine support. |
| `InstrumentRegistry` | Map `instrumentId` -> instance, lazy load samples. | Shared across players. |
| `TimelinePlayer` | Lookahead scheduler (100-200ms ahead) iterating tracks/clips/pattern cells. | Required for arrangement + live editing; fixes drift. |
| `Transport` | `{ bpm, playing, loop, playheadBeats, setBpm() }` store. | Timeline position for UI + scheduling. |

Scheduling (high level): lookahead window → for each unmuted/soloed track scan overlapping clips → get pattern → trigger active cells at absolute beat = `clip.startBeat + cellStep*stepBeats + offset` with `ctx.currentTime + delta`.

## UI Structure
| View | Purpose | Notes |
| --- | --- | --- |
| `ProjectHeader` | Transport, BPM, loop, project name, room/share. | Global controls. |
| `PatternLibrary` | List/create/duplicate patterns, assign to clips. | Pattern blocks browser. |
| `PatternEditor` | Grid for selected pattern (rows from `RowDef[]`, steps = `lengthSteps`). | Toggle piano-roll/drum-grid; add/remove rows/change sounds. |
| `ArrangementView` (Timeline) | Horizontal timeline with tracks/lanes, draggable/resizable clips. | Arrange patterns over time; click clip selects pattern for editing. |
| `TrackControls/Mixer` | Per-lane instrument selector, volume/pan/mute/solo. | Different tracks sound different. |
| `Inspector` | Cell/clip/track/pattern properties (velocity, gain, transpose, row mapping). | Contextual editing. |

## Implementation Plan
Do in phases; keep feature flag if needed, don't delete old code until migration complete.

| Phase | Scope | Acceptance |
| --- | --- | --- |
| **0) Prep** | Add new types alongside old ones (feature flag `?mode=timeline` or UI toggle). Don't delete existing `Sequence/Pattern/Track` yet. Create `src/lib/models/project.ts`, update `src/lib/models/index.ts` if needed. | Builds, existing grid still works. |
| **1) Project model + store** | Create `ProjectStore` backed by Yjs with `patterns`, `tracks`, `instruments`, `meta`. Migrate room init to load project structure (create default pattern+track if empty). Keep backward compatibility/migration from old `Sequence.pattern` to new `PatternDef`. | Collab still works, data model exists. |
| **2) Pattern Library + PatternEditor** | Extract current grid into `PatternEditor` editing `PatternDef`. Add pattern selector/library (New Pattern, duplicate). Keep playback working off selected pattern initially. Add basic RowDef support (convert existing vertical rows to RowDef[]). | Can create/edit multiple patterns. |
| **3) RowDef + drum/piano modes** | Add RowDef UI (add/remove rows, set label/kind/value). Implement row-based triggering. Support gridType toggle. | Can switch to drum grid with different sounds per row. |
| **4) Instruments + Sampler** | Add instrument registry, instrument selector per track, load samples. Wire `SynthInstrument`/`SamplerInstrument`. | Different tracks can sound different. |
| **5) Arrangement Timeline + Clips** | Add timeline view, create clips from patterns, drag/move clips, `TimelinePlayer` with lookahead scheduler. Play timeline instead of single pattern. | Multiple people can arrange patterns live. |
| **6) Polish** | Awareness, clip resize, loop range, solo/mute, velocity, persistence of full project, UX cleanup. | Feature complete. |

## Migration Notes
- On first load of a project, if no patterns exist, generate one `PatternDef` from current `Sequence.pattern` (map `tracks[].note` -> `RowDef` with `kind:'note'`, `cells` from `steps`).
- Room key = project id. Server persistence of Y docs remains unchanged.
- Keep old types until Phase 2 migration is solid.

## Current Status
- Phase 0: Not started
- Phase 1: Not started
- Phase 2: Not started
- etc.
