import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FiAlertTriangle, FiCheckCircle, FiChevronLeft, FiPrinter, FiCheck } from "react-icons/fi";
import { Shell, PageHead, StatCard, RightPanel, ChartCard, Empty } from "../components/Shell.jsx";
import { Avatar } from "../components/Illustrations.jsx";
import { MiniArea, TrendChart } from "../components/Charts.jsx";
import { SIGNALS } from "../components/signals.jsx";
import { BASELINE_DAYS, FLAG_NEEDED, FLAG_WINDOW, METRIC_KEYS, METRICS, allPatients, analyse, dayStatus, fmtChange, getNotes, prettyDate } from "../lib/data.js";

export default function PatientDetail() {
  const { id } = useParams();
  const patient = useMemo(() => allPatients().find((p) => p.id === id), [id]);
  const [days, setDays] = useState(30);

  if (!patient) {
    return (
      <Shell role="doctor">
        <PageHead title="Patient not found"><Link className="btn soft" to="/doctor"><FiChevronLeft /> Back to patients</Link></PageHead>
        <div className="card"><Empty text="That patient was not found. Go back to the patient list." /></div>
      </Shell>
    );
  }

  const { list, name } = patient, a = analyse(list);
  const n = Math.min(days, list.length);
  const flaggedKey = a.flagged[0];
  const mainKey = flaggedKey || "tremor";

  /* Where the first flagged signal began rising (for the "Change starts" marker). */
  let flagFrom;
  if (flaggedKey) {
    const z = a.z[flaggedKey]; let i = z.length - 1;
    while (i > 0 && z[i - 1] >= 1) i--;
    flagFrom = i - (list.length - n);
  }

  const status = !a.base.ready ? <span className="chip info">Learning {a.base.n}/{BASELINE_DAYS}</span>
    : a.flagged.length ? <span className="chip warn">Flagged</span> : <span className="chip ok">Stable</span>;

  const recent = list.slice(-3).reverse().map((e) => {
    const st = dayStatus(list, a, e.date);
    return {
      lead: <span className="lead-ic" style={{ background: st === "warn" ? "#F4577B" : st === "ok" ? "#22B98A" : "#5B61EC" }}>{st === "warn" ? <FiAlertTriangle /> : <FiCheck />}</span>,
      title: prettyDate(e.date), sub: e.source === "sample" ? "Sample reading" : "Check-in",
      tag: <span className={"chip " + (st === "warn" ? "warn" : st === "ok" ? "ok" : "info")}>{st === "warn" ? "Above usual" : st === "ok" ? "In range" : "Learning"}</span>
    };
  });

  const notes = getNotes();
  const noteLines = patient.sample ? [] : Object.keys(notes).sort().slice(-5).map((d) => {
    const t = [notes[d].medicine && "took medicine", notes[d].sleep && "slept well"].filter(Boolean).join(", ");
    return t ? prettyDate(d) + ": " + t : "";
  }).filter(Boolean);

  const chart = a.base.ready
    ? (
      <ChartCard title={`${METRICS[mainKey].label} trend`} sub="Last 14 check-ins">
        <MiniArea values={a.z[mainKey].slice(-14)} big={fmtChange(a.latest.change[mainKey])} caption={METRICS[mainKey].label + " compared with the patient's usual range"} />
      </ChartCard>
    )
    : <div className="panel"><Empty text={`Learning baseline: ${a.base.n} of ${BASELINE_DAYS} check-ins`} /></div>;

  return (
    <Shell role="doctor" right={
      <RightPanel avatar={<Avatar seed={patient.id} size={96} />} name={name} sub={patient.sample ? "Sample patient" : "This device"}
        listTitle="Recent check-ins" items={recent} chart={chart} />
    }>
      <PageHead title={`${name} · last ${n} check-ins`}>
        <Link className="btn soft" to="/doctor"><FiChevronLeft /> Back</Link>
        <button type="button" className="btn" onClick={() => window.print()}><FiPrinter /> Print or save report</button>
      </PageHead>

      <div className="stats">
        {METRIC_KEYS.map((k) => (
          <StatCard key={k} icon={SIGNALS[k].Icon} color={SIGNALS[k].color} label={SIGNALS[k].label} value={a.base.ready ? fmtChange(a.latest.change[k]) : "Learning"} />
        ))}
        <div className="stat"><span className="stat-ic" style={{ background: "#22B98A" }}><FiCheckCircle /></span><small>Status</small><b style={{ fontSize: 16 }}>{status}</b></div>
      </div>

      <section className="card" aria-labelledby="tr">
        <div className="card-head">
          <h2 id="tr">Change from baseline</h2>
          <div className="pill-row no-print" role="group" aria-label="Choose a time range">
            {[7, 30, 90].map((d) => <button key={d} type="button" className="pill" aria-pressed={days === d} onClick={() => setDays(d)}>{d} check-ins</button>)}
          </div>
        </div>
        {a.base.ready
          ? <TrendChart series={METRIC_KEYS.map((k) => ({ label: METRICS[k].label, color: METRICS[k].color, values: a.z[k].slice(-n) }))} dates={a.dates.slice(-n)} flagFrom={flagFrom} label="Tremor, speech and typing compared with the patient's usual range" />
          : <Empty text={`Learning baseline: ${a.base.n} of ${BASELINE_DAYS} check-ins`} />}
        <div className="legend" style={{ marginTop: 8 }}>
          {METRIC_KEYS.map((k) => <span key={k}><i style={{ background: METRICS[k].color, borderRadius: "50%" }} />{METRICS[k].label}</span>)}
        </div>
      </section>

      {a.base.ready && a.flagged.length > 0 && (
        <div className="alert">
          <FiAlertTriangle aria-hidden="true" />
          <div><b>Sustained change</b><p>{a.flagged.map((k) => METRICS[k].label).join(" and ")} above the patient's usual range on at least {FLAG_NEEDED} of the last {FLAG_WINDOW} check-ins.</p></div>
        </div>
      )}
      {a.base.ready && a.flagged.length === 0 && (
        <div className="card"><span className="chip ok">No sustained change</span><p className="muted" style={{ marginTop: 8 }}>Recent check-ins are within the patient's usual range.</p></div>
      )}

      <section className="card">
        <h2 style={{ marginBottom: 6 }}>Patient notes</h2>
        <p className="muted small">{noteLines.length ? noteLines.join(" · ") : "Notes on medicine timing and sleep appear here when the patient adds them."}</p>
        {patient.sample && <p className="muted small" style={{ marginTop: 8 }}><span className="chip sample">Sample data</span> Not a real patient.</p>}
      </section>
    </Shell>
  );
}
