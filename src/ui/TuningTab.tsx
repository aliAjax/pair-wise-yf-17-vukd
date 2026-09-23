import EnvironmentPanel from "./EnvironmentPanel";
import PipeRow from "./PipeRow";
import { pipesOfStop, stopsOfVenue } from "../data/catalog";
import { latestMeasurement, pipeStatus } from "../domain/rules";
import type { ArchivedReport, MeasurementInput, ReadingInput, VenueRuntime } from "../types";

interface TuningTabProps {
  venueId: string;
  runtime: VenueRuntime;
  archives: ArchivedReport[];
  onAddReading: (input: ReadingInput) => void;
  onUpdateReading: (id: string, input: ReadingInput) => void;
  onDeleteReading: (id: string) => void;
  onSaveMeasurement: (pipeId: string, input: MeasurementInput) => void;
}

export default function TuningTab({
  venueId,
  runtime,
  archives,
  onAddReading,
  onUpdateReading,
  onDeleteReading,
  onSaveMeasurement,
}: TuningTabProps) {
  const stops = stopsOfVenue(venueId);
  const canMeasure = runtime.readings.length > 0;

  return (
    <div className="tuning">
      <EnvironmentPanel
        readings={runtime.readings}
        onAdd={onAddReading}
        onUpdate={onUpdateReading}
        onDelete={onDeleteReading}
      />

      {!canMeasure && (
        <div className="banner lock">请先在上方填写维护开始的环境基准读数，随后才能录入音管测量。</div>
      )}

      <div className="stop-grid">
        {stops.map((stop) => {
          const pipes = pipesOfStop(stop.id);
          const archive = archives.find((item) => item.stopId === stop.id);
          const doneCount = pipes.filter((pipe) => latestMeasurement(pipe.id, runtime)).length;
          const retestCount = pipes.filter(
            (pipe) => pipeStatus(pipe.id, runtime) === "待复测",
          ).length;

          return (
            <section className="panel stop-panel" key={stop.id}>
              <div className="stop-head">
                <div>
                  <p className="kind">{stop.kind}</p>
                  <h2>
                    {stop.name}
                    <small> {stop.rank}</small>
                  </h2>
                  <p className="stop-note">{stop.note}</p>
                </div>
                <div className="stop-progress">
                  <strong>
                    {doneCount}/{pipes.length}
                  </strong>
                  <small>已测</small>
                  {retestCount > 0 && <em className="retest-count">{retestCount} 待复测</em>}
                  {archive && <em className="archived-tag">已结项</em>}
                </div>
              </div>

              {!canMeasure && <div className="pipes-locked">音管测量待环境读数填写后解锁</div>}

              <div className="pipe-list">
                {pipes.map((pipe) => (
                  <PipeRow
                    key={pipe.id}
                    pipe={pipe}
                    latest={latestMeasurement(pipe.id, runtime)}
                    status={pipeStatus(pipe.id, runtime)}
                    archived={Boolean(archive)}
                    onSave={(input) => onSaveMeasurement(pipe.id, input)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
