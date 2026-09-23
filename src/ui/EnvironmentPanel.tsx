import { useState } from "react";
import type { AddReadingInput, EditReadingInput } from "../domain/store";
import { ENV_LIMIT_PCT, formatSigned, formatTime } from "../domain/rules";
import type { Reading } from "../domain/types";

interface EnvironmentPanelProps {
  readings: Reading[];
  tempVarPct: number;
  humVarPct: number;
  onAdd: (input: AddReadingInput) => void;
  onEdit: (input: EditReadingInput) => void;
}

function nowHM(): string {
  const d = new Date();
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 温湿度记录：开工先填基线；追加或改动会令已测音管转为待复测 */
export function EnvironmentPanel({ readings, tempVarPct, humVarPct, onAdd, onEdit }: EnvironmentPanelProps) {
  const [temp, setTemp] = useState("20.0");
  const [hum, setHum] = useState("45");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTemp, setEditTemp] = useState("");
  const [editHum, setEditHum] = useState("");

  const tNum = Number(temp);
  const hNum = Number(hum);
  const canAdd = temp.trim() !== "" && hum.trim() !== "" && Number.isFinite(tNum) && Number.isFinite(hNum);

  const submit = () => {
    if (!canAdd) return;
    onAdd({ tempC: tNum, humidityPct: hNum, at: Date.now() });
  };

  const beginEdit = (r: Reading) => {
    setEditingId(r.id);
    setEditTemp(String(r.tempC));
    setEditHum(String(r.humidityPct));
  };

  const confirmEdit = (r: Reading) => {
    const t = Number(editTemp);
    const h = Number(editHum);
    if (!Number.isFinite(t) || !Number.isFinite(h)) return;
    if (t === r.tempC && h === r.humidityPct) {
      setEditingId(null);
      return;
    }
    const proceed = window.confirm(
      `改动 ${formatTime(r.at)} 的环境读数后，所有已测音管将转为「待复测」，原测量值只读保留。是否继续？`,
    );
    if (!proceed) return;
    onEdit({ readingId: r.id, tempC: t, humidityPct: h });
    setEditingId(null);
  };

  return (
    <section className="panel env-panel">
      <div className="heading">
        <div>
          <p className="eyebrow">环境读数</p>
          <h2>温湿度记录</h2>
        </div>
        <div className="env-vars">
          <span className={readings.length === 0 || Math.abs(tempVarPct) > ENV_LIMIT_PCT ? "bad-text" : "ok-text"}>
            温度 {readings.length ? formatSigned(tempVarPct) : "—"}%
          </span>
          <span className={readings.length === 0 || Math.abs(humVarPct) > ENV_LIMIT_PCT ? "bad-text" : "ok-text"}>
            湿度 {readings.length ? formatSigned(humVarPct) : "—"}%
          </span>
        </div>
      </div>

      {readings.length === 0 && <p className="hint">⚠ 维护开始请先登记开工环境读数（作为变化基线），读数未登记前不能测量音管。</p>}

      <div className="env-form">
        <label>
          <span>温度 ℃</span>
          <input type="number" step="0.1" value={temp} onChange={(e) => setTemp(e.target.value)} />
        </label>
        <label>
          <span>相对湿度 %</span>
          <input type="number" step="1" value={hum} onChange={(e) => setHum(e.target.value)} />
        </label>
        <button className="primary" disabled={!canAdd} onClick={submit}>
          追加读数
        </button>
      </div>

      {readings.length > 0 && (
        <ul className="reading-list">
          {readings.map((r, i) => (
            <li key={r.id} className={i === 0 ? "baseline" : ""}>
              {editingId === r.id ? (
                <div className="reading-edit">
                  <input type="number" step="0.1" value={editTemp} onChange={(e) => setEditTemp(e.target.value)} aria-label="编辑温度" />
                  <input type="number" step="1" value={editHum} onChange={(e) => setEditHum(e.target.value)} aria-label="编辑湿度" />
                  <button className="primary" onClick={() => confirmEdit(r)}>
                    确定
                  </button>
                  <button onClick={() => setEditingId(null)}>取消</button>
                </div>
              ) : (
                <>
                  <b>{i === 0 ? "基线" : formatTime(r.at)}</b>
                  <span>{r.tempC} ℃</span>
                  <span>{r.humidityPct} %</span>
                  <button className="link" onClick={() => beginEdit(r)}>
                    改动
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      <small className="hint">提示：追加或改动读数会把全部已测音管转为待复测，原值只读保留；已结项音栓不受影响。</small>
    </section>
  );
}
