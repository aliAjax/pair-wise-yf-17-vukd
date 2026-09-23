import { defaultReed, pipesOfStop, stopsOfVenue } from "./presets";
import { buildReport, freshPipeState } from "./rules";
import type {
  PersistState,
  PipeState,
  Reading,
  ReedStatus,
  Report,
  Session,
} from "./types";

// —— 存档模块：维护会话的状态流转 + 浏览器持久化 ——

const STORAGE_KEY = "organ-tuner-state-v1";
const STORAGE_VERSION = 1 as const;

let idCounter = 0;
function uid(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

export interface StartSessionInput {
  venueId: string;
  at: number;
}

export interface AddReadingInput {
  tempC: number;
  humidityPct: number;
  at: number;
}

export interface EditReadingInput {
  readingId: string;
  tempC: number;
  humidityPct: number;
}

export interface SaveMeasureInput {
  pipeId: string;
  cents: number;
  reed: ReedStatus;
  note: string;
  readingId: string;
  at: number;
}

export type Action =
  | { type: "start"; input: StartSessionInput }
  | { type: "addReading"; input: AddReadingInput }
  | { type: "editReading"; input: EditReadingInput }
  | { type: "saveMeasure"; input: SaveMeasureInput }
  | { type: "recheckPipe"; pipeId: string }
  | { type: "closeStop"; stopId: string; at: number }
  | { type: "finishSession" }
  | { type: "load"; state: PersistState };

function createSession({ venueId, at }: StartSessionInput): Session {
  const pipes: Record<string, PipeState> = {};
  for (const stop of stopsOfVenue(venueId)) {
    for (const pipeDef of pipesOfStop(stop.id)) {
      pipes[pipeDef.id] = freshPipeState();
    }
  }
  return { id: uid("sess"), venueId, startedAt: at, readings: [], pipes, closed: {} };
}

/**
 * 环境读数追加或改动：
 * 已测音管全部转为「待复测」，原测量值冻结为只读；
 * 已结项音栓不再参与复测。
 */
function invalidateMeasured(
  pipes: Record<string, PipeState>,
  closedStopIds: Set<string>,
  editedPipeStopMap?: Map<string, string>,
): Record<string, PipeState> {
  const next: Record<string, PipeState> = {};
  for (const [pipeId, st] of Object.entries(pipes)) {
    const stopId = editedPipeStopMap?.get(pipeId);
    const isClosed = stopId ? closedStopIds.has(stopId) : false;
    if (st.status === "measured" && st.current && !isClosed) {
      next[pipeId] = { status: "recheck", current: null, stale: st.current };
    } else {
      next[pipeId] = st;
    }
  }
  return next;
}

function pipeStopIndex(session: Session): Map<string, string> {
  const map = new Map<string, string>();
  for (const stop of stopsOfVenue(session.venueId)) {
    for (const p of pipesOfStop(stop.id)) map.set(p.id, stop.id);
  }
  return map;
}

export function reducer(state: PersistState, action: Action): PersistState {
  switch (action.type) {
    case "load":
      return action.state;

    case "start": {
      return { ...state, session: createSession(action.input) };
    }

    case "addReading": {
      const session = state.session;
      if (!session) return state;
      const reading: Reading = {
        id: uid("rd"),
        at: action.input.at,
        tempC: action.input.tempC,
        humidityPct: action.input.humidityPct,
      };
      const closed = new Set(Object.keys(session.closed));
      const pipes = invalidateMeasured(session.pipes, closed, pipeStopIndex(session));
      return { ...state, session: { ...session, readings: [...session.readings, reading], pipes } };
    }

    case "editReading": {
      const session = state.session;
      if (!session) return state;
      let changed = false;
      const readings = session.readings.map((r) => {
        if (r.id !== action.input.readingId) return r;
        if (r.tempC === action.input.tempC && r.humidityPct === action.input.humidityPct) return r;
        changed = true;
        return { ...r, tempC: action.input.tempC, humidityPct: action.input.humidityPct };
      });
      if (!changed) return state;
      const closed = new Set(Object.keys(session.closed));
      const pipes = invalidateMeasured(session.pipes, closed, pipeStopIndex(session));
      return { ...state, session: { ...session, readings, pipes } };
    }

    case "saveMeasure": {
      const session = state.session;
      if (!session || session.readings.length === 0) return state;
      const { input } = action;
      const st = session.pipes[input.pipeId];
      if (!st || session.closed[stopIdOfPipe(session, input.pipeId)]) return state;
      const measure = {
        cents: input.cents,
        reed: input.reed,
        note: input.note,
        readingId: input.readingId,
        at: input.at,
      };
      return {
        ...state,
        session: {
          ...session,
          pipes: {
            ...session.pipes,
            // 单管复核只恢复本管：写入当前值，状态回到已测，冻结值清掉
            [input.pipeId]: { status: "measured", current: measure, stale: null },
          },
        },
      };
    }

    case "recheckPipe": {
      const session = state.session;
      if (!session) return state;
      const st = session.pipes[action.pipeId];
      if (!st || !st.current) return state;
      return {
        ...state,
        session: {
          ...session,
          pipes: {
            ...session.pipes,
            [action.pipeId]: { status: "recheck", current: null, stale: st.current },
          },
        },
      };
    }

    case "closeStop": {
      const session = state.session;
      if (!session || session.closed[action.stopId]) return state;
      const report: Report = {
        ...buildReport(session, action.stopId, action.at),
        archivedAt: action.at,
      };
      if (!report.closable) return state;
      return {
        version: STORAGE_VERSION,
        session: {
          ...session,
          closed: { ...session.closed, [action.stopId]: { at: action.at, reportId: report.id } },
        },
        archive: [report, ...state.archive],
      };
    }

    case "finishSession":
      return { ...state, session: null };

    default:
      return state;
  }
}

function stopIdOfPipe(session: Session, pipeId: string): string {
  for (const stop of stopsOfVenue(session.venueId)) {
    if (pipesOfStop(stop.id).some((p) => p.id === pipeId)) return stop.id;
  }
  return "";
}

export function initialPipeDraft(session: Session, pipeId: string, stopKind: "flue" | "reed") {
  const st = session.pipes[pipeId];
  const source = st.current ?? st.stale;
  const latest = session.readings[session.readings.length - 1];
  return {
    cents: source?.cents ?? 0,
    reed: source?.reed ?? defaultReed(stopKind),
    note: source?.note ?? "",
    readingId: latest?.id ?? "",
  };
}

export function emptyState(): PersistState {
  return { version: STORAGE_VERSION, session: null, archive: [] };
}

export function loadState(): PersistState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as PersistState;
    if (parsed.version !== STORAGE_VERSION || !parsed.archive) return emptyState();
    return parsed;
  } catch {
    return emptyState();
  }
}

export function saveState(state: PersistState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 存储不可用时静默降级，只影响刷新后的保留
  }
}
