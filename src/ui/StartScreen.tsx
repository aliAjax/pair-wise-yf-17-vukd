import { pipesOfStop, stopsOfVenue, VENUES } from "../domain/presets";

interface StartScreenProps {
  onStart: (venueId: string) => void;
  hasArchive: boolean;
  onOpenArchive: () => void;
}

/** 选择场馆开工：预置两场馆、三音栓、八根音管 */
export function StartScreen({ onStart, hasArchive, onOpenArchive }: StartScreenProps) {
  return (
    <main className="app">
      <section className="hero">
        <p className="eyebrow">管风琴维护 · 调音台</p>
        <h1>音管调音记录台</h1>
        <span>
          每次维护先登记温湿度基线，再按音栓逐管记录音高、音分偏差、簧片状态与备注。同音栓全部测完且温度、湿度变化各不超过
          10% 才能结项；环境读数追加或改动后已测音管自动转待复测，单管复核仅恢复本管。
        </span>
      </section>

      <section className="venue-grid">
        {VENUES.map((v) => {
          const stops = stopsOfVenue(v.id);
          const pipeCount = stops.reduce((n, s) => n + pipesOfStop(s.id).length, 0);
          return (
            <article key={v.id} className="panel venue-card">
              <h2>{v.name}</h2>
              <p className="muted">{v.organ}</p>
              <ul className="stop-lines">
                {stops.map((s) => (
                  <li key={s.id}>
                    <b>{s.name}</b>
                    <span>{s.label}</span>
                    <em>{pipesOfStop(s.id).length} 管</em>
                  </li>
                ))}
              </ul>
              <p className="muted">共 {pipeCount} 根预置音管</p>
              <button className="primary wide" onClick={() => onStart(v.id)}>
                在此场馆开工
              </button>
            </article>
          );
        })}
      </section>

      {hasArchive && (
        <section className="panel archive-entry">
          <div>
            <p className="eyebrow">历史</p>
            <h2>结项报告存档</h2>
            <p className="muted">报告在结项时生成快照，保存于本浏览器，可随时调阅或打印。</p>
          </div>
          <button onClick={onOpenArchive}>查看存档</button>
        </section>
      )}
    </main>
  );
}
