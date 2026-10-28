import * as Y from "yjs";
import { nanoid } from "nanoid";
import type {
  ProjectMeta,
  PatternDef,
  RowDef,
  Cell,
  InstrumentDef,
  TrackLaneDef,
  ClipDef,
} from "../models/project";

function createDefaultRow(pitch = 60, label = "C4"): RowDef {
  return {
    id: nanoid(),
    kind: "note",
    label,
    value: pitch,
  };
}

function createDefaultPattern(): PatternDef {
  const rows: RowDef[] = [
    createDefaultRow(64, "E4"),
    createDefaultRow(62, "D4"),
    createDefaultRow(60, "C4"),
  ];
  const cells: Record<string, Cell | undefined> = {};
  // empty grid
  return {
    id: nanoid(),
    name: "Pattern 1",
    lengthSteps: 16,
    gridType: "chromatic",
    rows,
    cells,
  };
}

function createDefaultInstrument(): InstrumentDef {
  return {
    id: nanoid(),
    type: "synth",
    name: "Synth",
    params: {},
  };
}

function createDefaultTrack(instrumentId: string): TrackLaneDef {
  return {
    id: nanoid(),
    name: "Track 1",
    instrumentId,
    volume: 0.8,
    pan: 0,
    mute: false,
    solo: false,
    clips: [],
  };
}

export class ProjectStore {
  doc: Y.Doc;
  meta: Y.Map<any>;
  instruments: Y.Map<any>;
  patterns: Y.Map<any>;
  tracks: Y.Array<any>;

  constructor(doc?: Y.Doc) {
    this.doc = doc ?? new Y.Doc();
    this.meta = this.doc.getMap("meta");
    this.instruments = this.doc.getMap("instruments");
    this.patterns = this.doc.getMap("patterns");
    this.tracks = this.doc.getArray("tracks");
  }

  ensureDefaults(projectId: string) {
    if (this.meta.size === 0) {
      this.meta.set("id", projectId);
      this.meta.set("name", "Untitled Project");
      this.meta.set("bpm", 120);
    }
    if (this.instruments.size === 0) {
      const inst = createDefaultInstrument();
      this.instruments.set(inst.id, inst);
    }
    if (this.patterns.size === 0) {
      const pat = createDefaultPattern();
      this.patterns.set(pat.id, pat);
      // create track with clip pointing to pattern
      const instId = Array.from(this.instruments.keys())[0];
      const track = createDefaultTrack(instId);
      const clip: ClipDef = {
        id: nanoid(),
        patternId: pat.id,
        startBeat: 0,
        lengthBeats: pat.lengthSteps / 4, // assuming 16 steps = 4 beats at 4/4? steps are 16th notes? keep simple
      };
      track.clips = [clip];
      this.tracks.push([track]);
    } else if (this.tracks.length === 0) {
      const instId = Array.from(this.instruments.keys())[0];
      const track = createDefaultTrack(instId);
      this.tracks.push([track]);
    }
  }

  getMeta(): ProjectMeta {
    return {
      id: this.meta.get("id") || "default",
      name: this.meta.get("name") || "Untitled Project",
      bpm: this.meta.get("bpm") || 120,
      swing: this.meta.get("swing"),
      timeSignature: this.meta.get("timeSignature"),
      loopStart: this.meta.get("loopStart"),
      loopEnd: this.meta.get("loopEnd"),
    };
  }

  setBpm(bpm: number) {
    this.meta.set("bpm", bpm);
  }

  getPatterns(): PatternDef[] {
    const res: PatternDef[] = [];
    this.patterns.forEach((v: any) => res.push(v));
    return res;
  }

  getPattern(id: string): PatternDef | undefined {
    return this.patterns.get(id) as PatternDef | undefined;
  }

  createPattern(name?: string): PatternDef {
    const pat = createDefaultPattern();
    if (name) pat.name = name;
    this.patterns.set(pat.id, pat);
    return pat;
  }

  duplicatePattern(id: string): PatternDef | undefined {
    const src = this.getPattern(id);
    if (!src) return undefined;
    const pat: PatternDef = {
      ...JSON.parse(JSON.stringify(src)),
      id: nanoid(),
      name: src.name + " (copy)",
    };
    this.patterns.set(pat.id, pat);
    return pat;
  }

  setCell(patternId: string, rowId: string, step: number, cell: Cell | undefined) {
    const pat = this.getPattern(patternId);
    if (!pat) return;
    const key = `${rowId}:${step}`;
    const cells = { ...(pat.cells || {}) };
    if (cell === undefined) {
      delete cells[key];
    } else {
      cells[key] = cell;
    }
    pat.cells = cells;
    this.patterns.set(patternId, pat);
  }

  getTracks(): TrackLaneDef[] {
    const res: TrackLaneDef[] = [];
    for (let i = 0; i < this.tracks.length; i++) {
      res.push(this.tracks.get(i) as TrackLaneDef);
    }
    return res;
  }
}

export const projectStore = new ProjectStore();
