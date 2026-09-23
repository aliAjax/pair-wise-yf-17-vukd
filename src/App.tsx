import { useEffect, useMemo, useReducer, useState } from "react";
import { emptyState, loadState, reducer, saveState } from "./domain/store";
import { buildReport, envVariation } from "./domain/rules";
import { pipesOfStop, stopsOfVenue, venueById } from "./domain/presets";
import { ArchiveModal } from "./ui/ArchiveModal";
import { EnvironmentPanel } from "./ui/EnvironmentPanel";
import { PipeTable } from "./ui/PipeTable";
import { ReportView } from "./ui/ReportView";
import { StartScreen } from "./ui/StartScreen";
import "./styles.css";

function Console() {
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    typeof localStorage === "undefined" ? emptyState() : loadState(),
  );
  const [selectedStop, setSelectedStop] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveSelected, setArchiveSelected] = useState<string | null>(null);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const session = state.session;
  const stops = session ? stopsOfVenue(session.venueId) : [];
  const activeStopId =
    session && selectedStop && stops.some((s) => s.id === selectedStop)
      ? selectedStop
      : stops[0]?.id ?? null;

  // 实时报告：偏差表、异常标记、单次报告均由 buildReport 同一份数据派生
  const report = useMemo(
    () => (session && activeStopId ? buildReport(session, activeStopId, Date.now()) : null),
    [session, activeStopId],
  );

  // 没有进行中的维护：回到开工页
  if (!session) {
    return (
      <>
        <StartScreen
          hasArchive={state.archive.length > 0}
          onOpenArchive={() => {
            setArchiveOpen(true);
            setArchiveSelected(state.archive[0]?.id ?? null);
          }}
          onStart={(venueId) => {
            const first = stopsOfVenue(venueId)[0];
            dispatch({ type: "start", input: { venueId, at: Date.now() } });
            setSelectedStop(first?.id ?? null);
          }}
        />
        {archiveOpen && (
          <ArchiveModal
            reports={state.archive}
            selectedId={archiveSelected}
            onSelect={setArchiveSelected}
            onClose={() => setArchiveOpen(false)}
          />
        )}
      </>
    );
  }

  const venue = venueById(session.venueId);
  const stopId = activeStopId as string;
  const activeStop = stops.find((s) => s.id === stopId)!;
  const activePipes = pipesOfStop(stopId);
  const env = envVariation(session.readings);
  const closedInfo = session.closed[stopId];
  const isClosed = Boolean(closedInfo);

  const stopSummaries = stops.map((s) => {
    const defs = pipesOfStop(s.id);
    const done = defs.filter((p) => session.pipes[p.id].status === "measured").length;
    const recheck = defs.filter((p) => session.pipes[p.id].status === "recheck").length;
    return { stop: s, done, total: defs.length, recheck, closed: Boolean(session.closed[s.id]) };
  });

  return (
    <main className="app console">
      <header className="console-head">
        <div>
          <p className="eyebrow">维护中 · {venue.name}</p>
          <h1>{venue.organ} · 音管调音台</h1>
        </div>
        <div className="head-actions">
          <button onClick={() => setArchiveOpen(true)}>结项存档（{state.archive.length}）</button>
          <button
            className="danger"
            onClick={() => {
              const allClosed = stops.every((s) => session.closed[s.id]);
              const msg = allClosed
                ? "结束本次维护并关闭工作台？（报告均已存档）"
                : "还有音栓未结项，结束后未结项数据将不保留为报告。确定结束？";
              if (window.confirm(msg)) dispatch({ type: "finishSession" });
            }}
          >
            结束维护
          </button>
        </div>
      </header>

      <nav className="stop-tabs">
        {stopSummaries.map(({ stop, done, total, recheck, closed }) => (
          <button key={stop.id} className={stop.id === stopId ? "active" : ""} onClick={() => setSelectedStop(stop.id)}>
            <b>{stop.name}</b>
            <span>
              {done}/{total} 已测{recheck > 0 ? ` · ${recheck} 待复测` : ""}
            </span>
            {closed && <em className="closed-dot">已结项</em>}
          </button>
        ))}
      </nav>

      <div className="console-grid">
        <div className="left-col">
          <EnvironmentPanel
            readings={session.readings}
            tempVarPct={env.tempVarPct}
            humVarPct={env.humVarPct}
            onAdd={(input) => dispatch({ type: "addReading", input })}
            onEdit={(input) => dispatch({ type: "editReading", input })}
          />
        </div>

        <section className="panel pipe-panel">
          <div className="heading">
            <div>
              <p className="eyebrow">
                {activeStop.label} · {activeStop.kind === "reed" ? "簧管音栓" : "唇管音栓"}
              </p>
              <h2>调音偏差表</h2>
            </div>
            <div className="heading-actions">
              {isClosed && <span className="pill status-measured">已结项</span>}
              <button onClick={() => setShowReport((v) => !v)}>{showReport ? "收起报告" : "查看单次报告"}</button>
            </div>
          </div>

          <PipeTable
            stop={activeStop}
            pipes={activePipes}
            state={session.pipes}
            readings={session.readings}
            closed={isClosed}
            onSave={(input) => dispatch({ type: "saveMeasure", input })}
            onRecheck={(pipeId) => dispatch({ type: "recheckPipe", pipeId })}
          />
        </section>
      </div>

      {showReport && (
        <section className="panel report-panel">
          <ReportView
            report={report!}
            onClose={
              isClosed
                ? undefined
                : () =>
                    window.confirm("确认结项？结项后该音栓数据锁定并生成存档报告。") &&
                    dispatch({ type: "closeStop", stopId: stopId, at: Date.now() })
            }
          />
        </section>
      )}

      {archiveOpen && (
        <ArchiveModal
          reports={state.archive}
          selectedId={archiveSelected}
          onSelect={setArchiveSelected}
          onClose={() => setArchiveOpen(false)}
        />
      )}
    </main>
  );
}

export default function App() {
  return <Console />;
}
