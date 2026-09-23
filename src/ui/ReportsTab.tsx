import { pipesOfStop, stopsOfVenue } from "../data/catalog";
import { ABNORMAL_CENT, ENV_DRIFT_LIMIT, buildStopReport } from "../domain/rules";
import type { ArchivedReport, VenueRuntime } from "../types";
import { formatCent, formatHz, formatPct, formatTime } from "./format";

interface ReportsTabProps {
  venueId: string;
  runtime: VenueRuntime;
  archives: ArchivedReport[];
  onClose: (stopId: string) => void;
}

export default function ReportsTab({ venueId, runtime, archives, onClose }: ReportsTabProps) {
  const stops = stopsOfVenue(venueId);

  return (
    <div className="reports">
      {stops.map((stop) => {
        const report = buildStopReport(stop.id, runtime);
        const archive = archives.find((item) => item.stopId === stop.id);
        const pipes = pipesOfStop(stop.id);

        return (
          <section className="panel report-panel" key={stop.id}>
            <div className="heading">
              <div>
                <p>单次维护报告</p>
                <h2>
                  {stop.name} <small>{stop.kind} · {stop.rank}</small>
                </h2>
              </div>
              {archive ? (
                <span className="badge archived">已于 {formatTime(archive.archivedAt)} 结项存档</span>
              ) : (
                <button
                  className="primary"
                  disabled={!report.canClose}
                  title={report.canClose ? "结项并冻结报告到存档" : "结项条件尚未全部满足"}
                  onClick={() => onClose(stop.id)}
                >
                  结项存档
                </button>
              )}
            </div>

            {/* 调音偏差表：与异常标记、本报告共用 buildStopReport 同一数据源 */}
            <table className="deviation-table">
              <thead>
                <tr>
                  <th>音管</th>
                  <th>标称音高 / 频率</th>
                  <th>音分偏差</th>
                  <th>实测频率</th>
                  <th>簧片</th>
                  <th>状态</th>
                  <th>异常标记</th>
                  <th>备注</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row) => (
                  <tr
                    key={row.pipe.id}
                    className={row.abnormal ? "row-danger" : row.measurement && Math.abs(row.measurement.deviation) >= 5 ? "row-warn" : ""}
                  >
                    <td>
                      <strong>{row.pipe.code}</strong> {row.pipe.pitchName}
                    </td>
                    <td className="muted">{formatHz(row.pipe.frequency)}</td>
                    <td>{row.measurement ? formatCent(row.measurement.deviation) : "—"}</td>
                    <td>{row.measurement ? formatHz(row.measurement.measuredFrequency) : "—"}</td>
                    <td>{row.measurement?.reedStatus ?? (row.pipe.reed ? "未记录" : "无簧片")}</td>
                    <td>
                      <span className={`badge status-${row.status}`}>{row.status}</span>
                    </td>
                    <td>
                      {row.abnormal ? (
                        <span className="badge flag-danger">偏差 ≥ {ABNORMAL_CENT} 音分</span>
                      ) : row.measurement && Math.abs(row.measurement.deviation) >= 5 ? (
                        <span className="badge flag-warn">临界关注</span>
                      ) : (
                        <span className="muted">正常</span>
                      )}
                    </td>
                    <td className="note-cell">{row.measurement?.note || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="report-foot">
              <ul className="check-list">
                {report.checks.map((check) => (
                  <li key={check.label} className={check.pass ? "pass" : "fail"}>
                    <span className="check-icon">{check.pass ? "✓" : "✕"}</span>
                    <div>
                      <strong>{check.label}</strong>
                      <small>{check.detail}</small>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="report-summary">
                <h3>结项判定</h3>
                <p>
                  音管 {report.measuredCount}/{report.total} 已测 · 待复测 {report.pendingRetest} · 异常{" "}
                  {report.abnormalCount}
                </p>
                <p className="muted">
                  温度变化 {formatPct(report.temperaturePct)} / 湿度变化 {formatPct(report.humidityPct)}，
                  同音栓全部测完且温湿度各自变化不超过 {ENV_DRIFT_LIMIT}% 才能结项。
                </p>
                {report.canClose ? (
                  <p className="verdict ok">判定通过，可以结项</p>
                ) : (
                  <p className="verdict bad">判定未通过，暂不能结项</p>
                )}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
