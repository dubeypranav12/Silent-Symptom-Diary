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
  const details = a.latest.entry.details || {};
  const sampleTyping = a.latest.entry.source?.typing === "sample";
  const value = (key, digits = 1) => Number.isFinite(Number(a.latest.entry[key]))
    ? `${Number(a.latest.entry[key]).toFixed(digits)}%` : "—";

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

      <section className="criteria-panel" aria-labelledby="criteria-title">
        <div className="criteria-heading">
          <div>
            <span className="eyebrow">YOUR CHECK-IN, EXPLAINED</span>
            <h2 id="criteria-title">What we measured and how we judge it</h2>
          </div>
          <span className="chip info">{a.base.ready ? "Personal baseline ready" : `Learning ${a.base.n}/${BASELINE_DAYS}`}</span>
        </div>
        <p className="criteria-intro">
          We compare each signal with your own first {BASELINE_DAYS} check-ins. A single unusual day is not treated as a sustained change.
        </p>

        <div className="criteria-grid">
          <article className="criteria-card">
            <span className="criteria-index">01 · SPEECH</span>
            <h3>Speech measures</h3>
            <p>We estimate the share of the 5-second “aaah” sample that is quiet after your voice starts. {Number.isFinite(details.pauses) ? `We detected ${details.pauses} quiet pause${details.pauses === 1 ? "" : "s"}.` : ""}</p>
            <p className="criteria-judged"><b>Used for judgment:</b> pause share compared with your baseline.</p>
            <dl className="criteria-details">
              <div><dt>Fumbling</dt><dd>Not captured yet</dd></div>
              <div><dt>Pitch / tone</dt><dd>Not captured yet</dd></div>
              <div><dt>Pauses</dt><dd>{value("speech", 2)}</dd></div>
            </dl>
          </article>

          <article className="criteria-card">
            <span className="criteria-index">02 · TYPING</span>
            <h3>Typing rhythm</h3>
            <p className="criteria-value">{Number.isFinite(Number(a.latest.entry.typing)) ? `${Number(a.latest.entry.typing).toFixed(1)} ms` : "—"} <span>between key presses</span></p>
            <dl className="criteria-details">
              <div><dt>Errors count</dt><dd>{Number.isFinite(details.typingErrors) ? details.typingErrors : sampleTyping ? "Not included in sample" : "—"}</dd></div>
              <div><dt>Key holds</dt><dd>{Number.isFinite(details.holdMs) ? `${Number(details.holdMs).toFixed(1)} ms average` : sampleTyping ? "Not included in sample" : "—"}</dd></div>
              <div><dt>Key pressure</dt><dd>{Number.isFinite(details.keyPressure) ? `${(Number(details.keyPressure) * 100).toFixed(0)}% normalized` : sampleTyping ? "Not included in sample" : "Not reported by this input"}</dd></div>
            </dl>
            <p className="criteria-judged"><b>Used for judgment:</b> average time between key presses.</p>
            <p className="criteria-caption">Pressure is read from touch or pen input when the device reports it. Keyboard pressure cannot be read; error count and key holds are shown as context.</p>
          </article>

          <article className="criteria-card">
            <span className="criteria-index">03 · TREMOR</span>
            <h3>Phone tremor</h3>
            <p className="criteria-value">{value("tremor", 2)} <span>in the tremor range</span></p>
            <p>We estimate the share of detected motion energy between 3 and 12 Hz while you hold the phone.</p>
            <p className="criteria-judged"><b>Used for judgment:</b> this motion share compared with your baseline.</p>
          </article>
        </div>

        <div className="criteria-rule">
          <b>When do we show “higher than usual”?</b>
          <p>After your baseline is ready, a signal is marked higher when it is at least 1.5 standard deviations above your own average. We note a sustained change when that happens on 3 of the last 5 check-ins.</p>
        </div>
        <p className="criteria-note">These are prototype tracking rules, not clinical thresholds or a diagnosis. Sample readings are simulated.</p>
      </section>

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
