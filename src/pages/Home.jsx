import { useState } from "react";
import { Link } from "react-router-dom";
import { FiZap, FiCheckCircle, FiTarget, FiEdit3, FiMoon, FiCheck, FiArrowRight } from "react-icons/fi";
import { LuPill } from "react-icons/lu";
import { Shell, PageHead, Banner, StatCard, AddCard, RightPanel, ChartCard, Empty } from "../components/Shell.jsx";
import { PatientArt, Avatar } from "../components/Illustrations.jsx";
import { MiniArea } from "../components/Charts.jsx";
import { SIGNALS } from "../components/signals.jsx";
import { useCheckins, useTodayNotes, greeting } from "../hooks.js";
import { BASELINE_DAYS, CONTEXT_BASELINE_DAYS, METRIC_KEYS, compareContextEntry, dateKey, dayStatus, describeZ, fmtChange, getContextBaseline, getContextEntries, lastDays, saveContextEntry, streak } from "../lib/data.js";

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Home() {
  const { list, analysis: a } = useCheckins();
  const [notes, toggle] = useTodayNotes();
  const today = dateKey();
  const [contextForm, setContextForm] = useState(() => {
    const saved = getContextEntries().find((entry) => entry.date === today);
    return saved
      ? { sleepHours: String(saved.sleepHours), stressLevel: saved.stressLevel, workHours: String(saved.workHours) }
      : { sleepHours: "", stressLevel: "medium", workHours: "" };
  });
  const [contextMessage, setContextMessage] = useState("");
  const contextEntries = getContextEntries();
  const contextBaseline = getContextBaseline(contextEntries);
  const todayContext = contextEntries.find((entry) => entry.date === today);
  const afterBaseline = contextBaseline.ready && todayContext && todayContext.date > contextBaseline.throughDate;
  const todayComparison = afterBaseline ? compareContextEntry(todayContext, contextBaseline) : null;
  const done = list.some((e) => e.date === today);
  const s = streak(list);
  const noteCount = Object.values(notes).filter(Boolean).length;
  const dateText = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", year: "numeric" });

  function saveContext(event) {
    event.preventDefault();
    saveContextEntry(today, {
      sleepHours: Number(contextForm.sleepHours),
      stressLevel: contextForm.stressLevel,
      workHours: Number(contextForm.workHours)
    });
    setContextMessage("Today's context is saved on this device.");
  }

  function updateContext(field, value) {
    setContextForm((current) => ({ ...current, [field]: value }));
    setContextMessage("");
  }

  const items = METRIC_KEYS.map((k) => {
    const S = SIGNALS[k];
    let tag = <span className="chip info">Learning</span>;
    if (a.base.ready && a.latest) {
      const d = describeZ(a.latest.z[k]);
      tag = <span className={"chip " + d.tone}>{d.tone === "ok" ? "In range" : a.latest.z[k] > 0 ? "Higher" : "Lower"}</span>;
    }
    return { lead: <span className="lead-ic" style={{ background: S.color }}><S.Icon /></span>, title: S.label, sub: S.from, tag };
  });

  const chart = a.base.ready
    ? (
      <ChartCard title="Tremor trend" sub="Last 14 check-ins">
        <MiniArea values={a.z.tremor.slice(-14)} big={fmtChange(a.latest.change.tremor)} caption="Tremor trend compared with your usual range" />
      </ChartCard>
    )
    : <div className="panel"><Empty text={`Learning your baseline: ${a.base.n} of ${BASELINE_DAYS} check-ins`} /></div>;

  return (
    <Shell right={
      <RightPanel avatar={<Avatar seed="you" size={96} />} name="You" sub="Daily check-in"
        listTitle="Latest results" listLink={<Link to="/trends">View all</Link>} items={items} chart={chart} />
    }>
      <PageHead title="Home" date={dateText} />

      <Banner art={<PatientArt />} title={<>{greeting()}, <b>welcome back</b></>}
        text={done ? "You checked in today. Nice work." : "Ready for today's 30-second check-in?"}
        ring={{ value: Math.min(s, 7), max: 7, label: "days" }}>
        <Link className="btn white" to={done ? "/result" : "/checkin"}>
          {done ? "View today's result" : "Start check-in"} <FiArrowRight />
        </Link>
      </Banner>

      <section aria-labelledby="rep">
        <div className="section-title"><h2 id="rep">Report</h2></div>
        <div className="stats">
          <StatCard icon={FiZap} color="#FF9F43" label="Streak (days)" value={s} />
          <StatCard icon={FiCheckCircle} color="#1FB5CC" label="Check-ins" value={list.length} />
          <StatCard icon={FiTarget} color="#5B61EC" label="Baseline" value={`${Math.min(a.base.n, BASELINE_DAYS)}/${BASELINE_DAYS}`} />
          <StatCard icon={FiEdit3} color="#F4577B" label="Notes today" value={noteCount} />
          <AddCard to="/checkin" label="New check-in" />
        </div>
      </section>

      <section className="card" aria-labelledby="wk">
        <div className="card-head"><h2 id="wk">This week</h2><span className="muted small">Filled dots are check-ins</span></div>
        <div className="week">
          {lastDays(7).map((d) => {
            const key = dateKey(d), st = dayStatus(list, a, key);
            return (
              <div key={key} className={"day" + (key === today ? " today" : "")}>
                <span>{DAY[d.getDay()]}</span><b>{d.getDate()}</b>
                <span className={"dot " + st} aria-label={st === "none" ? "No check-in" : "Checked in"}>{st === "none" ? "–" : <FiCheck />}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card" aria-labelledby="nt">
        <div className="card-head"><h2 id="nt">Add a note for your doctor</h2></div>
        <div className="pill-row">
          <button type="button" className="pill" aria-pressed={!!notes.medicine} onClick={() => toggle("medicine")}><LuPill /> Took medicine</button>
          <button type="button" className="pill" aria-pressed={!!notes.sleep} onClick={() => toggle("sleep")}><FiMoon /> Slept well</button>
        </div>
      </section>

      <section className="card" aria-labelledby="context-title">
        <div className="card-head"><div><h2 id="context-title">Sleep, stress and work hours</h2><p className="muted small">Track daily context and compare it with your own baseline.</p></div></div>
        <div className="context-baseline">
          {contextBaseline.ready
            ? <><b>Your baseline · first {CONTEXT_BASELINE_DAYS} entries</b><span>{contextBaseline.sleepHours.toFixed(1)} h sleep · {contextBaseline.stressLevel} stress · {contextBaseline.workHours.toFixed(1)} h work</span></>
            : <><b>Building your baseline · {contextBaseline.n}/{CONTEXT_BASELINE_DAYS}</b><span>After {CONTEXT_BASELINE_DAYS} daily entries, new days will be compared with your usual sleep, stress and work hours.</span></>}
        </div>
        <form className="context-form" onSubmit={saveContext}>
          <label className="context-field"><span>Sleep last night (hours)</span><input type="number" min="0" max="24" step="0.5" inputMode="decimal" value={contextForm.sleepHours} onChange={(event) => updateContext("sleepHours", event.target.value)} placeholder="e.g. 7.5" required /></label>
          <label className="context-field"><span>Stress / workload today</span><select value={contextForm.stressLevel} onChange={(event) => updateContext("stressLevel", event.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
          <label className="context-field"><span>Hours worked today</span><input type="number" min="0" max="24" step="0.5" inputMode="decimal" value={contextForm.workHours} onChange={(event) => updateContext("workHours", event.target.value)} placeholder="e.g. 8" required /></label>
          <button type="submit" className="btn">Save today's context</button>
        </form>
        {todayComparison && <p className="context-feedback">Compared with your baseline: sleep {todayComparison.sleepHours >= 0 ? "+" : ""}{todayComparison.sleepHours.toFixed(1)} h · stress {todayComparison.stress < 0 ? "lower" : todayComparison.stress > 0 ? "higher" : "about the same"} · work {todayComparison.workHours >= 0 ? "+" : ""}{todayComparison.workHours.toFixed(1)} h.</p>}
        <p className="context-note" role="status" aria-live="polite">{contextMessage || "This self-reported context stays on this device. The first 7 saved days establish your baseline."}</p>
      </section>
    </Shell>
  );
}
