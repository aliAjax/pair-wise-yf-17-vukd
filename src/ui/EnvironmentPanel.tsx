import { useState } from "react";
import type { Reading, ReadingInput } from "../types";
import { ENV_DRIFT_LIMIT, envDriftPct } from "../domain/rules";
import { formatPct, formatTime, nowLocalInput } from "./format";

interface EnvironmentPanelProps {
  readings: Reading[];
  onAdd: (input: ReadingInput) => void;
  onUpdate: (id: string, input: ReadingInput) => void;
  onDelete: (id: string) => void;
}

export default function EnvironmentPanel({
  readings,
  onAdd,
  onUpdate,
  onDelete,
}: EnvironmentPanelProps) {
  const [time, setTime] = useState(nowLocalInput());
  const [temperature, setTemperature] = useState("20");
  const [humidity, setHumidity] = useState("45");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ReadingInput | null>(null);

  const drift = envDriftPct(readings);
  const baseline = readings[0];
  const latest = readings[readings.length - 1];

  const submit = () => {
    const t = Number(temperature);
    const h = Number(humidity);
    if (!time || Number.isNaN(t) || Number.isNaN(h)) {
      setError("请填写完整的时间、温度与湿度");
      return;
    }
    onAdd({ time, temperature: t, humidity: h, note: note.trim() });
    setError("");
    setNote("");
  };

  const startEdit = (reading: Reading) => {
    setEditingId(reading.id);
    setDraft({
      time: reading.time,
      temperature: reading.temperature,
      humidity: reading.humidity,
      note: reading.note,
    });
  };

  return (
    <section className="panel env-panel">
      <div className="heading">
        <div>
          <p>环境读数</p>
          <h2>温湿度记录</h2>
        </div>
        {baseline && (
          <div className="drift">
            <span className={drift.temperature !== null && drift.temperature <= ENV_DRIFT_LIMIT ? "ok" : "bad"}>
              温度变化 {formatPct(drift.temperature)}
            </span>
            <span className={drift.humidity !== null && drift.humidity <= ENV_DRIFT_LIMIT ? "ok" : "bad"}>
              湿度变化 {formatPct(drift.humidity)}
            </span>
            <small>结项限值各 ≤ {ENV_DRIFT_LIMIT}%</small>
          </div>
        )}
      </div>

      {readings.length === 0 ? (
        <div className="env-first">
          <strong>维护开始：先填环境读数</strong>
          <p>第一条读数作为本次维护的温湿度基准，填写后才可测量音管。</p>
        </div>
      ) : (
        <p className="env-warn">
          追加或改动读数后，该场馆已测音管将全部转为<strong>待复测</strong>，原测量值只读封存；单管复核只恢复本管。
        </p>
      )}

      <div className="env-form">
        <label className="inline">
          <span>时间</span>
          <input type="datetime-local" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
        <label className="inline">
          <span>温度 °C</span>
          <input value={temperature} onChange={(e) => setTemperature(e.target.value)} inputMode="decimal" />
        </label>
        <label className="inline">
          <span>湿度 %</span>
          <input value={humidity} onChange={(e) => setHumidity(e.target.value)} inputMode="decimal" />
        </label>
        <label className="inline grow">
          <span>备注</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="如：空调开启 / 午后阳光直射" />
        </label>
        <div className="form-actions">
          {error && <span className="form-error">{error}</span>}
          <button className="primary small" onClick={submit}>
            {readings.length === 0 ? "填写基准读数" : "追加读数"}
          </button>
        </div>
      </div>

      {readings.length > 0 && (
        <table className="reading-table">
          <thead>
            <tr>
              <th>时间</th>
              <th>温度</th>
              <th>湿度</th>
              <th>备注</th>
              <th className="num">操作</th>
            </tr>
          </thead>
          <tbody>
            {readings.map((reading, index) => {
              const isEditing = editingId === reading.id && draft;
              return (
                <tr key={reading.id} className={index === 0 ? "baseline" : ""}>
                  {isEditing ? (
                    <>
                      <td>
                        <input
                          type="datetime-local"
                          value={draft.time}
                          onChange={(e) => setDraft({ ...draft, time: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          value={draft.temperature}
                          onChange={(e) =>
                            setDraft({ ...draft, temperature: Number(e.target.value) })
                          }
                          inputMode="decimal"
                        />
                      </td>
                      <td>
                        <input
                          value={draft.humidity}
                          onChange={(e) =>
                            setDraft({ ...draft, humidity: Number(e.target.value) })
                          }
                          inputMode="decimal"
                        />
                      </td>
                      <td>
                        <input
                          value={draft.note}
                          onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                        />
                      </td>
                      <td className="num">
                        <button
                          className="small"
                          onClick={() => {
                            onUpdate(reading.id, draft);
                            setEditingId(null);
                          }}
                        >
                          保存
                        </button>
                        <button className="small" onClick={() => setEditingId(null)}>
                          取消
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>
                        {formatTime(reading.time)}
                        {index === 0 && <em className="base-tag">基准</em>}
                        {reading.id === latest?.id && index !== 0 && (
                          <em className="base-tag latest">最新</em>
                        )}
                      </td>
                      <td>{reading.temperature} °C</td>
                      <td>{reading.humidity} %</td>
                      <td className="muted">{reading.note || "—"}</td>
                      <td className="num">
                        <button className="small ghost" onClick={() => startEdit(reading)}>
                          改动
                        </button>
                        <button
                          className="small ghost danger"
                          onClick={() => {
                            if (window.confirm("删除该读数？已测音管将全部转为待复测，原值只读封存。")) {
                              onDelete(reading.id);
                            }
                          }}
                        >
                          删除
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
