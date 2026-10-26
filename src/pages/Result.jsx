import { Link, Navigate } from "react-router-dom";
import { FiAlertTriangle, FiArrowRight } from "react-icons/fi";
import { Shell, PageHead, Banner } from "../components/Shell.jsx";
import { CelebrateArt } from "../components/Illustrations.jsx";
import { SIGNALS } from "../components/signals.jsx";
import { useCheckins } from "../hooks.js";
import { BASELINE_DAYS, FLAG_NEEDED, FLAG_WINDOW, METRIC_KEYS, describeZ, streak } from "../lib/data.js";

export default function Result() {
  const { list, analysis: a } = useCheckins();
  if (!list.length) return <Navigate to="/home" replace />;
  const left = BASELINE_DAYS - a.base.n;

  return (
    <Shell>
      <PageHead title="Check-in complete" />
      <Banner art={<CelebrateArt />} title={<>Well done, <b>that's today's check-in</b></>}
        text={a.base.ready ? "Here is how today compares with your own baseline." : `Your first ${BASELINE_DAYS} check-ins set what is normal for you. ${left} to go.`}
        ring={{ value: Math.min(streak(list), 7), max: 7, label: "days" }} />

      <div className="result-grid">
        {METRIC_KEYS.map((k) => {
          const S = SIGNALS[k];
          const src = a.latest.entry.source && a.latest.entry.source[S.step];
          let chip = <span className="chip info">Learning {a.base.n}/{BASELINE_DAYS}</span>;
          if (a.base.ready) { const d = describeZ(a.latest.z[k]); chip = <span className={"chip " + d.tone}>{d.text}</span>; }
          return (
            <div className="result-card" key={k}>
              <span className="stat-ic" style={{ background: S.color, marginBottom: 4 }}><S.Icon /></span>
              <b>{S.label}</b>
              <span className="muted small">From {S.from.toLowerCase()}{src === "sample" ? " (sample reading)" : ""}</span>
              {chip}
            </div>
          );
        })}
      </div>

      {a.flagged.length > 0 && (
        <div className="alert" role="status">
          <FiAlertTriangle aria-hidden="true" />
          <div>
            <b>A sustained change was noted</b>
            <p>{a.flagged.map((k) => SIGNALS[k].label.toLowerCase()).join(" and ")} has been above your usual range on at least {FLAG_NEEDED} of your last {FLAG_WINDOW} check-ins. Your doctor will see this in your trend.</p>
          </div>
        </div>
      )}

      <p className="muted small">Your doctor sees the trend over time. This is not a diagnosis.</p>
      <div className="pill-row">
        <Link className="btn" to="/home">Back to home</Link>
        <Link className="btn soft" to="/trends">See my trends <FiArrowRight /></Link>
      </div>
    </Shell>
  );
}
