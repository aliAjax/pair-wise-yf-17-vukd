import { useState } from "react";
import { stopDef, venueName } from "../data/catalog";
import type { ArchivedReport } from "../types";
import { formatCent, formatHz, formatPct, formatTime } from "./format";

interface ArchivesTabProps {
  archives: ArchivedReport[];
  onRemove: (archiveId: string) => void;
}

export default function ArchivesTab({ archives, onRemove }: ArchivesTabProps) {
  const [openId, setOpenId] = useState<string | null>(archives[0]?.id ?? null);

  if (archives.length === 0) {
    return (
      <section className="panel empty-archive">
        <h2>维护存档</h2>
        <p className="muted">
          暂无已结项的单次维护报告。请在「维护报告」页满足结项条件后点击“结项存档”，报告会冻结在此处。
        </p>
      </section>
    );
  }

  return (
    <div className="archives">
      {archives.map((report) => {
        const stop = stopDef(report.stopId);
        const open = openId === report.id;
        return (
          <section className="panel archive-card" key={report.id}>
            <div className="heading archive-head">
              <div>
                <p>存档报告 · {formatTime(report.archivedAt)}</p>
                <h2>
                  {venueName(report.venueId)} · {stop?.name ?? report.stopId}
                </h2>
                <p className="muted">
                  {report.measuredCount}/{report.total} 管已测 · 异常 {report.abnormalCount} · 温度变化{" "}
                  {formatPct(report.temperaturePct)} · 湿度变化 {formatPct(report.humidityPct)}
                </p>
              </div>
              <div className="form-actions">
                <button className="small" onClick={() => setOpenId(open ? null : report.id)}>
                  {open ? "收起" : "查看报告"}
                </button>
                <button
                  className="small ghost danger"
                  onClick={() => {
                    if (window.confirm("删除该存档？删除后该音栓可重新结项，历史测量数据仍保留。")) {
                      onRemove(report.id);
                    }
                  }}
                >
                  删除存档
                </button>
              </div>
            </div>

            {open && (
              <div className="archive-body">
                <table className="deviation-table">
                  <thead>
                    <tr>
                      <th>音管</th>
                      <th>音分偏差</th>
                      <th>实测频率</th>
                      <th>簧片</th>
                      <th>状态</th>
                      <th>备注</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map((row) => (
                      <tr key={row.pipe.id} className={row.abnormal ? "row-danger" : ""}>
                        <td>
                          <strong>{row.pipe.code}</strong> {row.pipe.pitchName}
                        </td>
                        <td>{row.measurement ? formatCent(row.measurement.deviation) : "—"}</td>
                        <td>{row.measurement ? formatHz(row.measurement.measuredFrequency) : "—"}</td>
                        <td>{row.measurement?.reedStatus ?? (row.pipe.reed ? "未记录" : "无簧片")}</td>
                        <td>{row.status}</td>
                        <td className="note-cell">{row.measurement?.note || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
