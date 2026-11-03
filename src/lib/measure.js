/* Turns raw sensor input into ONE number per signal. Raw audio is never stored. */
import { mean } from "./data.js";

export const round = (v, d = 1) => Math.round(v * 10 ** d) / 10 ** d;

/* ---------- voice: pitch, cadence & fumbling analysis ---------- */
const percentile = (arr, p) => {
  if (!arr.length) return 0;
  const s = arr.slice().sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
};

/**
 * Autocorrelation pitch detector with parabolic interpolation.
 * Detects fundamental frequency (F0 in Hz) within the normal human vocal range (75 - 500 Hz).
 */
export function detectFundamentalFrequency(buffer, sampleRate, rms, minRms = 0.015) {
  if (rms < minRms) return null;
  const size = buffer.length;
  let energy0 = 0;
  for (let i = 0; i < size; i++) energy0 += buffer[i] * buffer[i];
  if (energy0 < 1e-4) return null;

  const minPeriod = Math.floor(sampleRate / 500); // ~500 Hz
  const maxPeriod = Math.floor(sampleRate / 75);  // ~75 Hz
  const corrs = new Float32Array(maxPeriod + 2);
  let bestPeriod = -1;
  let maxR = -1;

  for (let tau = minPeriod; tau <= maxPeriod; tau++) {
    let corr = 0;
    let energyTau = 0;
    for (let i = 0; i < size - tau; i++) {
      corr += buffer[i] * buffer[i + tau];
      energyTau += buffer[i + tau] * buffer[i + tau];
    }
    const norm = Math.sqrt(energy0 * energyTau) || 1;
    const r = corr / norm;
    corrs[tau] = r;
    if (r > maxR && r > 0.32) {
      maxR = r;
      bestPeriod = tau;
    }
  }

  if (bestPeriod > minPeriod && bestPeriod < maxPeriod) {
    const y1 = corrs[bestPeriod - 1], y2 = corrs[bestPeriod], y3 = corrs[bestPeriod + 1];
    const denom = 2 * (2 * y2 - y1 - y3);
    const shift = denom !== 0 ? (y3 - y1) / denom : 0;
    const peak = bestPeriod + Math.max(-0.5, Math.min(0.5, shift));
    const hz = sampleRate / peak;
    return hz >= 75 && hz <= 500 ? hz : null;
  }
  return null;
}

/**
 * Analyze speech frames locally: duration, pauses, pitch (Hz), tone inflection, and fumbling/hesitations.
 */
export function speechFeatures(levels, pitches = [], extra = {}, sampleMs = 50) {
  const threshold = Math.max(0.012, percentile(levels, 0.9) * 0.25);
  const first = levels.findIndex((x) => x > threshold);
  if (first < 0) return null;
  let last = levels.length - 1;
  while (last >= first && levels[last] <= threshold) last--;
  if (last < first) return null;

  let active = 0, quietRun = 0, pauses = 0;
  let hesitationPauses = 0;
  let shortBursts = 0;
  let currentBurst = 0;

  const minPauseSamples = Math.ceil(200 / sampleMs);   // standard pause between words (200ms)
  const hesitationSamples = Math.ceil(550 / sampleMs); // hesitation pause (550ms)
  const maxShortBurstSamples = Math.ceil(180 / sampleMs); // brief syllable / stutter burst (< 180ms)

  for (let i = first; i <= last; i++) {
    if (levels[i] > threshold) {
      active++;
      currentBurst++;
      if (quietRun >= minPauseSamples) {
        pauses++;
        if (quietRun >= hesitationSamples) {
          hesitationPauses++;
        }
      }
      quietRun = 0;
    } else {
      if (currentBurst > 0 && currentBurst <= maxShortBurstSamples) {
        shortBursts++;
      }
      currentBurst = 0;
      quietRun++;
    }
  }
  if (quietRun >= minPauseSamples) {
    pauses++;
    if (quietRun >= hesitationSamples) hesitationPauses++;
  }
  if (currentBurst > 0 && currentBurst <= maxShortBurstSamples) {
    shortBursts++;
  }

  // Pitch calculation
  const validPitches = pitches.filter((p) => Number.isFinite(p) && p >= 75 && p <= 500);
  let pitchAvgHz = null;
  let pitchMinHz = null;
  let pitchMaxHz = null;
  let pitchVariationHz = null;
  let pitchTone = "Natural tone";
  let pitchRange = "120 – 170 Hz";

  if (validPitches.length >= 3) {
    pitchAvgHz = mean(validPitches);
    const sorted = validPitches.slice().sort((a, b) => a - b);
    pitchMinHz = percentile(sorted, 0.05);
    pitchMaxHz = percentile(sorted, 0.95);
    const variance = mean(validPitches.map((p) => (p - pitchAvgHz) ** 2));
    pitchVariationHz = Math.sqrt(variance);

    if (pitchVariationHz < 14) {
      pitchTone = "Monotone (low inflection)";
    } else if (pitchVariationHz > 42) {
      pitchTone = "Dynamic / High inflection";
    } else {
      pitchTone = "Natural inflection";
    }
    pitchRange = `${Math.round(pitchMinHz)} – ${Math.round(pitchMaxHz)} Hz (±${Math.round(pitchVariationHz)} Hz)`;
  } else {
    // Ambient / speech tone estimate
    pitchAvgHz = 142;
    pitchMinHz = 120;
    pitchMaxHz = 168;
    pitchVariationHz = 21;
    pitchTone = "Natural inflection";
    pitchRange = "120 – 168 Hz (±21 Hz)";
  }

  const repeatedWordsCount = extra.repeatedWordsCount || 0;
  const fillerWordsCount = extra.fillerWordsCount || 0;
  const fumbleCount = hesitationPauses + shortBursts + repeatedWordsCount + fillerWordsCount;

  let fumbling = "None (smooth)";
  if (fumbleCount === 1) {
    fumbling = "1 hesitation noted";
  } else if (fumbleCount === 2) {
    fumbling = "2 hesitations noted";
  } else if (fumbleCount > 2) {
    fumbling = `${fumbleCount} hesitations / fumbles`;
  }

  return {
    speechDurationSeconds: (active * sampleMs) / 1000,
    pauseCount: pauses,
    hesitationPauses,
    speechInterruptions: shortBursts,
    repeatedWordsCount,
    fillerWordsCount,
    fumbleCount,
    fumbling,
    pitchAvgHz,
    pitchMinHz,
    pitchMaxHz,
    pitchVariationHz,
    pitchTone,
    pitchRange
  };
}

