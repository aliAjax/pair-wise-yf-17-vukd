import { Fragment, useEffect, useState } from "react";
import { CENTS_LIMIT, centsToHz, formatDateTime, formatSigned } from "../domain/rules";
import { REED_OPTIONS, reedLabel, STATUS_LABEL } from "../domain/presets";
import type { SaveMeasureInput } from "../domain/store";
import type { PipeDef, PipeState, Reading, ReedStatus, StopDef } from "../domain/types";

interface PipeTableProps {
  stop: StopDef;
  pipes: PipeDef[];
  state: Record<string, PipeState>;
  readings: Reading[];
  closed: boolean;
  onSave: (input: SaveMeasureInput) => void;
  onRecheck: (pipeId: string) => void;
}

interface Draft {
  cents: string;
  reed: ReedStatus;
  note: string;
  readingId: string;
}

function PipeMeasureForm({
  pipe,
  pipeState,
  stop,
  readings,
  onSave,
  onCancel,
}: {
  pipe: PipeDef;
  pipeState: PipeState;
  stop: StopDef;
  readings: Reading[];
  onSave: (input: SaveMeasureInput) => void;
  onCancel: () => void;
}) {
  const source = pipeState.current ?? pipeState.stale;
  const [draft, setDraft] = useState<Draft>(() => ({
    cents: source ? String(source.cents) : "0",
    reed: source?.reed ?? (stop.kind === "reed" ? "ok" : "none"),
    note: source?.note ?? "",
    readingId: readings[readings.length - 1]?.id ?? "",
  }));

  // 冻结值仅用于展示参照，复测默认带出但可改
  useEffect(() => {
    if (!draft.readingId && readings.length) {
      setDraft((d) => ({ ...d, readingId: readings[readings.length - 1].id }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readings.length]);

  const centsNum = Number(draft.cents);
  const centsValid = draft.cents.trim() !== "" && Number.isFinite(centsNum);
  const valid = centsValid && draft.readingId !== "";
  const anomaly = centsValid && Math.abs(centsNum) > CENTS_LIMIT;

  return (
    <tr className="measure-row">
      <td colSpan={6}>
        <div className="measure-form">
          <label>
            <span>音分偏差 cent</span>
            <input type="number" step="0.1" value={draft.cents} onChange={(e) => setDraft({ ...draft, cents: e.target.value })} />
          </label>
          <div className={`derived ${anomaly ? "bad-text" : ""}`}>
            <small>实测频率</small>
            <b>{centsValid ? centsToHz(pipe.nominalHz, centsNum).toFixed(2) : "—"} Hz</b>
            {anomaly && <em>超出 ±{CENTS_LIMIT} cent</em>}
          </div>
          <label>
            <span>簧片</span>
            <select value={draft.reed} onChange={(e) => setDraft({ ...draft, reed: e.target.value as ReedStatus })}>
              {REED_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>依据读数</span>
            <select value={draft.readingId} onChange={(e) => setDraft({ ...draft, readingId: e.target.value })}>
              {readings.map((r, i) => (
                <option key={r.id} value={r.id}>
                  {i === 0 ? "基线" : `读数 ${i + 1}`}（{r.tempC}℃ / {r.humidityPct}%）
                </option>
              ))}
            </select>
          </label>
          <label className="note-input">
            <span>维修备注</span>
            <input type="text" value={draft.note} placeholder="如：音管顶端微调、密封胶老化…" onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
          </label>
          <div className="measure-actions">
            <button
              className="primary"
              disabled={!valid}
              onClick={() =>
                onSave({
                  pipeId: pipe.id,
                  cents: centsNum,
                  reed: draft.reed,
                  note: draft.note.trim(),
                  readingId: draft.readingId,
                  at: Date.now(),
                })
              }
            >
              保存{pipeState.status === "recheck" ? "复测" : "测量"}
            </button>
            <button onClick={onCancel}>取消</button>
          </div>
        </div>
      </td>
    </tr>
  );
}

/** 调音偏差表 + 测量/复核操作 */
export function PipeTable({ stop, pipes, state, readings, closed, onSave, onRecheck }: PipeTableProps) {
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <div className="table-wrap">
      <table className="pipe-table">
        <thead>
          <tr>
            <th>音管编号</th>
            <th>标称(Hz)</th>
            <th>音分偏差</th>
            <th>簧片</th>
            <th>状态</th>
            <th>操作 / 备注</th>
          </tr>
        </thead>
        <tbody>
          {pipes.map((p) => {
            const st = state[p.id];
            const m = st.current;
            const anomaly = m !== null && Math.abs(m.cents) > CENTS_LIMIT;
            return (
              <Fragment key={p.id}>
                <tr className={st.status === "recheck" ? "row-recheck" : anomaly ? "row-anomaly" : ""}>
                  <td>
                    <b>{p.code}</b>
                    {anomaly && <em className="flag">异常</em>}
                  </td>
                  <td>{p.nominalHz.toFixed(2)}</td>
                  <td className={anomaly ? "bad-text" : ""}>{m ? `${formatSigned(m.cents)} cent` : "—"}</td>
                  <td>{m ? reedLabel(m.reed) : "—"}</td>
                  <td>
                    <span className={`pill status-${st.status}`}>{STATUS_LABEL[st.status]}</span>
                    {m && <small className="measured-at"> {formatDateTime(m.at)}</small>}
                  </td>
                  <td>
                    <div className="row-actions">
                      {closed ? (
                        <span className="hint">已结项锁定</span>
                      ) : readings.length === 0 ? (
                        <button disabled title="请先登记环境读数">
                          登记读数后测量
                        </button>
                      ) : (
                        <button className="primary" onClick={() => setEditing(editing === p.id ? null : p.id)}>
                          {st.status === "unmeasured" ? "测量" : st.status === "recheck" ? "复测" : "重新测量"}
                        </button>
                      )}
                      {st.status === "measured" && !closed && (
                        <button className="link" onClick={() => onRecheck(p.id)}>
                          标记待复测
                        </button>
                      )}
                    </div>
                    {m?.note && <p className="row-note">{m.note}</p>}
                    {st.status === "recheck" && st.stale && (
                      <p className="stale-note">
                        原值（只读）：{formatSigned(st.stale.cents)} cent · {reedLabel(st.stale.reed)}
                        {st.stale.note ? ` · ${st.stale.note}` : ""}
                      </p>
                    )}
                  </td>
                </tr>
                {editing === p.id && !closed && (
                  <PipeMeasureForm
                    key={p.id + "-form"}
                    pipe={p}
                    pipeState={st}
                    stop={stop}
                    readings={readings}
                    onSave={(input) => {
                      onSave(input);
                      setEditing(null);
                    }}
                    onCancel={() => setEditing(null)}
                  />
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
