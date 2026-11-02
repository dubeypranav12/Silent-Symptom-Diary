import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiMic, FiSmartphone, FiCheck } from "react-icons/fi";
import { LuKeyboard } from "react-icons/lu";
import { Shell } from "../components/Shell.jsx";
import { VoiceArt, TypingArt, MotionArt } from "../components/Illustrations.jsx";
import { dateKey, saveCheckin } from "../lib/data.js";
import { PHRASE, VOICE_PROMPT, collectMotionVariability, recordSpeechFeatures, round, typingFeatures } from "../lib/measure.js";

const STEPS = [
  { key: "voice", metric: "speech", label: "Voice", Icon: FiMic, Art: VoiceArt, title: "Read this sentence aloud", help: "Speak at a comfortable pace and keep the phone near you." },
  { key: "typing", metric: "typing", label: "Typing", Icon: LuKeyboard, Art: TypingArt, title: "Type this phrase", help: "Use the keys below or your keyboard. Type at your normal pace." },
  { key: "motion", metric: "tremor", label: "Motion", Icon: FiSmartphone, Art: MotionArt, title: "Hold the phone steady", help: "Rest your arm on your lap and hold the phone still for 10 seconds." }
];

export default function CheckIn() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState({ text: "", err: false });
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState(null);
  const [typedCount, setTypedCount] = useState(0);
  const heading = useRef(null);
  const stepRef = useRef(0);                    // current step for event handlers
  const store = useRef({ result: {}, sources: {}, details: {} });
  const typing = useRef({ count: 0, errors: 0, presses: [], downTimes: [], done: false });

  useEffect(() => { stepRef.current = step; if (heading.current) heading.current.focus(); }, [step]);

  /* Save one finished step. After the last step, store the check-in and show the result. */
  function finish(key, metric, value, source, extra) {
    const s = store.current;
    s.result[metric] = Number.isFinite(value) ? value : null;
    s.sources[key] = s.result[metric] === null ? "unavailable" : source;
    Object.assign(s.details, extra || {});
    setStatus({ text: "", err: false }); setBusy(false); setCount(null);
    if (stepRef.current < STEPS.length - 1) setStep(stepRef.current + 1);
    else {
      saveCheckin({ date: dateKey(), tremor: s.result.tremor, speech: s.result.speech, typing: s.result.typing, source: s.sources, details: s.details, savedAt: new Date().toISOString() });
      nav("/result");
    }
  }
  const fail = (text) => { setStatus({ text, err: true }); setBusy(false); setCount(null); };
  const markUnavailable = (st) => {
    if (busy) return;
    if (st.key === "typing") {
      typing.current.done = true;
      typing.current.presses.length = 0;
      typing.current.downTimes.length = 0;
    }
    finish(st.key, st.metric, null, "unavailable");
  };

  /* 1. Voice */
  async function startVoice() {
    setBusy(true); setStatus({ text: "Listening… read the sentence on screen.", err: false });
    try {
      const f = await recordSpeechFeatures(setCount);
      if (!f) throw new Error("silent");
      finish("voice", "speech", f.pauseCount, "mic", {
        speech_duration_seconds: round(f.speechDurationSeconds, 2),
        pause_count: f.pauseCount
      });
    } catch (err) {
      const denied = !navigator.mediaDevices || (err && (err.name === "NotAllowedError" || err.name === "NotFoundError"));
      fail(denied ? "We can't use the microphone. Allow access or continue without this measurement." : "We couldn't analyze that sample. Try again or continue without this measurement.");
    }
  }

  /* 2. Typing: our own on-screen pad records press and release times. */
  function keyDown() {
    const t = typing.current;
    if (t.done || stepRef.current !== 1) return;
    t.downTimes.push(performance.now());
  }
  function keyUp(ch) {
    const t = typing.current;
    if (t.done || stepRef.current !== 1 || !t.downTimes.length) return;
    const down = t.downTimes.shift(), up = performance.now();
    if (ch !== PHRASE[t.count]) t.errors++;
    t.presses.push({ down, up });
    t.count++;
    setTypedCount(t.count);
    if (t.count >= PHRASE.length) {
      t.done = true;
      const f = typingFeatures(t.presses, PHRASE.trim().split(/\s+/).length);
      t.presses.length = 0;
      t.downTimes.length = 0;
      if (!f) {
        finish("typing", "typing", null, "unavailable");
        return;
      }
      finish("typing", "typing", round(f.gapMs, 1), "pad", {
        typing_speed: round(f.typingSpeed, 1),
        key_hold_time_avg_ms: round(f.keyHoldTimeAvgMs, 1),
        typing_errors: t.errors
      });
    }
  }
  useEffect(() => {                              // a physical keyboard works too
    const down = (e) => { if (stepRef.current === 1 && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey && /^[a-z ]$/i.test(e.key)) { e.preventDefault(); keyDown(); } };
    const up = (e) => { if (stepRef.current === 1 && /^[a-z ]$/i.test(e.key)) keyUp(e.key.toLowerCase()); };
    document.addEventListener("keydown", down); document.addEventListener("keyup", up);
    return () => { document.removeEventListener("keydown", down); document.removeEventListener("keyup", up); };
  }, []);

  /* 3. Phone motion */
  async function startMotion() {
    setBusy(true);
    try {
      if (window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === "function") {
        if ((await DeviceMotionEvent.requestPermission()) !== "granted") throw new Error("denied");
      }
      setStatus({ text: "Hold still…", err: false });
      const variability = await collectMotionVariability(10000, setCount);
      if (variability === null) throw new Error("nosensor");
      finish("motion", "tremor", round(variability, 4), "sensor", { motion_variability: round(variability, 4) });
    } catch (err) {
      fail(err.message === "denied" ? "Motion access was denied. Allow it in your browser settings or continue without this measurement." : "No motion sensor found. Continue without this measurement.");
    }
  }

  const st = STEPS[step];
  return (
    <Shell>
      <ol className="stepper" aria-label="Check-in steps" style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {STEPS.map((s, i) => (
          <li key={s.key} style={{ display: "contents" }}>
            <span className={"step-node" + (i === step ? " current" : i < step ? " done" : "")} aria-current={i === step ? "step" : undefined}>
              <span className="step-ic">{i < step ? <FiCheck /> : <s.Icon />}</span>
              <span>{s.label}</span>
            </span>
            {i < STEPS.length - 1 && <span className="step-bar" aria-hidden="true" />}
          </li>
        ))}
      </ol>

      <section className="stage">
        <div className="art"><st.Art /></div>
        <h1 ref={heading} tabIndex={-1}>{st.title}</h1>
        <p className="help">{st.help}</p>

        {st.key === "typing" && (
          <>
            <p className="prompt" aria-label={"Phrase to type: " + PHRASE}>
              {PHRASE.split("").map((c, i) => (
                <span key={i} className={i < typedCount ? "done" : i === typedCount ? "next" : ""}>{c === " " ? "\u00a0" : c}</span>
              ))}
            </p>
            <div className="pad">
              {["qwertyuiop", "asdfghjkl", "zxcvbnm", " "].map((row) => (
                <div className="pad-row" key={row}>
                  {row.split("").map((ch) => (
                    <button key={ch} type="button" className={"key" + (ch === " " ? " space" : "")} aria-label={ch === " " ? "space" : ch}
                      onPointerDown={(e) => { e.preventDefault(); keyDown(); }} onPointerUp={() => keyUp(ch)} onPointerCancel={() => keyUp(ch)} onPointerLeave={() => keyUp(ch)}>
                      {ch === " " ? "space" : ch}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}

        {st.key !== "typing" && count !== null && <div className={"count live"} aria-hidden="true">{count}</div>}
        <p className={"status" + (status.err ? " err" : "")} role="status" aria-live="polite">{status.text}</p>

        {st.key === "voice" && <p className="voice-prompt">“{VOICE_PROMPT}”</p>}
        {st.key === "voice" && <button type="button" className="btn lg" disabled={busy} onClick={startVoice}>{status.err ? "Try again" : "Start recording"}</button>}
        {st.key === "motion" && <button type="button" className="btn lg" disabled={busy} onClick={startMotion}>{status.err ? "Try again" : "Start"}</button>}
        <button type="button" className="link-btn" disabled={busy} onClick={() => markUnavailable(st)}>
          Continue without this measurement
        </button>
      </section>
    </Shell>
  );
}