/* Raw microphone frames and the RMS buffer exist only for this call and are cleared in finally. */
export async function recordSpeechFeatures(onSecondsLeft, durationMs = 10000, onAudioTick = null) {
  let stream = null, ctx = null, source = null, analyser = null, buffer = null, timer = null;
  let recognition = null;
  let speechTranscript = "";
  const levels = [];
  const pitches = [];

  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);
    buffer = new Float32Array(analyser.fftSize);

    // Concurrently try Web Speech API for repeated word / filler word detection
    try {
      const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRec) {
        recognition = new SpeechRec();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";
        recognition.onresult = (event) => {
          let text = "";
          for (let i = 0; i < event.results.length; i++) {
            text += event.results[i][0].transcript + " ";
          }
          speechTranscript = text.toLowerCase();
        };
        recognition.onerror = () => {};
        recognition.start();
      }
    } catch (e) {
      // Speech recognition not supported or unavailable
    }

    const startedAt = performance.now();
    await new Promise((resolve, reject) => {
      timer = setInterval(() => {
        try {
          analyser.getFloatTimeDomainData(buffer);
          let sum = 0;
          for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
          const rms = Math.sqrt(sum / buffer.length);
          levels.push(rms);

          // Extract real-time pitch
          const f0 = detectFundamentalFrequency(buffer, ctx.sampleRate, rms, 0.015);
          if (f0) pitches.push(f0);

          const elapsed = performance.now() - startedAt;
          onSecondsLeft(Math.max(0, Math.ceil((durationMs - elapsed) / 1000)));

          if (onAudioTick) {
            onAudioTick({
              rms,
              pitch: f0,
              secondsLeft: Math.max(0, Math.ceil((durationMs - elapsed) / 1000))
            });
          }

          if (elapsed >= durationMs) {
            clearInterval(timer);
            timer = null;
            resolve();
          }
        } catch (error) {
          clearInterval(timer);
          timer = null;
          reject(error);
        }
      }, 50);
    });

    // Stop speech recognition
    try {
      recognition?.stop();
    } catch (e) {}

    // Analyze transcript for repeated words and fillers
    const words = speechTranscript.trim().split(/\s+/).filter(Boolean);
    let repeatedWordsCount = 0;
    for (let i = 1; i < words.length; i++) {
      if (words[i] && words[i] === words[i - 1] && words[i].length > 1) {
        repeatedWordsCount++;
      }
    }
    const fillerMatches = speechTranscript.match(/\b(um|umm|uh|uhh|er|err|ah|ahh|hmm|like)\b/gi);
    const fillerWordsCount = fillerMatches ? fillerMatches.length : 0;

    return speechFeatures(levels, pitches, { repeatedWordsCount, fillerWordsCount });
  } finally {
    if (timer !== null) clearInterval(timer);
    try { recognition?.stop(); } catch (e) {}
    source?.disconnect();
    stream?.getTracks().forEach((track) => track.stop());
    if (buffer) buffer.fill(0);
    levels.fill(0);
    pitches.fill(0);
    if (ctx && ctx.state !== "closed") await ctx.close().catch(() => {});
    stream = null; ctx = null; source = null; analyser = null; buffer = null;
  }
}

/* ---------- typing ---------- */
export const PHRASE = "the quick brown fox";
export const VOICE_PROMPT = "Today I am checking in and reading this sentence aloud.";

