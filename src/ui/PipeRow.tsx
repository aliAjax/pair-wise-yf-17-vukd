import { useState } from "react";
import type { Measurement, MeasurementInput, PipeDef, ReedStatus } from "../types";
import { isAbnormal, isWarn } from "../domain/rules";
import { formatCent, formatHz, formatTime } from "./format";

const REED_OPTIONS: ReedStatus[] = ["正常", "需微调", "待清洁", "更换"];

interface PipeRowProps {
  pipe: PipeDef;
  latest: Measurement | null;
  status: "待测" | "已测" | "待复测";
  archived: boolean;
  onSave: (input: MeasurementInput) => void;
}

export default function PipeRow({ pipe, latest, status, archived, onSave }: PipeRowProps) {
  const [editing, setEditing] = useState(status === "待复测");
  const [deviationText, setDeviationText] = useState(latest ? String(latest.deviation) : "");
  const [reedStatus, setReedStatus] = useState<ReedStatus>(latest?.reedStatus ?? "正常");
  const [note, setNote] = useState(latest?.note ?? "");
  const [error, setError] = useState("");

  const openForm = () => {
    setDeviationText(latest ? String(latest.deviation) : "");
    setReedStatus(latest?.reedStatus ?? "正常");
    setNote(latest?.note ?? "");
    setError("");
    setEditing(true);
  };

  const submit = () => {
    const deviation = Number(deviationText);
    if (deviationText.trim() === "" || Number.isNaN(deviation)) {
      setError("请输入数字形式的音分偏差，例如 +9 或 -3");
      return;
    }
    onSave({
      deviation: Math.round(deviation * 10) / 10,
      reedStatus: pipe.reed ? reedStatus : "无簧片",
      note: note.trim(),
    });
    setEditing(false);
  };

  const abnormal = latest ? isAbnormal(latest.deviation) : false;
  const warn = latest ? isWarn(latest.deviation) : false;

  return (
    <article className={`pipe-row ${status === "待复测" ? "is-retest" : ""}`}>
      <div className="pipe-head">
        <span className="pipe-code">{pipe.code}</span>
        <div className="pipe-id">
          <strong>{pipe.pitchName}</strong>
          <small>
            {formatHz(pipe.frequency)}
            {pipe.reed ? " · 簧片管" : " · 笛管"}
          </small>
        </div>
        <span className={`badge status-${status}`}>{status}</span>
        {latest && abnormal && <span className="badge flag-danger">异常</span>}
        {latest && warn && <span className="badge flag-warn">临界</span>}
      </div>

      {latest && (
        <div className={`measurement ${latest.sealed ? "sealed" : ""}`}>
          <div className="measurement-main">
            <strong className={abnormal ? "text-danger" : warn ? "text-warn" : ""}>
              {formatCent(latest.deviation)}
            </strong>
            <span>实测 {formatHz(latest.measuredFrequency)}</span>
            <span>簧片：{latest.reedStatus}</span>
            {latest.note && <span className="measurement-note">备注：{latest.note}</span>}
          </div>
          <small className="measurement-time">{formatTime(latest.time)}</small>
          {latest.sealed && <em className="sealed-tag">环境读数已变更 · 原值只读封存</em>}
        </div>
      )}

      {archived ? (
        <p className="row-locked">本音栓已结项存档，记录已冻结</p>
      ) : editing ? (
        <div className="measure-form">
          <label className="inline">
            <span>音分偏差</span>
            <input
              value={deviationText}
              onChange={(event) => setDeviationText(event.target.value)}
              placeholder="如 +9 / -3"
              inputMode="decimal"
            />
          </label>
          <label className="inline">
            <span>簧片状态</span>
            <select
              value={reedStatus}
              onChange={(event) => setReedStatus(event.target.value as ReedStatus)}
              disabled={!pipe.reed}
            >
              {!pipe.reed && <option value="无簧片">无簧片</option>}
              {REED_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="inline grow">
            <span>维修备注</span>
            <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="本次调音处理与观察" />
          </label>
          <div className="form-actions">
            {error && <span className="form-error">{error}</span>}
            <button className="primary small" onClick={submit}>
              {status === "待测" ? "保存测量" : "完成复测"}
            </button>
            {status === "已测" && (
              <button className="small" onClick={() => setEditing(false)}>
                取消
              </button>
            )}
          </div>
        </div>
      ) : (
        <button className="ghost small" onClick={openForm} disabled={archived}>
          {status === "待测" ? "录入测量" : "单管复核（仅恢复本管）"}
        </button>
      )}
    </article>
  );
}
