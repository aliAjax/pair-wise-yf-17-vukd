import { useEffect, useMemo, useState } from "react";
import "./styles.css";
import { PIPES, VENUES, stopDef, stopsOfVenue } from "./data/catalog";
import {
  addReading,
  archiveStop,
  deleteReading,
  loadState,
  removeArchive,
  saveMeasurement,
  saveState,
  updateReading,
} from "./domain/store";
import { buildStopReport, envDriftPct } from "./domain/rules";
import type { MeasurementInput, PersistState, ReadingInput } from "./types";
import TuningTab from "./ui/TuningTab";
import ReportsTab from "./ui/ReportsTab";
import ArchivesTab from "./ui/ArchivesTab";

type Tab = "tuning" | "reports" | "archives";

const TABS: { id: Tab; label: string }[] = [
  { id: "tuning", label: "调音台" },
  { id: "reports", label: "维护报告" },
  { id: "archives", label: "维护存档" },
];

function App() {
  const [state, setState] = useState<PersistState>(() => loadState());
  const [venueId, setVenueId] = useState(VENUES[0].id);
  const [tab, setTab] = useState<Tab>("tuning");

  useEffect(() => {
    saveState(state);
  }, [state]);

  const runtime = state.runtime[venueId];
  const drift = envDriftPct(runtime.readings);
  const latest = runtime.readings[runtime.readings.length - 1];

  const metrics = useMemo(() => {
    const stopIds = stopsOfVenue(venueId).map((stop) => stop.id);
    const pipeIds = PIPES.filter((pipe) => stopIds.includes(pipe.stopId)).map((pipe) => pipe.id);
    const measured = pipeIds.filter((id) => runtime.pipes[id]?.measurements.length).length;
    const reports = stopIds.map((id) => buildStopReport(id, runtime));
    const retest = reports.reduce((sum, report) => sum + report.pendingRetest, 0);
    const abnormal = reports.reduce((sum, report) => sum + report.abnormalCount, 0);
    return { total: pipeIds.length, measured, retest, abnormal };
  }, [venueId, runtime]);

  const mutate = (next: PersistState) => setState(next);

  const handleAddReading = (input: ReadingInput) =>
    mutate(addReading(state, venueId, input));
  const handleUpdateReading = (id: string, input: ReadingInput) =>
    mutate(updateReading(state, venueId, id, input));
  const handleDeleteReading = (id: string) =>
    mutate(deleteReading(state, venueId, id));
  const handleSaveMeasurement = (pipeId: string, input: MeasurementInput) =>
    mutate(saveMeasurement(state, venueId, pipeId, input));
  const handleClose = (stopId: string) => {
    const { state: next, report } = archiveStop(state, venueId, stopId);
    if (report) {
      const stopName = stopDef(stopId)?.name ?? stopId;
      setState(next);
      window.alert(`「${stopName}」已结项，单次维护报告已冻结到维护存档。`);
    }
  };
  const handleRemoveArchive = (archiveId: string) =>
    mutate(removeArchive(state, archiveId));

  return (
    <main className="app">
      <header className="hero">
        <p>管风琴维护 · 音管调音台</p>
        <h1>音管调音记录台</h1>
        <span>
          预置两场馆、三音栓、八根音管；维护开始先填温湿度基准读数，同音栓全部测完且温湿度各自变化不超过
          10% 才能结项。环境读数一经追加或改动，已测音管全部转待复测、原值只读；数据保存在本机浏览器。
        </span>
      </header>

      <nav className="venue-tabs" aria-label="场馆切换">
        {VENUES.map((venue) => (
          <button
            key={venue.id}
            className={venue.id === venueId ? "active" : ""}
            onClick={() => setVenueId(venue.id)}
          >
            <strong>{venue.name}</strong>
            <small>{venue.place}</small>
          </button>
        ))}
      </nav>

      <section className="metrics">
        <article>
          <small>音栓数量</small>
          <strong>
            {stopsOfVenue(venueId).length}
            <em> 组 / {metrics.total} 管</em>
          </strong>
        </article>
        <article>
          <small>音管测量进度</small>
          <strong>
            {metrics.measured}/{metrics.total}
            {metrics.retest > 0 && <em className="text-warn"> · {metrics.retest} 待复测</em>}
          </strong>
        </article>
        <article>
          <small>温度 / 湿度（最新）</small>
          <strong className="metric-env">
            {latest ? `${latest.temperature}°` : "—"}
            <em> / {latest ? `${latest.humidity}%` : "—"}</em>
          </strong>
          {latest && (
            <small className={drift.temperature !== null && drift.humidity !== null && drift.temperature <= 10 && drift.humidity <= 10 ? "ok" : "bad"}>
              变化 温{(drift.temperature ?? 0).toFixed(1)}% 湿{(drift.humidity ?? 0).toFixed(1)}%
            </small>
          )}
        </article>
        <article>
          <small>偏差超限（≥10 音分）</small>
          <strong className={metrics.abnormal ? "text-danger" : ""}>
            {metrics.abnormal}
            <em> 管异常</em>
          </strong>
        </article>
      </section>

      <div className="tabs" role="tablist">
        {TABS.map((item) => (
          <button key={item.id} role="tab" className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}>
            {item.label}
          </button>
        ))}
      </div>

      {tab === "tuning" && (
        <TuningTab
          venueId={venueId}
          runtime={runtime}
          archives={state.archives}
          onAddReading={handleAddReading}
          onUpdateReading={handleUpdateReading}
          onDeleteReading={handleDeleteReading}
          onSaveMeasurement={handleSaveMeasurement}
        />
      )}
      {tab === "reports" && (
        <ReportsTab
          venueId={venueId}
          runtime={runtime}
          archives={state.archives}
          onClose={handleClose}
        />
      )}
      {tab === "archives" && <ArchivesTab archives={state.archives} onRemove={handleRemoveArchive} />}
    </main>
  );
}

export default App;
