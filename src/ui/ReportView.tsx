import { CENTS_LIMIT, ENV_LIMIT_PCT, formatDateTime, formatSigned } from "../domain/rules";
import { reedLabel, STATUS_LABEL } from "../domain/presets";
import type { Report } from "../domain/types";

interface ReportViewProps {
  report: Report;
  onClose?: () => void;
  archived?: boolean;
}

/** 单次维护报告：实时会话与存档快照共用同一展示组件，保证偏差表/异常标记/报告同源 */
export function ReportView({ report, onClose, archived }: ReportViewProps) {
  return (
    <div className="report">
      <div className="report-head">
        <div>
          <p className="eyebrow">{archived ? "已结项存档" : "单次维护报告 · 实时同步"}</p>
          <h3>
            {report.venueName} · {report.stopName}
          </h3>
          <small>
            开工 {formatDateTime(report.sessionStartedAt)} · {archived && report.archivedAt ? `结项 ${formatDateTime(report.archivedAt)}` : `更新 ${formatDateTime(report.generatedAt)}`}
          </small>
        </div>
        {onClose && (
          <button className="primary" disabled={!report.closable} onClick={onClose} title={report.closable ? "" : report.reasons.join("；")}>
            结项并存档
          </button>
        )}
      </div>

      <div className="report-judge">
        {report.isClosed ? (
          <p className="ok">本音栓已结项，数据已锁定归档。</p>
        ) : report.closable ? (
          <p className="ok">✓ 满足结项条件：全部音管已测，温湿度变化均未超过 {ENV_LIMIT_PCT}%。</p>
        ) : (
          <div className="block-list">
            <p className="bad">暂不可结项：</p>
            <ul>
              {report.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="report-stats">
        <div>
          <small>已测 / 总数</small>
          <strong>
            {report.measuredCount}/{report.total}
          </strong>
        </div>
        <div>
          <small>待复测</small>
          <strong className={report.recheckCount > 0 ? "warn" : ""}>{report.recheckCount}</strong>
        </div>
        <div>
          <small>偏差超限</small>
          <strong className={report.anomalyCount > 0 ? "bad-text" : ""}>{report.anomalyCount}</strong>
        </div>
        <div>
          <small>簧片关注</small>
          <strong className={report.reedAttentionCount > 0 ? "warn" : ""}>{report.reedAttentionCount}</strong>
        </div>
      </div>

      <div className="env-strip">
        <span>
          温度变化 <b className={Math.abs(report.tempVarPct) > ENV_LIMIT_PCT ? "bad-text" : ""}>{formatSigned(report.tempVarPct)}%</b>
        </span>
        <span>
          湿度变化 <b className={Math.abs(report.humVarPct) > ENV_LIMIT_PCT ? "bad-text" : ""}>{formatSigned(report.humVarPct)}%</b>
        </span>
        <small>
          {report.baseline && report.latest
            ? `基线 ${report.baseline.tempC}℃ / ${report.baseline.humidityPct}% → 最新 ${report.latest.tempC}℃ / ${report.latest.humidityPct}%`
            : "尚无环境读数"}
        </small>
      </div>

      <table className="report-table">
        <thead>
          <tr>
            <th>音管</th>
            <th>偏差(cent)</th>
            <th>实测(Hz)</th>
            <th>簧片</th>
            <th>状态</th>
            <th>备注</th>
          </tr>
        </thead>
        <tbody>
          {report.rows.map((row) => (
            <tr key={row.pipeId} className={row.anomaly ? "row-anomaly" : ""}>
              <td>
                {row.code}
                {row.anomaly && <em className="flag">异常</em>}
              </td>
              <td className={row.anomaly ? "bad-text" : ""}>{row.cents === null ? "—" : formatSigned(row.cents)}</td>
              <td>{row.measuredHz === null ? "—" : row.measuredHz.toFixed(2)}</td>
              <td>{row.reed === null ? "—" : reedLabel(row.reed)}</td>
              <td>
                <span className={`pill status-${row.status}`}>{STATUS_LABEL[row.status]}</span>
              </td>
              <td className="note-cell">{row.note || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="report-foot">偏差限值 ±{CENTS_LIMIT} cent · 结项环境限值 ±{ENV_LIMIT_PCT}%（温度、湿度各自计算）</p>
    </div>
  );
}