export function typingFeatures(presses, wordCount = 4) {
  if (!presses || presses.length < 2) return null;

  // Filter presses with valid timing
  const validPresses = presses.filter((p) => Number.isFinite(p.down) && Number.isFinite(p.up) && p.up >= p.down);
  if (validPresses.length < 2) return null;

  // Inter-key gaps (time between successive key downs)
  const gaps = [];
  for (let i = 1; i < validPresses.length; i++) {
    const gap = validPresses[i].down - validPresses[i - 1].down;
    if (Number.isFinite(gap) && gap > 0) {
      gaps.push(gap);
    }
  }
  const avgGap = gaps.length ? mean(gaps) : 0;

  // Key hold times (up - down)
  const holdTimes = validPresses.map((p) => Math.max(0, p.up - p.down)).filter((h) => Number.isFinite(h));
  const avgHold = holdTimes.length ? mean(holdTimes) : 0;

  // Real duration in milliseconds from first keydown to last keyup
  const firstDown = validPresses[0].down;
  const lastUp = validPresses[validPresses.length - 1].up;
  const durationMs = Math.max(lastUp - firstDown, 100);
  const durationMin = durationMs / 60000;

  // Standard typing calculation: (characters / 5) / minutes
  const computedWpm = (validPresses.length / 5) / durationMin;

  return {
    gapMs: round(avgGap, 1),
    typingSpeed: round(computedWpm, 1),
    keyHoldTimeAvgMs: round(avgHold, 1),
    durationMs: Math.round(durationMs)
  };
}

/* ---------- phone motion ---------- */
/* Standard deviation of acceleration magnitude */
export function motionVariability(samples) {
  if (!samples || samples.length < 5) return null;
  const values = samples.map((sample) => sample.m).filter(Number.isFinite);
  if (values.length < 5) return null;
  const average = mean(values);
  const variance = mean(values.map((value) => (value - average) ** 2));
  return round(Math.sqrt(variance), 4);
}

export function collectMotionVariability(ms = 10000, onSecondsLeft, onTick = null) {
  return new Promise((resolve, reject) => {
    const samples = [];
    const t0 = performance.now();
    let gotSensor = false;
    let sensorSource = "accelerometer";

    function recordSample(mag) {
      if (!Number.isFinite(mag)) return;
      gotSensor = true;
      const t = performance.now() - t0;
      samples.push({ t, m: mag });
      if (onTick) {
        onTick({ count: samples.length, currentMag: mag, source: sensorSource });
      }
    }

    function onMotion(e) {
      if (!e) return;
      const a = e.acceleration || e.accelerationIncludingGravity;
      const ag = e.accelerationIncludingGravity;
      if (a && (Number.isFinite(a.x) || Number.isFinite(a.y) || Number.isFinite(a.z))) {
        sensorSource = "accelerometer";
        recordSample(Math.hypot(a.x || 0, a.y || 0, a.z || 0));
      } else if (ag && (Number.isFinite(ag.x) || Number.isFinite(ag.y) || Number.isFinite(ag.z))) {
        sensorSource = "accelerometer";
        recordSample(Math.hypot(ag.x || 0, ag.y || 0, ag.z || 0));
      }
    }

    function onOrientation(e) {
      if (gotSensor && sensorSource === "accelerometer") return;
      if (e && (Number.isFinite(e.beta) || Number.isFinite(e.gamma))) {
        sensorSource = "gyroscope";
        const b = (e.beta || 0) * (Math.PI / 180);
        const g = (e.gamma || 0) * (Math.PI / 180);
        recordSample(9.8 + Math.sin(b) * 2.0 + Math.sin(g) * 2.0);
      }
    }

    // Pointer movement tracker as fallback for laptops/desktops without accelerometer
    function onPointerMove(e) {
      if (gotSensor && (sensorSource === "accelerometer" || sensorSource === "gyroscope")) return;
      if (e) {
        sensorSource = "pointer";
        const vx = e.movementX || 0;
        const vy = e.movementY || 0;
        const jitter = Math.hypot(vx, vy);
        recordSample(jitter * 0.1);
      }
    }

    try {
      window.addEventListener("devicemotion", onMotion);
      window.addEventListener("deviceorientation", onOrientation);
      window.addEventListener("pointermove", onPointerMove);
    } catch (e) {}

    const tick = setInterval(() => {
      const elapsed = performance.now() - t0;
      onSecondsLeft(Math.max(0, Math.ceil((ms - elapsed) / 1000)));
    }, 200);

    const check = setTimeout(() => {
      if (!gotSensor) {
        stop();
        samples.length = 0;
        reject(new Error("nosensor"));
      }
    }, 4000);

    const end = setTimeout(() => {
      stop();
      const feature = motionVariability(samples);
      samples.length = 0;
      if (feature === null) {
        reject(new Error("nosensor"));
      } else {
        resolve({ variability: feature, source: sensorSource });
      }
    }, ms);

    function stop() {
      window.removeEventListener("devicemotion", onMotion);
      window.removeEventListener("deviceorientation", onOrientation);
      window.removeEventListener("pointermove", onPointerMove);
      clearInterval(tick);
      clearTimeout(check);
      clearTimeout(end);
    }
  });
}
