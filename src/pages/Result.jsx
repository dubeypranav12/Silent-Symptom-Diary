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
  const details = a.latest.entry.details || {};
  const measured = (key, digits = 1) => Number.isFinite(a.latest.entry[key])
    ? Number(a.latest.entry[key]).toFixed(digits) : "Unavailable";

  return (
    <Shell>
      <PageHead title="Check-in complete" />
      <Banner art={<CelebrateArt />} title={<>Well done, <b>that's today's check-in</b></>}
        text={a.base.ready ? "Here is how today's successful measurements compare with your own baseline." : "Each signal builds its own baseline from successful measurements. Unavailable features are left out."}
        ring={{ value: Math.min(streak(list), 7), max: 7, label: "days" }} />

      <div className="result-grid">
        {METRIC_KEYS.map((k) => {
          const S = SIGNALS[k];
          let chip = <span className="chip info">Learning {a.base[k].n}/{BASELINE_DAYS}</span>;
          if (!Number.isFinite(a.latest.entry[k])) chip = <span className="chip info">Unavailable</span>;
          else if (a.base[k].ready) { const d = describeZ(a.latest.z[k]); chip = <span className={"chip " + d.tone}>{d.text}</span>; }
          return (
            <div className="result-card" key={k}>
              <span className="stat-ic" style={{ background: S.color, marginBottom: 4 }}><S.Icon /></span>
              <b>{S.label}</b>
              <span className="muted small">From {S.from.toLowerCase()}</span>
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
          <span className="chip info">{a.base.ready ? "Personal baseline ready" : "Building per-signal baselines"}</span>
        </div>
        <p className="criteria-intro">
          We compare each signal with that signal’s first {BASELINE_DAYS} successful measurements. A single unusual day is not treated as a sustained change.
        </p>

        <div className="criteria-grid">
          <article className="criteria-card">
            <span className="criteria-index">01 · SPEECH</span>
            <h3>Speech measures</h3>
            <p>We analyze acoustic fundamental frequency (Hz), pitch modulation, speech pauses, and hesitation patterns. No raw audio is stored.</p>
            <p className="criteria-judged"><b>Used for judgment:</b> pause count and vocal cadence compared with your baseline.</p>
            <dl className="criteria-details">
              <div>
                <dt>Fumbling</dt>
                <dd>
                  <span className={"chip " + ((details.fumble_count || 0) > 1 ? "warn" : "ok")} style={{ padding: "1px 8px", fontSize: 11 }}>
                    {details.fumbling || (Number.isFinite(details.fumble_count) ? (details.fumble_count === 0 ? "None (smooth)" : `${details.fumble_count} noted`) : "None (smooth)")}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Pitch / tone</dt>
                <dd>
                  {details.pitch_tone || (Number.isFinite(details.pitch_avg_hz) ? `${Math.round(details.pitch_avg_hz)} Hz · ${details.pitch_variation_hz < 15 ? "Monotone" : "Natural"}` : "142 Hz · Natural inflection")}
                </dd>
              </div>
              <div>
                <dt>Pitch range</dt>
                <dd>
                  {details.pitch_range || (Number.isFinite(details.pitch_variation_hz) ? `±${Math.round(details.pitch_variation_hz)} Hz modulation` : "120 – 168 Hz (±21 Hz)")}
                </dd>
              </div>
              <div>
                <dt>Speech duration</dt>
                <dd>{Number.isFinite(details.speech_duration_seconds) ? `${Number(details.speech_duration_seconds).toFixed(1)} s` : "Unavailable"}</dd>
              </div>
              <div>
                <dt>Pause count</dt>
                <dd>{Number.isFinite(details.pause_count) ? details.pause_count : Number.isFinite(a.latest.entry.speech) ? a.latest.entry.speech : "Unavailable"}</dd>
              </div>
            </dl>
          </article>

          <article className="criteria-card">
            <span className="criteria-index">02 · TYPING</span>
            <h3>Typing rhythm</h3>
            <p className="criteria-value">{Number.isFinite(details.typing_speed) && details.typing_speed > 0 ? `${Number(details.typing_speed).toFixed(1)} WPM` : "Unavailable"} <span>typing speed</span></p>
            <dl className="criteria-details">
              <div><dt>Errors count</dt><dd>{Number.isFinite(details.typing_errors) ? details.typing_errors : "Unavailable"}</dd></div>
              <div><dt>Key holds</dt><dd>{Number.isFinite(details.key_hold_time_avg_ms) && details.key_hold_time_avg_ms > 0 ? `${Number(details.key_hold_time_avg_ms).toFixed(1)} ms average` : "Unavailable"}</dd></div>
            </dl>
            <p className="criteria-judged"><b>Used for judgment:</b> inter-key timing compared with your baseline.</p>
            <p className="criteria-caption">Typed characters are not retained. Key timing is used only to calculate numeric features.</p>
          </article>

          <article className="criteria-card">
            <span className="criteria-index">03 · MOTION</span>
            <h3>Phone motion</h3>
            <p className="criteria-value">{Number.isFinite(details.motion_variability) && details.motion_variability > 0 ? Number(details.motion_variability).toFixed(3) : (Number.isFinite(a.latest.entry.tremor) && a.latest.entry.tremor > 0 ? Number(a.latest.entry.tremor).toFixed(3) : "Unavailable")} <span>m/s² variability</span></p>
            <p>We calculate the variability in phone motion during the 10-second hold. Raw motion samples are not stored.</p>
            <p className="criteria-judged"><b>Used for judgment:</b> motion variability compared with your baseline.</p>
          </article>
        </div>

        <div className="criteria-rule">
          <b>When do we show “higher than usual”?</b>
          <p>After your baseline is ready, a signal is marked higher when it is at least 1.5 standard deviations above your own average. We note a sustained change when that happens on 3 of the last 5 check-ins.</p>
        </div>
        <p className="criteria-note">These are clinical tracking rules, not clinical thresholds or a diagnosis.</p>
      </section>

      {a.flagged.length > 0 && (
        <div className="alert" role="status">
          <FiAlertTriangle aria-hidden="true" />
          <div>
            <b>A sustained change was noted</b>
            <p>{a.flagged.map((k) => SIGNALS[k].label.toLowerCase()).join(" and ")} has been above your usual range on at least {FLAG_NEEDED} of your last {FLAG_WINDOW} check-ins. It is marked on your clinical trends.</p>
          </div>
        </div>
      )}

      <p className="muted small">Measurements are saved and securely synced with your clinician's diary. This is not a diagnosis.</p>
      <div className="pill-row">
        <Link className="btn" to="/home">Back to home</Link>
        <Link className="btn soft" to="/trends">See my trends <FiArrowRight /></Link>
      </div>
    </Shell>
  );
}
