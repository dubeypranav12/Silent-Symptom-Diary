import { useState } from "react";
import { Shell, PageHead, Empty } from "../components/Shell.jsx";
import { TrendChart } from "../components/Charts.jsx";
import { SIGNALS } from "../components/signals.jsx";
import { useCheckins } from "../hooks.js";
import { BASELINE_DAYS, CONTEXT_BASELINE_DAYS, FLAG_NEEDED, FLAG_WINDOW, METRIC_KEYS, compareContextEntry, getContextBaseline, getContextEntries, getNotes, prettyDate } from "../lib/data.js";

const SHOWN = 14;

export default function Trends() {
  const { list, analysis: a } = useCheckins();
  const [metric, setMetric] = useState("tremor");
  const S = SIGNALS[metric];
  const flagged = a.flagged.includes(metric);
  const contextEntries = getContextEntries();
  const contextBaseline = getContextBaseline(contextEntries);

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

      <section className="card" aria-labelledby="context-trends-title">
        <div className="card-head"><div><h2 id="context-trends-title">Sleep, stress and work</h2><p className="muted small">Self-reported daily context compared with your personal baseline.</p></div></div>
        {contextBaseline.ready
          ? <div className="context-baseline"><b>Your baseline · first {CONTEXT_BASELINE_DAYS} entries</b><span>{contextBaseline.sleepHours.toFixed(1)} h sleep · {contextBaseline.stressLevel} stress · {contextBaseline.workHours.toFixed(1)} h work</span></div>
          : <div className="context-baseline"><b>Building your baseline · {contextBaseline.n}/{CONTEXT_BASELINE_DAYS}</b><span>Save {CONTEXT_BASELINE_DAYS} daily context entries to establish your usual levels.</span></div>}
        {contextEntries.length === 0 ? <p className="muted small" style={{ marginTop: 14 }}>Add today's sleep, stress and work hours from Home to start tracking.</p> : (
          <div className="table-wrap context-table-wrap">
            <table className="context-table">
              <thead><tr><th scope="col">Date</th><th scope="col">Sleep</th><th scope="col">Stress</th><th scope="col">Work</th><th scope="col">Compared with baseline</th></tr></thead>
              <tbody>{contextEntries.slice(-14).reverse().map((entry) => {
                const isCompared = contextBaseline.ready && entry.date > contextBaseline.throughDate;
                const delta = isCompared ? compareContextEntry(entry, contextBaseline) : null;
                const signed = (value) => `${value > 0 ? "+" : ""}${value.toFixed(1)} h`;
                return <tr key={entry.date}>
                  <td>{prettyDate(entry.date)}</td><td>{Number(entry.sleepHours).toFixed(1)} h</td><td><span className={`chip stress-${entry.stressLevel}`}>{entry.stressLevel}</span></td><td>{Number(entry.workHours).toFixed(1)} h</td>
                  <td>{delta ? `Sleep ${signed(delta.sleepHours)} · Stress ${delta.stress < 0 ? "lower" : delta.stress > 0 ? "higher" : "same"} · Work ${signed(delta.workHours)}` : "Baseline"}</td>
                </tr>;
              })}</tbody>
            </table>
          </div>
        )}
        <p className="context-note">Changes in sleep, stress or work hours are personal context; they don’t automatically mean improvement or decline.</p>
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
