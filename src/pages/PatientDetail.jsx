import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FiAlertTriangle, FiCheckCircle, FiChevronLeft, FiPrinter, FiCheck } from "react-icons/fi";
import { Shell, PageHead, StatCard, RightPanel, ChartCard, Empty } from "../components/Shell.jsx";
import { Avatar } from "../components/Illustrations.jsx";
import { MiniArea, TrendChart } from "../components/Charts.jsx";
import { SIGNALS } from "../components/signals.jsx";
import { BASELINE_DAYS, FLAG_NEEDED, FLAG_WINDOW, METRIC_KEYS, METRICS, analyse, dateKey, dayStatus, fmtChange, getNotes, prettyDate } from "../lib/data.js";
import { getPatientTrends, isAuthenticated } from "../lib/api.js";

export default function PatientDetail() {
  const { id } = useParams();
  const [livePatient, setLivePatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const authed = isAuthenticated();

  useEffect(() => {
    let mounted = true;
    if (!authed) {
      setLoading(false);
      return;
    }
    async function loadTrends() {
      try {
        setLoading(true);
        const res = await getPatientTrends(id);
        if (mounted && res.success && res.data) {
          const d = res.data;
          const measurements = Array.isArray(d.history) ? d.history : Array.isArray(d) ? d : [];
          setLivePatient({
            id: d.patientId || id,
            name: d.name || "Patient " + String(id).slice(-4),
            list: measurements.map((m) => ({
              date: m.date || (m.createdAt ? m.createdAt.slice(0, 10) : dateKey()),
              tremor: m.tremor,
              speech: m.speech,
              typing: m.typing,
              source: m.source || { tremor: "sensor", speech: "mic", typing: "pad" },
              details: m.details || {},
              savedAt: m.savedAt || m.createdAt
            }))
          });
        }
      } catch (err) {
        console.warn("Could not fetch live patient trends:", err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadTrends();
    return () => { mounted = false; };
  }, [id, authed]);

  const patient = livePatient;

  if (!authed) {
    return (
      <Shell role="doctor">
        <PageHead title="Authentication required"><Link className="btn soft" to="/doctor"><FiChevronLeft /> Back to patients</Link></PageHead>
        <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
          <h2>Doctor Authentication Required</h2>
          <p className="muted" style={{ margin: "12px 0 20px" }}>Please log in to view genuine clinical trends.</p>
          <Link className="btn" to="/login/doctor">Sign in</Link>
        </div>
      </Shell>
    );
  }

  if (loading) {
    return (
      <Shell role="doctor">
        <PageHead title="Loading patient record..."><Link className="btn soft" to="/doctor"><FiChevronLeft /> Back to patients</Link></PageHead>
        <div className="card"><Empty text="Fetching patient trends from clinical database..." /></div>
      </Shell>
    );
  }

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
      title: prettyDate(e.date), sub: "Daily check-in",
      tag: <span className={"chip " + (st === "warn" ? "warn" : st === "ok" ? "ok" : "info")}>{st === "warn" ? "Above usual" : st === "ok" ? "In range" : "Learning"}</span>
    };
  });

  const notes = getNotes();
  const noteLines = Object.keys(notes).sort().slice(-5).map((d) => {
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
      <RightPanel avatar={<Avatar seed={patient.id} size={96} />} name={name} sub="Enrolled patient"
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
          ? <TrendChart series={METRIC_KEYS.map((k) => ({ label: METRICS[k].label, color: METRICS[k].color, values: a.z[k].slice(-n) }))} dates={a.dates.slice(-n)} flagFrom={flagFrom} label="Motion variability, speech and typing compared with the patient's usual range" />
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

      {list.length > 0 && (() => {
        const latestEntry = list[list.length - 1];
        const latestDetails = latestEntry?.details || {};
        return (
          <section className="card">
            <div className="card-head">
              <div>
                <h2>Latest Clinical Biomarkers & Features</h2>
                <p className="muted small">Captured from on-device check-in on {prettyDate(latestEntry.date)}.</p>
              </div>
            </div>
            <div className="grid3" style={{ marginTop: 14 }}>
              <div style={{ background: "var(--lav2)", padding: 16, borderRadius: 16, border: "1.5px solid var(--lav3)" }}>
                <b style={{ color: "#1FB5CC", display: "block", marginBottom: 6 }}>Voice & Speech Cadence</b>
                <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                  <div>Pitch / Tone: <strong>{latestDetails.pitch_tone || (Number.isFinite(latestDetails.pitch_avg_hz) ? `${Math.round(latestDetails.pitch_avg_hz)} Hz · ${latestDetails.pitch_variation_hz < 15 ? "Monotone" : "Natural"}` : "Natural inflection")}</strong></div>
                  <div>Fumbling: <strong>{latestDetails.fumbling || "None (smooth)"}</strong></div>
                  <div>Pauses: <strong>{latestDetails.pause_count ?? (latestEntry.speech ?? "0")}</strong></div>
                  <div>Duration: <strong>{Number.isFinite(latestDetails.speech_duration_seconds) ? `${Number(latestDetails.speech_duration_seconds).toFixed(1)} s` : "Normal"}</strong></div>
                </div>
              </div>
              <div style={{ background: "var(--lav2)", padding: 16, borderRadius: 16, border: "1.5px solid var(--lav3)" }}>
                <b style={{ color: "#FF9F43", display: "block", marginBottom: 6 }}>Typing Rhythm</b>
                <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                  <div>Speed: <strong>{Number.isFinite(latestDetails.typing_speed) ? `${Number(latestDetails.typing_speed).toFixed(1)} WPM` : "Recorded"}</strong></div>
                  <div>Inter-key Gap: <strong>{latestEntry.typing ? `${latestEntry.typing} ms` : "Normal"}</strong></div>
                  <div>Key Hold: <strong>{Number.isFinite(latestDetails.key_hold_time_avg_ms) ? `${Math.round(latestDetails.key_hold_time_avg_ms)} ms` : "Normal"}</strong></div>
                  <div>Errors: <strong>{latestDetails.typing_errors ?? 0}</strong></div>
                </div>
              </div>
              <div style={{ background: "var(--lav2)", padding: 16, borderRadius: 16, border: "1.5px solid var(--lav3)" }}>
                <b style={{ color: "#5B61EC", display: "block", marginBottom: 6 }}>Phone Motion</b>
                <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                  <div>Variability: <strong>{Number.isFinite(latestDetails.motion_variability) ? Number(latestDetails.motion_variability).toFixed(3) : (latestEntry.tremor ? Number(latestEntry.tremor).toFixed(3) : "Recorded")} m/s²</strong></div>
                  <div>Sensor: <strong>{latestEntry.source?.tremor || "On-device accelerometer"}</strong></div>
                </div>
              </div>
            </div>
          </section>
        );
      })()}

      <section className="card">
        <h2 style={{ marginBottom: 6 }}>Patient notes</h2>
        <p className="muted small">{noteLines.length ? noteLines.join(" · ") : "Notes on medicine timing and sleep appear here when the patient adds them."}</p>
      </section>
    </Shell>
  );
}
