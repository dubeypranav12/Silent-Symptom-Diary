import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiMic, FiSmartphone, FiCheck } from "react-icons/fi";
import { LuKeyboard } from "react-icons/lu";
import { Shell } from "../components/Shell.jsx";
import { VoiceArt, TypingArt, MotionArt } from "../components/Illustrations.jsx";
import { dateKey, saveCheckin } from "../lib/data.js";
import { logDailySymptoms } from "../lib/api.js";
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
  const [livePitch, setLivePitch] = useState(null);
  const [typed, setTyped] = useState("");
  const [wrongKey, setWrongKey] = useState(null);
  const wrongKeyTimeout = useRef(null);
  const [liveMotion, setLiveMotion] = useState(null);
  const inputRef = useRef(null);
  const keyTimers = useRef({});
  const heading = useRef(null);
  const stepRef = useRef(0);                    // current step for event handlers
  const store = useRef({ result: {}, sources: {}, details: {} });
  const typing = useRef({ count: 0, errors: 0, presses: [], downTimes: [], typed: "", done: false });

  useEffect(() => {
    return () => {
      if (wrongKeyTimeout.current) clearTimeout(wrongKeyTimeout.current);
    };
  }, []);

  useEffect(() => {
    stepRef.current = step;
    if (step === 1 && inputRef.current) {
      inputRef.current.focus();
    } else if (heading.current) {
      heading.current.focus();
    }
  }, [step]);

  /* Save one finished step. After the last step, store the check-in and show the result. */
  async function finish(key, metric, value, source, extra) {
    const s = store.current;
    s.result[metric] = Number.isFinite(value) ? value : null;
    s.sources[key] = s.result[metric] === null ? "unavailable" : source;
    Object.assign(s.details, extra || {});
    setStatus({ text: "", err: false }); setBusy(false); setCount(null); setLivePitch(null); setLiveMotion(null);
    if (stepRef.current < STEPS.length - 1) setStep(stepRef.current + 1);
    else {
      setBusy(true);
      setStatus({ text: "Saving measurements & running ML analysis…", err: false });
      const payload = {
        date: dateKey(),
        tremor: s.result.tremor,
        speech: s.result.speech,
        typing: s.result.typing,
        source: s.sources,
        details: s.details,
        savedAt: new Date().toISOString()
      };
      try {
        const apiRes = await logDailySymptoms(payload);
        if (apiRes.success && apiRes.data) {
          payload.riskScore = apiRes.riskScore;
          payload.mlFlag = apiRes.mlFlag;
        }
      } catch (err) {
        console.warn("Backend measurement sync skipped:", err.message);
      }
      saveCheckin(payload);
      nav("/result");
    }
  }
  const fail = (text) => { setStatus({ text, err: true }); setBusy(false); setCount(null); setLivePitch(null); setLiveMotion(null); };
  const markUnavailable = (st) => {
    if (busy) return;
    if (st.key === "typing") {
      typing.current.done = true;
      typing.current.presses.length = 0;
      typing.current.typed = "";
      setTyped("");
    }
    finish(st.key, st.metric, null, "unavailable");
  };

  /* 1. Voice: fundamental pitch (Hz), tone cadence & fumbling detection */
  async function startVoice() {
    setBusy(true); setStatus({ text: "Listening… read the sentence on screen.", err: false });
    setLivePitch(null);
    try {
      const f = await recordSpeechFeatures(setCount, 10000, ({ pitch, rms }) => {
        if (pitch && rms > 0.015) {
          setLivePitch(Math.round(pitch));
        }
      });
      if (!f) throw new Error("silent");
      finish("voice", "speech", f.pauseCount, "mic", {
        speech_duration_seconds: round(f.speechDurationSeconds, 2),
        pause_count: f.pauseCount,
        fumbling: f.fumbling,
        fumble_count: f.fumbleCount,
        hesitation_pauses: f.hesitationPauses,
        speech_interruptions: f.speechInterruptions,
        pitch_avg_hz: round(f.pitchAvgHz, 1),
        pitch_min_hz: round(f.pitchMinHz, 1),
        pitch_max_hz: round(f.pitchMaxHz, 1),
        pitch_variation_hz: round(f.pitchVariationHz, 1),
        pitch_tone: f.pitchTone,
        pitch_range: f.pitchRange
      });
    } catch (err) {
      const denied = !navigator.mediaDevices || (err && (err.name === "NotAllowedError" || err.name === "NotFoundError"));
      fail(denied ? "We can't use the microphone. Allow access or continue without this measurement." : "We couldn't analyze that sample. Try again or continue without this measurement.");
    } finally {
      setLivePitch(null);
    }
  }

  /* 2. Typing: real keystroke tracking with physical, mobile and on-screen keyboard support */
  function handleKeyDown(ch) {
    if (stepRef.current !== 1) return;
    keyTimers.current[ch] = performance.now();
  }

  function handleKeyUp(ch) {
    if (stepRef.current !== 1) return;
    const now = performance.now();
    const down = keyTimers.current[ch] || (now - 75);
    delete keyTimers.current[ch];
    const up = now;

    const t = typing.current;
    const nextExpected = PHRASE[typed.length];
    const isCorrect = ch.toLowerCase() === nextExpected;
    if (!isCorrect) {
      t.errors++;
      setWrongKey(ch);
      if (wrongKeyTimeout.current) clearTimeout(wrongKeyTimeout.current);
      wrongKeyTimeout.current = setTimeout(() => setWrongKey(null), 350);
      setStatus({ text: "Wrong key — error noted in telemetry", err: true });
    } else {
      setStatus({ text: "", err: false });
    }
    t.presses.push({ down, up, ok: isCorrect });
    const newTyped = typed + ch;
    setTyped(newTyped);

    if (newTyped.trim().toLowerCase() === PHRASE) {
      submitTyping(t.presses);
    }
  }

  function handleBackspace() {
    typing.current.errors++;
    setTyped((prev) => prev.slice(0, -1));
    setStatus({ text: "Correction recorded", err: false });
  }

  function submitTyping(pressesToUse = null) {
    const t = typing.current;
    if (t.done) return;
    const presses = pressesToUse || t.presses;
    if (!presses || presses.length < 2) {
      fail("Please type the phrase so we can measure your typing cadence.");
      return;
    }
    t.done = true;
    const f = typingFeatures(presses, PHRASE.trim().split(/\s+/).length);
    if (!f) {
      fail("Could not measure typing cadence. Please try typing the phrase again.");
      t.done = false;
      return;
    }
    finish("typing", "typing", round(f.gapMs, 1), "pad", {
      typing_speed: round(f.typingSpeed, 1),
      key_hold_time_avg_ms: round(f.keyHoldTimeAvgMs, 1),
      typing_errors: t.errors
    });
  }

  // Physical keyboard listeners for desktop
  useEffect(() => {
    const down = (e) => {
      if (stepRef.current !== 1 || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target === inputRef.current) return;
      if (e.key === "Backspace") {
        e.preventDefault();
        handleBackspace();
      } else if (/^[a-z ]$/i.test(e.key)) {
        e.preventDefault();
        handleKeyDown(e.key);
      }
    };
    const up = (e) => {
      if (stepRef.current !== 1) return;
      if (e.target === inputRef.current) return;
      if (/^[a-z ]$/i.test(e.key)) {
        handleKeyUp(e.key.toLowerCase());
      }
    };
    document.addEventListener("keydown", down);
    document.addEventListener("keyup", up);
    return () => {
      document.removeEventListener("keydown", down);
      document.removeEventListener("keyup", up);
    };
  }, [typed]);

  function onInputKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      submitTyping();
      return;
    }
    if (e.key === "Backspace") {
      typing.current.errors++;
      return;
    }
    keyTimers.current[e.key] = performance.now();
  }

  function onInputKeyUp(e) {
    if (e.key === "Backspace" || e.key === "Enter") return;
    const now = performance.now();
    const down = keyTimers.current[e.key] || (now - 75);
    delete keyTimers.current[e.key];
    const isCorrect = e.key.toLowerCase() === PHRASE[typed.length - 1];
    if (!isCorrect) {
      typing.current.errors++;
    }
    typing.current.presses.push({ down, up: now, ok: isCorrect });
  }

  function onInputChange(e) {
    const val = e.target.value.toLowerCase();
    setTyped(val);
    if (val.trim() === PHRASE) {
      setTimeout(() => submitTyping(), 200);
    }
  }

  /* 3. Phone motion: captures real device accelerometer or physical movement */
  async function startMotion() {
    setBusy(true);
    setLiveMotion({ count: 0, currentMag: 0, source: "sensor", active: true });
    setStatus({ text: "Hold steady for 10 seconds… measuring motion stability", err: false });
    try {
      if (typeof DeviceMotionEvent !== "undefined" && typeof DeviceMotionEvent.requestPermission === "function") {
        try {
          const res = await DeviceMotionEvent.requestPermission();
          if (res !== "granted") throw new Error("denied");
        } catch (e) {
          if (e.message === "denied") throw e;
        }
      }
      if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
        try { await DeviceOrientationEvent.requestPermission(); } catch (e) {}
      }
      const result = await collectMotionVariability(10000, setCount, (tick) => {
        setLiveMotion({ count: tick.count, currentMag: tick.currentMag, source: tick.source, active: true });
      });
      if (!result || !Number.isFinite(result.variability)) throw new Error("nosensor");
      finish("motion", "tremor", result.variability, result.source || "sensor", {
        motion_variability: result.variability
      });
    } catch (err) {
      fail(err.message === "denied"
        ? "Motion access was denied. Allow it in your browser settings or continue without this measurement."
        : "No motion sensor activity detected. Hold steady or continue without this measurement.");
    } finally {
      setLiveMotion(null);
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
              {PHRASE.split("").map((c, i) => {
                let statusClass = "";
                if (i < typed.length) {
                  statusClass = typed[i] === c ? "good" : "bad";
                } else if (i === typed.length) {
                  statusClass = "next";
                }
                return (
                  <span key={i} className={statusClass}>
                    {c === " " ? "\u00a0" : c}
                  </span>
                );
              })}
            </p>

            <div style={{ margin: "8px auto 14px", width: "100%", maxWidth: 460 }}>
              <input
                ref={inputRef}
                type="text"
                value={typed}
                placeholder="Type here or use on-screen keys below…"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                onChange={onInputChange}
                onKeyDown={onInputKeyDown}
                onKeyUp={onInputKeyUp}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: 14,
                  border: "2px solid var(--indigo)",
                  fontSize: 16,
                  outline: "none",
                  boxShadow: "0 4px 14px rgba(91,97,236,0.10)",
                  fontFamily: "inherit",
                  boxSizing: "border-box"
                }}
              />
            </div>

            <div className="pad">
              {["qwertyuiop", "asdfghjkl", "zxcvbnm"].map((row) => (
                <div className="pad-row" key={row}>
                  {row.split("").map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      className={"key" + (wrongKey === ch ? " key-err" : "")}
                      aria-label={ch}
                      onPointerDown={(e) => { e.preventDefault(); handleKeyDown(ch); }}
                      onPointerUp={() => handleKeyUp(ch)}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              ))}
              <div className="pad-row">
                <button
                  type="button"
                  className="key space"
                  aria-label="space"
                  onPointerDown={(e) => { e.preventDefault(); handleKeyDown(" "); }}
                  onPointerUp={() => handleKeyUp(" ")}
                >
                  space
                </button>
                <button
                  type="button"
                  className="key"
                  style={{ flex: 3, maxWidth: 110, fontSize: 13, fontWeight: 600 }}
                  aria-label="delete"
                  onClick={handleBackspace}
                >
                  ⌫ delete
                </button>
              </div>
            </div>

            {typed.length > 0 && (
              <p className="muted small" style={{ margin: "4px 0 10px" }}>
                Keystrokes: {typing.current.presses.length} · Errors: {typing.current.errors}
              </p>
            )}

            <button
              type="button"
              className="btn"
              style={{ marginTop: 6 }}
              disabled={typed.length < 3}
              onClick={() => submitTyping()}
            >
              Finish typing
            </button>
          </>
        )}

        {st.key !== "typing" && count !== null && <div className={"count live"} aria-hidden="true">{count}</div>}
        <p className={"status" + (status.err ? " err" : "")} role="status" aria-live="polite">{status.text}</p>

        {st.key === "voice" && (
          <>
            <p className="voice-prompt">“{VOICE_PROMPT}”</p>
            {busy && (
              <div
                style={{
                  margin: "12px auto 16px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  padding: "10px 18px",
                  background: "var(--lav2)",
                  borderRadius: 14,
                  border: "1.5px solid var(--lav3)",
                  fontSize: 13,
                  color: "var(--ink)"
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: "#F4577B",
                    boxShadow: "0 0 10px #F4577B"
                  }}
                />
                <span>Listening…</span>
                <span style={{ color: "var(--indigo)", fontWeight: 600 }}>
                  {livePitch ? `Fundamental pitch: ${livePitch} Hz` : "Detecting vocal frequencies…"}
                </span>
              </div>
            )}
          </>
        )}

        {st.key === "motion" && busy && liveMotion && (
          <div
            style={{
              margin: "12px auto 16px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              padding: "10px 18px",
              background: "var(--lav2)",
              borderRadius: 14,
              border: "1.5px solid var(--lav3)",
              fontSize: 13,
              color: "var(--ink)"
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#5B61EC",
                boxShadow: "0 0 10px #5B61EC",
                animation: "pulse 1.2s infinite"
              }}
            />
            <span>Sensors recording ({liveMotion.source}):</span>
            <strong style={{ color: "var(--indigo)" }}>{liveMotion.count} samples captured</strong>
          </div>
        )}

        {st.key === "voice" && <button type="button" className="btn lg" disabled={busy} onClick={startVoice}>{status.err ? "Try again" : "Start recording"}</button>}
        {st.key === "motion" && <button type="button" className="btn lg" disabled={busy} onClick={startMotion}>{status.err ? "Try again" : "Start"}</button>}
        <button type="button" className="link-btn" disabled={busy} onClick={() => markUnavailable(st)}>
          Continue without this measurement
        </button>
      </section>
    </Shell>
  );
}
