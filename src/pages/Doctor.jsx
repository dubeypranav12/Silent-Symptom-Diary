import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiUsers, FiCheckCircle, FiAlertTriangle, FiTarget, FiArrowRight } from "react-icons/fi";
import { Shell, PageHead, Banner, StatCard, AddCard, RightPanel, ChartCard, Empty } from "../components/Shell.jsx";
import { DoctorArt, DoctorAvatar, Avatar } from "../components/Illustrations.jsx";
import { MiniArea } from "../components/Charts.jsx";
import { SIGNALS } from "../components/signals.jsx";
import { BASELINE_DAYS, METRICS, METRIC_KEYS, Z_LIMIT, allPatients, analyse, dateKey, dayStatus, fmtChange, lastDays, prettyDate } from "../lib/data.js";

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CELL_TEXT = { ok: "OK", warn: "High", learn: "New", none: "–" };

export default function Doctor() {
  const rows = useMemo(() => allPatients().map((p) => ({ ...p, a: analyse(p.list) })), []);
  const [note, setNote] = useState("");
  const today = dateKey();
  const flagged = rows.filter((r) => r.a.flagged.length);
  const learning = rows.filter((r) => !r.a.base.ready);
  const checkedToday = rows.filter((r) => r.list[r.list.length - 1].date === today);
  const days = lastDays(7);
  const dateText = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", year: "numeric" });

  const first = flagged[0];
  const items = flagged.slice(0, 3).map((r) => ({
    lead: <Avatar seed={r.id} size={42} />, title: r.name,
    sub: r.a.flagged.map((k) => METRICS[k].label + " " + fmtChange(r.a.latest.change[k])).join(", "),
    tag: <span className="chip warn">Flagged</span>
  }));
  const chart = first
    ? (
      <ChartCard title={`${first.name}: ${METRICS[first.a.flagged[0]].label.toLowerCase()}`} sub="Last 14 check-ins">
        <MiniArea values={first.a.z[first.a.flagged[0]].slice(-14)} big={fmtChange(first.a.latest.change[first.a.flagged[0]])} caption="Flagged signal compared with the patient's usual range" />
      </ChartCard>
    )
    : <div className="panel"><Empty text="No sustained changes right now." /></div>;

  return (
    <Shell role="doctor" right={
      <RightPanel avatar={<DoctorAvatar size={96} />} name="Doctor" sub="Neurology clinic · demo view"
        listTitle="Needs attention" items={items} chart={chart} />
    }>
      <PageHead title="Dashboard" date={dateText} />

      <Banner art={<DoctorArt />} title={<>Welcome, <b>Doctor</b></>}
        text={flagged.length ? `${flagged.length} of ${rows.length} patients show a sustained change.` : "No patient shows a sustained change today."}
        ring={{ value: rows.length - flagged.length, max: rows.length, label: "stable" }}>
        <Link className="btn white" to={"/doctor/patient/" + (first ? first.id : rows[0].id)}>
          {first ? "Open flagged patient" : "Open first patient"} <FiArrowRight />
        </Link>
      </Banner>

      <section aria-labelledby="rep">
        <div className="section-title"><h2 id="rep">Report</h2><span className="chip sample">Sample data and this device</span></div>
        <div className="stats">
          <StatCard icon={FiUsers} color="#5B61EC" label="Patients" value={rows.length} />
          <StatCard icon={FiCheckCircle} color="#1FB5CC" label="Checked in today" value={checkedToday.length} />
          <StatCard icon={FiAlertTriangle} color="#F4577B" label="Sustained change" value={flagged.length} />
          <StatCard icon={FiTarget} color="#FF9F43" label="Learning baseline" value={learning.length} />
          <AddCard label="Invite patient" onClick={() => setNote("Inviting patients needs a backend. It is listed as future work.")} />
        </div>
        {note && <p className="muted small" role="status" style={{ marginTop: 10 }}>{note}</p>}
      </section>

      <section className="card" aria-labelledby="act">
        <div className="card-head">
          <h2 id="act">Check-in activity</h2>
          <div className="legend" aria-hidden="true">
            <span><i style={{ background: "#D7F5EA" }} />Within range</span>
            <span><i style={{ background: "#F4577B" }} />Above usual</span>
            <span><i style={{ background: "#F0F2FF", border: "1px solid #DDE1FF" }} />No check-in</span>
          </div>
        </div>
        <div className="scroll-x">
          <div className="activity" role="table" aria-label="Last 7 days of check-ins per patient">
            <span />
            {days.map((d) => <span className="hd" key={d.toISOString()}>{DAY[d.getDay()]} {d.getDate()}</span>)}
            {rows.map((r) => [
              <div className="who" key={r.id}><Avatar seed={r.id} size={34} /><Link to={"/doctor/patient/" + r.id}>{r.name}</Link></div>,
              ...days.map((d) => { const st = dayStatus(r.list, r.a, dateKey(d)); return <span key={r.id + d.getDate()} className={"cell " + st} title={`${r.name}, ${prettyDate(dateKey(d))}`}>{CELL_TEXT[st]}</span>; })
            ])}
          </div>
        </div>
      </section>

      <section className="card" aria-labelledby="pts">
        <div className="card-head"><h2 id="pts">Patients</h2></div>
        <div className="table-wrap">
          <table>
            <caption className="sr-only">Patients with change from their own baseline</caption>
            <thead><tr><th scope="col">Patient</th><th scope="col">Last check-in</th>{METRIC_KEYS.map((k) => <th scope="col" key={k}>{SIGNALS[k].label}</th>)}<th scope="col">Status</th></tr></thead>
            <tbody>
              {rows.map((r) => {
                const last = r.list[r.list.length - 1];
                return (
                  <tr key={r.id}>
                    <td><Link className="who" to={"/doctor/patient/" + r.id}><Avatar seed={r.id} size={36} />{r.name}</Link></td>
                    <td>{last.date === today ? "Today" : prettyDate(last.date)}</td>
                    {METRIC_KEYS.map((k) => (
                      <td key={k} className={r.a.base.ready && r.a.latest.z[k] >= Z_LIMIT ? "num-warn" : ""}>
                        {r.a.base.ready ? fmtChange(r.a.latest.change[k]) : <span className="muted">Learning</span>}
                      </td>
                    ))}
                    <td>{!r.a.base.ready ? <span className="chip info">Learning {r.a.base.n}/{BASELINE_DAYS}</span> : r.a.flagged.length ? <span className="chip warn">Flagged</span> : <span className="chip ok">Stable</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="muted small" style={{ marginTop: 12 }}>Percentages are change from each patient's own baseline. Flags need 3 of the last 5 check-ins above the usual range. Supports clinical decisions. Not a diagnosis.</p>
      </section>
    </Shell>
  );
}
