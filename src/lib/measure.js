/* Turns raw sensor input into ONE number per signal. Raw audio is never stored. */
import { mean } from "./data.js";

export const round = (v, d = 1) => Math.round(v * 10 ** d) / 10 ** d;

/* ---------- voice ---------- */
const percentile = (arr, p) => {
  const s = arr.slice().sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
};

/* Analyze a fixed sample locally. Only numerical speech features leave this function. */
export function speechFeatures(levels, sampleMs = 50) {
  const threshold = Math.max(0.01, percentile(levels, 0.9) * 0.25);
  const first = levels.findIndex((x) => x > threshold);
  if (first < 0) return null;
  let last = levels.length - 1;
  while (last >= first && levels[last] <= threshold) last--;
  if (last < first) return null;
  let active = 0, quietRun = 0, pauses = 0;
  const minPauseSamples = Math.ceil(200 / sampleMs);
  for (let i = first; i <= last; i++) {
    if (levels[i] > threshold) {
      active++;
      if (quietRun >= minPauseSamples) pauses++;
      quietRun = 0;
    } else quietRun++;
  }
  if (quietRun >= minPauseSamples) pauses++;
  return {
    speechDurationSeconds: active * sampleMs / 1000,
    pauseCount: pauses
  };
}

/* Raw microphone frames and the RMS buffer exist only for this call and are cleared in finally. */
export async function recordSpeechFeatures(onSecondsLeft, durationMs = 10000) {
  let stream = null, ctx = null, source = null, analyser = null, buffer = null, timer = null;
  const levels = [];
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);
    buffer = new Float32Array(analyser.fftSize);
    const startedAt = performance.now();
    const samples = await new Promise((resolve, reject) => {
      timer = setInterval(() => {
        try {
          analyser.getFloatTimeDomainData(buffer);
          let sum = 0;
          for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
          levels.push(Math.sqrt(sum / buffer.length));
          const elapsed = performance.now() - startedAt;
          onSecondsLeft(Math.max(0, Math.ceil((durationMs - elapsed) / 1000)));
          if (elapsed >= durationMs) {
            clearInterval(timer);
            timer = null;
            resolve(levels);
          }
        } catch (error) {
          clearInterval(timer);
          timer = null;
          reject(error);
        }
      }, 50);
    });
    return speechFeatures(samples);
  } finally {
    if (timer !== null) clearInterval(timer);
    source?.disconnect();
    stream?.getTracks().forEach((track) => track.stop());
    if (buffer) buffer.fill(0);
    levels.fill(0);
    if (ctx && ctx.state !== "closed") await ctx.close().catch(() => {});
    stream = null; ctx = null; source = null; analyser = null; buffer = null;
  }
}

/* ---------- typing ---------- */
export const PHRASE = "the quick brown fox";
export const VOICE_PROMPT = "Today I am checking in and reading this sentence aloud.";

export function typingFeatures(presses, wordCount) {
  if (presses.length < 2) return null;
  const gaps = presses.slice(1).map((p, i) => p.down - presses[i].down);
  const durationMs = presses[presses.length - 1].up - presses[0].down;
  if (!Number.isFinite(durationMs) || durationMs <= 0 || gaps.some((gap) => !Number.isFinite(gap) || gap <= 0)) return null;
  return {
    gapMs: mean(gaps),
    typingSpeed: wordCount * 60000 / durationMs,
    keyHoldTimeAvgMs: mean(presses.map((p) => p.up - p.down))
  };
}

/* ---------- phone motion ---------- */
/* Standard deviation of acceleration magnitude; a prototype motion feature, not tremor amplitude. */
export function motionVariability(samples) {
  if (samples.length < 100) return null;
  const values = samples.map((sample) => sample.m);
  if (values.some((value) => !Number.isFinite(value))) return null;
  const average = mean(values);
  return Math.sqrt(mean(values.map((value) => (value - average) ** 2)));
}

export function collectMotionVariability(ms, onSecondsLeft) {
  return new Promise((resolve, reject) => {
    const samples = [], t0 = performance.now();
    let got = false;
    function onMotion(e) {
      const a = e.accelerationIncludingGravity || e.acceleration;
      if (!a || !Number.isFinite(a.x) || !Number.isFinite(a.y) || !Number.isFinite(a.z)) return;
      got = true;
      samples.push({ t: performance.now() - t0, m: Math.hypot(a.x, a.y, a.z) });
    }
    window.addEventListener("devicemotion", onMotion);
    const tick = setInterval(() => onSecondsLeft(Math.max(0, Math.ceil((ms - (performance.now() - t0)) / 1000))), 200);
    const check = setTimeout(() => { if (!got) { stop(); samples.length = 0; reject(new Error("nosensor")); } }, 2000);
    const end = setTimeout(() => {
      stop();
      const feature = motionVariability(samples);
      samples.length = 0;
      resolve(feature);
    }, ms);
    function stop() {
      window.removeEventListener("devicemotion", onMotion);
      clearInterval(tick); clearTimeout(check); clearTimeout(end);
    }
  });
}
