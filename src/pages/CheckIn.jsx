import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiMic, FiSmartphone, FiCheck } from "react-icons/fi";
import { LuKeyboard } from "react-icons/lu";
import { Shell } from "../components/Shell.jsx";
import { VoiceArt, TypingArt, MotionArt } from "../components/Illustrations.jsx";
import { dateKey, saveCheckin } from "../lib/data.js";
import { PHRASE, collectMotion, recordLevels, round, sampleReading, speechFeatures, tremorIndex, typingFeatures } from "../lib/measure.js";

const STEPS = [
  { key: "voice", metric: "speech", label: "Voice", Icon: FiMic, Art: VoiceArt, title: "Say “aaah” for 5 seconds", help: "Sit comfortably and hold the phone near you." },
  { key: "typing", metric: "typing", label: "Typing", Icon: LuKeyboard, Art: TypingArt, title: "Type this phrase", help: "Use the keys below or your keyboard. Type at your normal pace." },
  { key: "motion", metric: "tremor", label: "Motion", Icon: FiSmartphone, Art: MotionArt, title: "Hold the phone steady", help: "Rest your arm on your lap and hold the phone still for 10 seconds." }
];

export default function CheckIn() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState({ text: "", err: false });
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState(null);
  const [typed, setTyped] = useState("");
  const heading = useRef(null);
  const stepRef = useRef(0);                    // current step for event handlers
  const store = useRef({ result: {}, sources: {}, details: {} });
  const typing = useRef({ typed: "", presses: [], down: {}, done: false });

  useEffect(() => { stepRef.current = step; if (heading.current) heading.current.focus(); }, [step]);

  /* Save one finished step. After the last step, store the check-in and show the result. */
  function finish(key, metric, value, source, extra) {
    const s = store.current;
    s.result[metric] = value; s.sources[key] = source; Object.assign(s.details, extra || {});
    setStatus({ text: "", err: false }); setBusy(false); setCount(null);
    if (stepRef.current < STEPS.length - 1) setStep(stepRef.current + 1);
    else {
      saveCheckin({ date: dateKey(), tremor: s.result.tremor, speech: s.result.speech, typing: s.result.typing, source: s.sources, details: s.details, savedAt: new Date().toISOString() });
      nav("/result");
    }
  }
  const fail = (text) => { setStatus({ text, err: true }); setBusy(false); setCount(null); };
  const skipWithSample = (st) => { if (st.key === "typing") typing.current.done = true; finish(st.key, st.metric, sampleReading(st.metric), "sample"); };

  /* 1. Voice */
  async function startVoice() {
    setBusy(true); setStatus({ text: "Listening… keep saying “aaah”.", err: false });
    try {
      const f = speechFeatures(await recordLevels(setCount));
      if (!f) throw new Error("silent");
      finish("voice", "speech", round(f.pauseRatio, 2), "mic", { pauses: f.pauses });
    } catch (err) {
      const denied = !navigator.mediaDevices || (err && (err.name === "NotAllowedError" || err.name === "NotFoundError"));
      fail(denied ? "We can't use the microphone. Allow access in your browser, or use a sample reading." : "We couldn't hear you. Move closer to the phone and try again.");
    }
  }

  /* 2. Typing: our own on-screen pad records press and release times. */
  function keyDown(ch) {
    const t = typing.current;
    if (t.done || stepRef.current !== 1 || t.down[ch] !== undefined) return;
    t.down[ch] = performance.now();
  }
  function keyUp(ch) {
    const t = typing.current;
    if (t.done || stepRef.current !== 1 || t.down[ch] === undefined) return;
    const down = t.down[ch], up = performance.now();
    delete t.down[ch];
    t.presses.push({ down, up, ok: ch === PHRASE[t.typed.length] });
    t.typed += ch;
    setTyped(t.typed);
    if (t.typed.length >= PHRASE.length) {
      t.done = true;
      const f = typingFeatures(t.presses);
      finish("typing", "typing", round(f.gapMs, 1), "pad", { holdMs: round(f.holdMs, 1), typingErrors: f.errors });
    }
  }
  useEffect(() => {                              // a physical keyboard works too
    const down = (e) => { if (stepRef.current === 1 && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey && /^[a-z ]$/i.test(e.key)) { e.preventDefault(); keyDown(e.key.toLowerCase()); } };
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
      const idx = tremorIndex(await collectMotion(10000, setCount));
      if (idx === null) throw new Error("nosensor");
      finish("motion", "tremor", round(idx, 2), "sensor");
    } catch (err) {
      fail(err.message === "denied" ? "Motion access was denied. Allow it in your browser settings, or use a sample reading." : "No motion sensor found. Open this page on a phone, or use a sample reading.");
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
                <span key={i} className={i < typed.length ? (typed[i] === c ? "good" : "bad") : i === typed.length ? "next" : ""}>{c === " " ? "\u00a0" : c}</span>
              ))}
            </p>
            <div className="pad">
              {["qwertyuiop", "asdfghjkl", "zxcvbnm", " "].map((row) => (
                <div className="pad-row" key={row}>
                  {row.split("").map((ch) => (
                    <button key={ch} type="button" className={"key" + (ch === " " ? " space" : "")} aria-label={ch === " " ? "space" : ch}
                      onPointerDown={(e) => { e.preventDefault(); keyDown(ch); }} onPointerUp={() => keyUp(ch)} onPointerCancel={() => keyUp(ch)} onPointerLeave={() => keyUp(ch)}>
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

        {st.key === "voice" && <button type="button" className="btn lg" disabled={busy} onClick={startVoice}>{status.err ? "Try again" : "Start recording"}</button>}
        {st.key === "motion" && <button type="button" className="btn lg" disabled={busy} onClick={startMotion}>{status.err ? "Try again" : "Start"}</button>}
        <button type="button" className="link-btn" onClick={() => skipWithSample(st)}>
          {st.key === "voice" ? "No microphone? Use a sample reading" : st.key === "typing" ? "Skip with a sample reading" : "No motion sensor? Use a sample reading"}
        </button>
      </section>
    </Shell>
  );
}
