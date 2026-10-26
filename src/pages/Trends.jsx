import { useState } from "react";
import { Shell, PageHead, Empty } from "../components/Shell.jsx";
import { TrendChart } from "../components/Charts.jsx";
import { SIGNALS } from "../components/signals.jsx";
import { useCheckins } from "../hooks.js";
import { BASELINE_DAYS, FLAG_NEEDED, FLAG_WINDOW, METRIC_KEYS, getNotes, prettyDate } from "../lib/data.js";

const SHOWN = 14;

export default function Trends() {
  const { list, analysis: a } = useCheckins();
  const [metric, setMetric] = useState("tremor");
  const S = SIGNALS[metric];
  const flagged = a.flagged.includes(metric);

  const notes = getNotes();
  const recent = Object.keys(notes).sort().slice(-3).map((d) => {
    const t = [notes[d].medicine && "took medicine", notes[d].sleep && "slept well"].filter(Boolean).join(", ");
    return t ? prettyDate(d) + ": " + t : "";
  }).filter(Boolean);

  return (
    <Shell>
      <PageHead title="My trends" date={`Last ${SHOWN} check-ins`}>
        <div className="pill-row" role="group" aria-label="Choose a signal">
          {METRIC_KEYS.map((k) => (
            <button key={k} type="button" className="pill" aria-pressed={metric === k} onClick={() => setMetric(k)}>
              {(() => { const I = SIGNALS[k].Icon; return <I />; })()} {SIGNALS[k].label}
            </button>
          ))}
        </div>
      </PageHead>

      <section className="card">
        {a.base.ready
          ? <TrendChart series={[{ label: S.label, color: S.color, values: a.z[metric].slice(-SHOWN) }]} dates={a.dates.slice(-SHOWN)} label={S.label + " trend against your usual range"} />
          : <Empty text={list.length ? `Learning your baseline: ${a.base.n} of ${BASELINE_DAYS} check-ins. Your trend appears after that.` : "No check-ins yet. Your first one takes about 30 seconds."} />}
        <p className="muted small" style={{ marginTop: 8 }}>The shaded area is your usual range.</p>
      </section>

      {a.base.ready && (
        <section className="card">
          <span className={"chip " + (flagged ? "warn" : "ok")}>{flagged ? "Sustained change" : "Within usual range"}</span>
          <p style={{ marginTop: 10 }}>
            {flagged
              ? `Higher than your usual range on at least ${FLAG_NEEDED} of your last ${FLAG_WINDOW} check-ins. Your doctor will see this.`
              : "Within your usual range. Notes you add, like medicine timing, show up for your doctor."}
          </p>
          {recent.length > 0 && <p className="muted small" style={{ marginTop: 8 }}>Recent notes: {recent.join(" · ")}</p>}
        </section>
      )}
    </Shell>
  );
}
