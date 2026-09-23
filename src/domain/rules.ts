import { pipesOfStop, stopById, venueById } from "./presets";
import type {
  MeasureStatus,
  PipeState,
  Reading,
  Report,
  ReportPipeRow,
  Session,
} from "./types";

// —— 业务判定模块：阈值、状态推演、结项判定、报告生成 ——

/** 音分偏差允许带：±10 cent，超出即异常 */
export const CENTS_LIMIT = 10;

/** 温湿度结项允许变化：各 10% */
export const ENV_LIMIT_PCT = 10;

/** 提示关注的簧片状态 */
const REED_ATTENTION = new Set(["tune", "aged"]);

export function isAnomaly(cents: number): boolean {
  return Math.abs(cents) > CENTS_LIMIT;
}

export function reedNeedsAttention(reed: string): boolean {
  return REED_ATTENTION.has(reed);
}

/** 由音分偏差反推实测频率：f = f0 × 2^(cent/1200) */
export function centsToHz(nominalHz: number, cents: number): number {
  return nominalHz * Math.pow(2, cents / 1200);
}

/**
 * 相对开工基线的变化百分比。
 * 以基线值为分母，返回 0 表示无基线。
 */
export function variationPct(baseline: number | null, latest: number): number {
  if (baseline === null || baseline === 0) return 0;
  return ((latest - baseline) / Math.abs(baseline)) * 100;
}

export function envVariation(readings: Reading[]): {
  tempVarPct: number;
  humVarPct: number;
  baseline: Reading | null;
  latest: Reading | null;
  envStable: boolean;
} {
  const baseline = readings[0] ?? null;
  const latest = readings[readings.length - 1] ?? null;
  if (!baseline || !latest) {
    return { tempVarPct: 0, humVarPct: 0, baseline, latest, envStable: false };
  }
  const tempVarPct = variationPct(baseline.tempC, latest.tempC);
  const humVarPct = variationPct(baseline.humidityPct, latest.humidityPct);
  const envStable =
    Math.abs(tempVarPct) <= ENV_LIMIT_PCT && Math.abs(humVarPct) <= ENV_LIMIT_PCT;
  return { tempVarPct, humVarPct, baseline, latest, envStable };
}

/** 开工后必须先登记环境读数，音管才能测量 */
export function canMeasure(session: Session): boolean {
  return session.readings.length > 0;
}

function rowFor(report: Omit<ReportPipeRow, "anomaly">): ReportPipeRow {
  const cents = report.cents;
  return { ...report, anomaly: cents !== null && isAnomaly(cents) };
}

/**
 * 结项判定：
 * 1. 该音栓全部音管已测（含复测通过）；
 * 2. 温度、湿度相对基线各自变化不超过一成。
 */
export function evaluateStop(session: Session, stopId: string) {
  const defs = pipesOfStop(stopId);
  const states = defs.map((d) => session.pipes[d.id]);
  const measuredCount = states.filter((s) => s.status === "measured").length;
  const recheckCount = states.filter((s) => s.status === "recheck").length;
  const alreadyClosed = Boolean(session.closed[stopId]);

  const reasons: string[] = [];
  if (session.readings.length === 0) reasons.push("尚未登记开工环境读数");
  if (measuredCount < defs.length) {
    const left = defs.length - measuredCount;
    reasons.push(`尚有 ${left} 根音管未完成测量${recheckCount > 0 ? `（其中 ${recheckCount} 根待复测）` : ""}`);
  }
  const env = envVariation(session.readings);
  if (session.readings.length > 0 && !env.envStable) {
    reasons.push(
      `环境超带：温度 ${formatSigned(env.tempVarPct, 1)}%、湿度 ${formatSigned(env.humVarPct, 1)}%（限值 ±${ENV_LIMIT_PCT}%）`,
    );
  }

  const closable = reasons.length === 0 && !alreadyClosed;
  return { measuredCount, recheckCount, env, closable, reasons, alreadyClosed };
}

function buildRows(session: Session, stopId: string): ReportPipeRow[] {
  return pipesOfStop(stopId).map((def) => {
    const st = session.pipes[def.id];
    const m = st.current;
    return rowFor({
      pipeId: def.id,
      code: def.code,
      nominalHz: def.nominalHz,
      measuredHz: m ? centsToHz(def.nominalHz, m.cents) : null,
      cents: m ? m.cents : null,
      reed: m ? m.reed : null,
      note: m?.note ?? "",
      status: st.status,
    });
  });
}

/**
 * 生成音栓报告：偏差表、异常标记、单次报告同源，
 * 界面与存档共用这一份快照数据。
 */
export function buildReport(session: Session, stopId: string, now: number): Report {
  const stop = stopById(stopId);
  const venue = venueById(session.venueId);
  const defs = pipesOfStop(stopId);
  const env = envVariation(session.readings);
  const evaluation = evaluateStop(session, stopId);
  const rows = buildRows(session, stopId);
  const anomalyCount = rows.filter((r) => r.anomaly).length;
  const reedAttentionCount = rows.filter((r) => r.reed !== null && reedNeedsAttention(r.reed)).length;

  return {
    id: `rpt-${stopId}-${now.toString(36)}`,
    archivedAt: null,
    venueId: venue.id,
    venueName: venue.name,
    stopId,
    stopName: stop.name,
    stopLabel: stop.label,
    sessionStartedAt: session.startedAt,
    generatedAt: now,
    baseline: env.baseline ?? null,
    latest: env.latest ?? null,
    tempVarPct: env.tempVarPct,
    humVarPct: env.humVarPct,
    envStable: env.envStable,
    total: defs.length,
    measuredCount: evaluation.measuredCount,
    recheckCount: evaluation.recheckCount,
    anomalyCount,
    reedAttentionCount,
    rows,
    isClosed: evaluation.alreadyClosed,
    closable: evaluation.closable,
    reasons: evaluation.reasons,
  };
}

/** 新音栓加入时构造初始音管状态 */
export function freshPipeState(): PipeState {
  return { status: "unmeasured", current: null, stale: null };
}

export function statusWeight(status: MeasureStatus): number {
  return status === "measured" ? 2 : status === "recheck" ? 1 : 0;
}

export function formatSigned(value: number, digits = 1): string {
  const n = Math.abs(value) < 0.05 ? 0 : value;
  return `${n > 0 ? "+" : ""}${n.toFixed(digits)}`;
}

export function formatDateTime(ts: number): string {
  const d = new Date(ts);
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
