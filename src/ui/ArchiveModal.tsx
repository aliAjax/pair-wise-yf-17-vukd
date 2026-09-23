import { formatDateTime } from "../domain/rules";
import { venueById } from "../domain/presets";
import type { Report } from "../domain/types";
import { ReportView } from "./ReportView";

interface ArchiveModalProps {
  reports: Report[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export function ArchiveModal({ reports, selectedId, onSelect, onClose }: ArchiveModalProps) {
  const selected = reports.find((r) => r.id === selectedId) ?? reports[0] ?? null;

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-side">
          <div className="heading">
            <h2>结项存档</h2>
            <button onClick={onClose}>关闭</button>
          </div>
          <ul className="archive-list">
            {reports.map((r) => {
              const venue = venueById(r.venueId);
              return (
                <li key={r.id}>
                  <button className={r.id === selected?.id ? "active" : ""} onClick={() => onSelect(r.id)}>
                    <b>{r.stopName}</b>
                    <span>{venue.name}</span>
                    <small>{r.archivedAt ? formatDateTime(r.archivedAt) : ""}</small>
                    {r.anomalyCount > 0 && <em className="mini-flag">{r.anomalyCount} 异常</em>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="modal-body">
          {selected && <ReportView report={selected} archived />}
          <div className="print-row">
            <button onClick={() => window.print()}>打印报告</button>
          </div>
        </div>
      </div>
    </div>
  );
}
