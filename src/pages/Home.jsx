import { Link } from "react-router-dom";
import { FiZap, FiCheckCircle, FiTarget, FiEdit3, FiMoon, FiCheck, FiArrowRight } from "react-icons/fi";
import { LuPill } from "react-icons/lu";
import { Shell, PageHead, Banner, StatCard, AddCard, RightPanel, ChartCard, Empty } from "../components/Shell.jsx";
import { PatientArt, Avatar } from "../components/Illustrations.jsx";
import { MiniArea } from "../components/Charts.jsx";
import { SIGNALS } from "../components/signals.jsx";
import { useCheckins, useTodayNotes, greeting } from "../hooks.js";
import { BASELINE_DAYS, METRIC_KEYS, dateKey, dayStatus, describeZ, fmtChange, lastDays, streak } from "../lib/data.js";

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Home() {
  const { list, analysis: a } = useCheckins();
  const [notes, toggle] = useTodayNotes();
  const today = dateKey();
  const done = list.some((e) => e.date === today);
  const s = streak(list);
  const noteCount = Object.values(notes).filter(Boolean).length;
  const dateText = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", year: "numeric" });

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
    </Shell>
  );
}
