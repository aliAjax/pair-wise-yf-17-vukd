// 管风琴音管调音台 —— 领域模型定义

/** 音管发声方式：flue 唇管（无簧片）/ reed 簧管 */
export type PipeKind = "flue" | "reed";

/** 簧片状态 */
export type ReedStatus = "none" | "ok" | "tune" | "aged";

/** 音管测量状态：未测 / 已测 / 待复测 */
export type MeasureStatus = "unmeasured" | "measured" | "recheck";

export interface Venue {
  id: string;
  name: string;
  organ: string;
}

export interface StopDef {
  id: string;
  venueId: string;
  name: string;
  label: string;
  kind: PipeKind;
}

export interface PipeDef {
  id: string;
  stopId: string;
  /** 音管编号 / 音名 */
  code: string;
  /** 标称频率 Hz */
  nominalHz: number;
}

export interface Reading {
  id: string;
  /** 记录时刻 ms */
  at: number;
  tempC: number;
  humidityPct: number;
}

/** 一次测量值 */
export interface Measure {
  /** 音分偏差 */
  cents: number;
  reed: ReedStatus;
  note: string;
  /** 测量时所依据的环境读数 id */
  readingId: string;
  at: number;
}

export interface PipeState {
  status: MeasureStatus;
  /** 当前生效测量值（已测时有值） */
  current: Measure | null;
  /** 环境读数追加/改动后冻结的原值（待复测时只读展示） */
  stale: Measure | null;
}

export interface ClosedStop {
  at: number;
  reportId: string;
}

export interface Session {
  id: string;
  venueId: string;
  startedAt: number;
  /** 按时间排列，第一条为开工基线 */
  readings: Reading[];
  pipes: Record<string, PipeState>;
  closed: Record<string, ClosedStop>;
}

export interface ReportPipeRow {
  pipeId: string;
  code: string;
  nominalHz: number;
  measuredHz: number | null;
  cents: number | null;
  reed: ReedStatus | null;
  note: string;
  status: MeasureStatus;
  anomaly: boolean;
}

export interface Report {
  id: string;
  /** null 表示实时报告；存档时写入时间戳 */
  archivedAt: number | null;
  venueId: string;
  venueName: string;
  stopId: string;
  stopName: string;
  stopLabel: string;
  sessionStartedAt: number;
  generatedAt: number;
  baseline: Reading | null;
  latest: Reading | null;
  tempVarPct: number;
  humVarPct: number;
  envStable: boolean;
  total: number;
  measuredCount: number;
  recheckCount: number;
  anomalyCount: number;
  reedAttentionCount: number;
  rows: ReportPipeRow[];
  isClosed: boolean;
  closable: boolean;
  reasons: string[];
}

export interface PersistState {
  version: 1;
  session: Session | null;
  archive: Report[];
}
