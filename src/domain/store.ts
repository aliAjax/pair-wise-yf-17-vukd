import { PIPES, VENUES, stopsOfVenue } from "../data/catalog";
import { buildStopReport, frequencyFromCent, freezeReport } from "./rules";
import type {
  ArchivedReport,
  Measurement,
  MeasurementInput,
  PersistState,
  Reading,
  ReadingInput,
  VenueRuntime,
} from "../types";

// ============ 存档业务模块：localStorage 持久化、状态流转、结项/归档 ============

const STORAGE_KEY = "organ-tuning-console:v1";

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function emptyVenueRuntime(): VenueRuntime {
  return {
    readings: [],
    pipes: Object.fromEntries(
      PIPES.map((pipe) => [pipe.id, { measurements: [] as Measurement[] }]),
    ),
  };
}

export function initialState(): PersistState {
  return {
    runtime: Object.fromEntries(VENUES.map((venue) => [venue.id, emptyVenueRuntime()])),
    archives: [],
  };
}

export function loadState(): PersistState {
  const fallback = initialState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PersistState>;
    return {
      runtime: { ...fallback.runtime, ...(parsed.runtime ?? {}) },
      archives: Array.isArray(parsed.archives) ? parsed.archives : [],
    };
  } catch {
    return fallback;
  }
}

export function saveState(state: PersistState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 存储不可用时仅内存保留，不阻塞调音操作
  }
}

/**
 * 追加或改动环境读数时的核心规则：
 * 该场馆下所有已测音管的「当前测量值」全部转为待复测，原值 sealed=true 只读保留；
 * 尚未测量的音管不受影响。单管复核时不走这里，只恢复本管。
 */
function sealMeasuredPipes(runtime: VenueRuntime): VenueRuntime {
  const pipes: VenueRuntime["pipes"] = {};
  for (const key of Object.keys(runtime.pipes)) {
    const measurements = runtime.pipes[key].measurements.map((m) =>
      m.sealed ? m : { ...m, sealed: true },
    );
    pipes[key] = { measurements };
  }
  return { ...runtime, pipes };
}

export function addReading(
  state: PersistState,
  venueId: string,
  input: ReadingInput,
): PersistState {
  const current = state.runtime[venueId] ?? emptyVenueRuntime();
  const hadReadings = current.readings.length > 0;
  const reading: Reading = { id: makeId("r"), ...input };
  const readings = [...current.readings, reading].sort((a, b) =>
    a.time.localeCompare(b.time),
  );
  // 维护开始的第一条读数不需要封存；其后追加读数封存全部已测音管
  const next = hadReadings ? sealMeasuredPipes(current) : current;
  return {
    ...state,
    runtime: { ...state.runtime, [venueId]: { ...next, readings } },
  };
}

export function updateReading(
  state: PersistState,
  venueId: string,
  readingId: string,
  input: ReadingInput,
): PersistState {
  const current = state.runtime[venueId] ?? emptyVenueRuntime();
  const readings = current.readings
    .map((reading) => (reading.id === readingId ? { ...reading, ...input } : reading))
    .sort((a, b) => a.time.localeCompare(b.time));
  // 改动任何环境读数（含基准读数）→ 已测音管全部转为待复测
  const sealed = sealMeasuredPipes(current);
  return {
    ...state,
    runtime: { ...state.runtime, [venueId]: { ...sealed, readings } },
  };
}

export function deleteReading(
  state: PersistState,
  venueId: string,
  readingId: string,
): PersistState {
  const current = state.runtime[venueId] ?? emptyVenueRuntime();
  const readings = current.readings.filter((reading) => reading.id !== readingId);
  const sealed = sealMeasuredPipes(current);
  return {
    ...state,
    runtime: { ...state.runtime, [venueId]: { ...sealed, readings } },
  };
}

/**
 * 保存单管测量。同一已封存原值之后追加一条 unsealed 记录：
 * 只恢复本管，其他待复测音管不受影响。
 */
export function saveMeasurement(
  state: PersistState,
  venueId: string,
  pipeId: string,
  input: MeasurementInput,
): PersistState {
  const current = state.runtime[venueId] ?? emptyVenueRuntime();
  const pipe = current.pipes[pipeId] ?? { measurements: [] };
  const pipeDef = PIPES.find((p) => p.id === pipeId);
  const measurement: Measurement = {
    id: makeId("m"),
    time: new Date().toISOString().slice(0, 16),
    deviation: input.deviation,
    measuredFrequency: pipeDef
      ? frequencyFromCent(pipeDef.frequency, input.deviation)
      : 0,
    reedStatus: input.reedStatus,
    note: input.note,
    sealed: false,
  };
  return {
    ...state,
    runtime: {
      ...state.runtime,
      [venueId]: {
        ...current,
        pipes: {
          ...current.pipes,
          [pipeId]: { measurements: [...pipe.measurements, measurement] },
        },
      },
    },
  };
}

/** 结项：校验通过则把该音栓报告冻结进存档 */
export function archiveStop(
  state: PersistState,
  venueId: string,
  stopId: string,
): { state: PersistState; report?: ArchivedReport } {
  const report = buildStopReport(stopId, state.runtime[venueId]);
  if (!report.canClose) return { state };
  const archived = freezeReport(report, makeId("arc"), new Date().toISOString());
  return {
    state: {
      ...state,
      archives: [archived, ...state.archives],
    },
    report: archived,
  };
}

export function removeArchive(state: PersistState, archiveId: string): PersistState {
  return { ...state, archives: state.archives.filter((item) => item.id !== archiveId) };
}

export function stopIsArchived(state: PersistState, stopId: string): ArchivedReport | undefined {
  return state.archives.find((item) => item.stopId === stopId);
}

export const venuesForRuntime = stopsOfVenue;
