/* Turns raw sensor input into ONE number per signal. Raw audio is never stored. */
import { mean } from "./data.js";

export const round = (v, d = 1) => Math.round(v * 10 ** d) / 10 ** d;

/* ---------- voice ---------- */
const percentile = (arr, p) => {
  const s = arr.slice().sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
};

/* Loudness every 50 ms for 5 seconds. Only loudness numbers are kept. */
export async function recordLevels(onSecondsLeft) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  ctx.createMediaStreamSource(stream).connect(analyser);
  const buf = new Float32Array(analyser.fftSize), levels = [], t0 = performance.now();
  return new Promise((resolve) => {
    const timer = setInterval(() => {
      analyser.getFloatTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      levels.push(Math.sqrt(sum / buf.length));
      onSecondsLeft(Math.max(0, 5 - Math.floor((performance.now() - t0) / 1000)));
      if (performance.now() - t0 >= 5000) {
        clearInterval(timer);
        stream.getTracks().forEach((t) => t.stop());
        ctx.close();
        resolve(levels);
      }
    }, 50);
  });
}

/* Share of the sample that is silent once speaking starts, plus number of pauses. */
export function speechFeatures(levels) {
  const threshold = Math.max(0.01, percentile(levels, 0.9) * 0.25);
  const first = levels.findIndex((x) => x > threshold);
  if (first < 0) return null;
  const voiced = levels.slice(first);
  let quiet = 0, pauses = 0, inPause = false;
  voiced.forEach((x) => {
    if (x < threshold) { quiet++; if (!inPause) { pauses++; inPause = true; } }
    else inPause = false;
  });
  return { pauseRatio: (quiet / voiced.length) * 100, pauses };
}

/* ---------- typing ---------- */
export const PHRASE = "the quick brown fox";

export function typingFeatures(presses) {
  const gaps = presses.slice(1).map((p, i) => p.down - presses[i].down);
  return {
    gapMs: mean(gaps),
    holdMs: mean(presses.map((p) => p.up - p.down)),
    errors: presses.filter((p) => !p.ok).length
  };
}

/* ---------- phone motion ---------- */
/* Share of shaking energy between 3 and 12 Hz (the tremor range), as an index. */
export function tremorIndex(samples) {
  if (samples.length < 100) return null;
  const fs = 50, n = Math.floor((samples[samples.length - 1].t / 1000) * fs), x = [];
  let j = 0;
  for (let i = 0; i < n; i++) {                       // resample to an even 50 Hz
    const t = (i * 1000) / fs;
    while (j < samples.length - 2 && samples[j + 1].t < t) j++;
    const a = samples[j], b = samples[j + 1], f = (t - a.t) / (b.t - a.t || 1);
    x.push(a.m + (b.m - a.m) * f);
  }
  const m = mean(x), d = x.map((v) => v - m);
  let total = 0, band = 0;
  for (let f = 0.5; f <= 20; f += 0.25) {             // simple Fourier power per frequency
    let re = 0, im = 0;
    for (let i = 0; i < n; i++) {
      const ang = (2 * Math.PI * f * i) / fs;
      re += d[i] * Math.cos(ang);
      im -= d[i] * Math.sin(ang);
    }
    const p = re * re + im * im;
    total += p;
    if (f >= 3 && f <= 12) band += p;
  }
  return total ? (band / total) * 100 : null;
}

export function collectMotion(ms, onSecondsLeft) {
  return new Promise((resolve, reject) => {
    const samples = [], t0 = performance.now();
    let got = false;
    function onMotion(e) {
      const a = e.accelerationIncludingGravity || e.acceleration;
      if (!a || a.x == null) return;
      got = true;
      samples.push({ t: performance.now() - t0, m: Math.hypot(a.x, a.y, a.z) });
    }
    window.addEventListener("devicemotion", onMotion);
    const tick = setInterval(() => onSecondsLeft(Math.max(0, Math.ceil((ms - (performance.now() - t0)) / 1000))), 200);
    const check = setTimeout(() => { if (!got) { stop(); reject(new Error("nosensor")); } }, 2000);
    const end = setTimeout(() => { stop(); resolve(samples); }, ms);
    function stop() {
      window.removeEventListener("devicemotion", onMotion);
      clearInterval(tick); clearTimeout(check); clearTimeout(end);
    }
  });
}

/* A clearly marked stand-in value for computers without a mic or motion sensor. */
export const TYPICAL = { tremor: 12, speech: 22, typing: 320 };
export const sampleReading = (metric) => round(TYPICAL[metric] * (1 + (Math.random() - 0.5) * 0.12), 2);
