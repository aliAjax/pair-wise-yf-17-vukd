import { pipesOfStop } from "../data/catalog";
import type {
  ArchivedReport,
  Measurement,
  PipeDef,
  Reading,
  ReportCheck,
  StopReport,
  VenueRuntime,
} from "../types";

// ============ 判定模块（纯函数业务规则，不接触存储与界面） ============

/** 偏差异常阈值：|音分偏差| ≥ 10 音分视为异常，5–10 为临界关注 */
export const ABNORMAL_CENT = 10;
export const WARN_CENT = 5;
/** 结项允许的温湿度相对变化：各 ≤ 10% */
export const ENV_DRIFT_LIMIT = 10;

export const isAbnormal = (deviation: number) =>
  Math.abs(deviation) >= ABNORMAL_CENT;

export const isWarn = (deviation: number) =>
  !isAbnormal(deviation) && Math.abs(deviation) >= WARN_CENT;

/** cent = 1200 · log2(f2/f1)，由偏差反算实测频率 */
export const frequencyFromCent = (nominal: number, deviation: number) =>
  nominal * Math.pow(2, deviation / 1200);

export const centFromFrequency = (nominal: number, measured: number) =>
  1200 * Math.log2(measured / nominal);

/**
 * 温湿度变化（百分比，相对维护开始时的第一条基准读数）。
 * 温度先换算为开尔文再做相对差，避免接近 0°C 时比例失真。
 */
export function envDriftPct(
  readings: Reading[],
): { temperature: number | null; humidity: number | null } {
  const baseline = readings[0];
  const latest = readings[readings.length - 1];
  if (!baseline || !latest) return { temperature: null, humidity: null };
  const baseKelvin = baseline.temperature + 273.15;
  const latestKelvin = latest.temperature + 273.15;
  return {
    temperature: (Math.abs(latestKelvin - baseKelvin) / baseKelvin) * 100,
    humidity:
      baseline.humidity === 0
        ? latest.humidity === 0
          ? 0
          : null
        : (Math.abs(latest.humidity - baseline.humidity) / baseline.humidity) *
          100,
  };
}

export function latestMeasurement(
  pipeId: string,
  runtime?: VenueRuntime,
): Measurement | null {
  const list = runtime?.pipes[pipeId]?.measurements ?? [];
  return list.length ? list[list.length - 1] : null;
}

export type PipeStatus = "待测" | "已测" | "待复测";

/** 已测但当前值被环境变更封存只读 → 待复测；新补测的 unsealed 值即恢复为已测 */
export function pipeStatus(pipeId: string, runtime?: VenueRuntime): PipeStatus {
  const latest = latestMeasurement(pipeId, runtime);
  if (!latest) return "待测";
  return latest.sealed ? "待复测" : "已测";
}

function reportChecks(report: Omit<StopReport, "checks" | "canClose">): ReportCheck[] {
  const { baseline, total, measuredCount, pendingRetest, abnormalCount, temperaturePct, humidityPct } =
    report;
  const checks: ReportCheck[] = [];

  if (!baseline) {
    checks.push({ label: "环境读数", pass: false, detail: "维护开始前尚未填写温湿度读数" });
  } else {
    checks.push({
      label: "环境读数",
      pass: true,
      detail: `基准读数 ${baseline.time.slice(0, 16).replace("T", " ")}：${baseline.temperature}°C / ${baseline.humidity}%`,
    });
  }

  const allMeasured = total > 0 && measuredCount === total;
  checks.push({
    label: "音管测完",
    pass: allMeasured,
    detail: `本音栓 ${measuredCount}/${total} 根音管已测`,
  });

  checks.push({
    label: "无待复测",
    pass: pendingRetest === 0,
    detail:
      pendingRetest === 0
        ? "没有因环境读数变化而待复测的音管"
        : `${pendingRetest} 根音管待复测（原测量值已只读封存）`,
  });

  checks.push({
    label: "温度变化",
    pass: temperaturePct !== null && temperaturePct <= ENV_DRIFT_LIMIT,
    detail:
      temperaturePct === null
        ? "缺少读数，无法计算"
        : `相对基准变化 ${temperaturePct.toFixed(2)}%（限值 ${ENV_DRIFT_LIMIT}%）`,
  });

  checks.push({
    label: "湿度变化",
    pass: humidityPct !== null && humidityPct <= ENV_DRIFT_LIMIT,
    detail:
      humidityPct === null
        ? "缺少读数，无法计算"
        : `相对基准变化 ${humidityPct.toFixed(2)}%（限值 ${ENV_DRIFT_LIMIT}%）`,
  });

  checks.push({
    label: "异常复核",
    pass: abnormalCount === 0,
    detail: abnormalCount === 0 ? "无偏差超限音管" : `${abnormalCount} 根音管偏差 ≥ ${ABNORMAL_CENT} 音分`,
  });

  return checks;
}

/** 由实时数据投影单个音栓的维护报告：偏差表、异常标记、结项判定全部从这里取数，保证同步 */
export function buildStopReport(
  stopId: string,
  runtime: VenueRuntime | undefined,
): StopReport {
  const pipes = pipesOfStop(stopId);
  const readings = runtime?.readings ?? [];
  const baseline = readings[0] ?? null;
  const drift = envDriftPct(readings);

  const rows = pipes.map((pipe: PipeDef) => {
    const measurement = latestMeasurement(pipe.id, runtime);
    const status = pipeStatus(pipe.id, runtime);
    return {
      pipe,
      measurement,
      status,
      abnormal: measurement ? !measurement.sealed && isAbnormal(measurement.deviation) : false,
    };
  });

  const partial = {
    venueId: pipes[0]?.venueId ?? "",
    stopId,
    readings,
    baseline,
    temperaturePct: drift.temperature,
    humidityPct: drift.humidity,
    rows,
    total: rows.length,
    measuredCount: rows.filter((row) => row.measurement).length,
    pendingRetest: rows.filter((row) => row.status === "待复测").length,
    abnormalCount: rows.filter((row) => row.abnormal).length,
  };

  const checks = reportChecks(partial);
  return { ...partial, checks, canClose: checks.every((check) => check.pass) };
}

/** 结项快照：存档模块把实时报告冻结 */
export function freezeReport(
  report: StopReport,
  id: string,
  archivedAt: string,
): ArchivedReport {
  return { ...structuredClone(report), id, archivedAt };
}
