/* Data layer: storage, baseline maths, flags and sample patients.
   Everything lives in this browser's localStorage. Nothing is uploaded. */

export const STORE = { checkins: "ssd_checkins", notes: "ssd_notes", context: "ssd_context", consent: "ssd_consent" };
export const CONTEXT_BASELINE_DAYS = 7;
const STRESS_LEVELS = ["low", "medium", "high"];

/* The three signals. For all three, a higher value means more change. */
export const METRICS = {
  tremor: { label: "Tremor", from: "Phone motion", color: "#5B61EC", tint: "#E6E9FF" },
  speech: { label: "Speech pauses", from: "Voice", color: "#1FB5CC", tint: "#D9F5FA" },
  typing: { label: "Typing rhythm", from: "Typing", color: "#FF9F43", tint: "#FFEBD6" }
};
export const METRIC_KEYS = Object.keys(METRICS);

export const BASELINE_DAYS = 7; // first 7 check-ins define "normal" for this person
export const Z_LIMIT = 1.5;     // distance from normal that counts as different
export const FLAG_WINDOW = 5;   // look at the last 5 check-ins...
export const FLAG_NEEDED = 3;   // ...flag only if 3 of them are above normal

/* ---------- storage helpers ---------- */
export function read(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key)); return v === null ? fallback : v; }
  catch (e) { return fallback; }
}
export function write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

export function dateKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}
export function prettyDate(key) {
  return new Date(key + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
export function getCheckins() {
  return read(STORE.checkins, []).sort((a, b) => a.date.localeCompare(b.date));
}
export function saveCheckin(entry) {
  const list = getCheckins().filter((e) => e.date !== entry.date); // one per day
  list.push(entry);
  write(STORE.checkins, list);
}
export function getNotes() { return read(STORE.notes, {}); }
export function getContextEntries() {
  return Object.values(read(STORE.context, {})).filter((entry) => entry && entry.date)
    .sort((a, b) => a.date.localeCompare(b.date));
}
export function saveContextEntry(date, entry) {
  const all = read(STORE.context, {});
  all[date] = { ...entry, date, savedAt: new Date().toISOString() };
  write(STORE.context, all);
}
export function getContextBaseline(entries = getContextEntries()) {
  const sample = entries.slice(0, CONTEXT_BASELINE_DAYS);
  const average = (key) => sample.length ? sample.reduce((total, item) => total + Number(item[key] || 0), 0) / sample.length : 0;
  const stressValues = sample.map((item) => STRESS_LEVELS.indexOf(item.stressLevel) + 1).sort((a, b) => a - b);
  const medianStress = stressValues.length ? stressValues[Math.floor(stressValues.length / 2)] : 0;
  return {
    n: sample.length,
    ready: sample.length >= CONTEXT_BASELINE_DAYS,
    throughDate: sample.length ? sample[sample.length - 1].date : null,
    sleepHours: average("sleepHours"),
    workHours: average("workHours"),
    stressLevel: medianStress ? STRESS_LEVELS[medianStress - 1] : null
  };
}
export function compareContextEntry(entry, baseline) {
  const stressValue = (level) => STRESS_LEVELS.indexOf(level);
  return {
    sleepHours: Number(entry.sleepHours) - baseline.sleepHours,
    workHours: Number(entry.workHours) - baseline.workHours,
    stress: stressValue(entry.stressLevel) - stressValue(baseline.stressLevel)
  };
}
export function toggleNote(name) {
  const all = getNotes(), today = dateKey();
  all[today] = all[today] || {};
  all[today][name] = !all[today][name];
  write(STORE.notes, all);
  return all[today][name];
}
export function hasConsent() { const c = read(STORE.consent, null); return !!(c && c.agreed); }
export function giveConsent() { write(STORE.consent, { agreed: true, at: new Date().toISOString() }); }
export function clearAll() { Object.values(STORE).forEach((k) => localStorage.removeItem(k)); }

/* ---------- maths ---------- */
export const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
export const stdev = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((x) => (x - m) ** 2))); };

/* Baseline = average and spread of the first 7 check-ins (the patient's own history). */
export function getBaseline(list) {
  const first = list.slice(0, BASELINE_DAYS);
  const base = { n: first.length, ready: first.length >= BASELINE_DAYS };
  if (first.length) {
    METRIC_KEYS.forEach((k) => {
      const v = first.map((e) => e[k]), m = mean(v);
      base[k] = { mean: m, sd: Math.max(stdev(v), Math.abs(m) * 0.05) }; // floor stops tiny spreads exploding
    });
  }
  return base;
}

/* Turns check-ins into z-scores, flags and a latest summary. */
export function analyse(list) {
  const base = getBaseline(list);
  const out = { base, dates: list.map((e) => e.date), z: {}, flagged: [], latest: null, count: list.length };
  METRIC_KEYS.forEach((k) => {
    out.z[k] = base.ready ? list.map((e) => (e[k] - base[k].mean) / base[k].sd) : [];
    if (base.ready) {
      const recent = out.z[k].slice(-FLAG_WINDOW);
      if (recent.filter((z) => z >= Z_LIMIT).length >= FLAG_NEEDED) out.flagged.push(k);
    }
  });
  if (list.length) {
    const last = list[list.length - 1];
    out.latest = { entry: last, change: {}, z: {} };
    if (base.ready) {
      METRIC_KEYS.forEach((k) => {
        out.latest.z[k] = out.z[k][list.length - 1];
        out.latest.change[k] = (last[k] / base[k].mean - 1) * 100;
      });
    }
  }
  return out;
}

export function describeZ(z) {
  if (z >= Z_LIMIT) return { text: "Higher than usual", tone: "warn" };
  if (z <= -Z_LIMIT) return { text: "Lower than usual", tone: "warn" };
  return { text: "Within usual range", tone: "ok" };
}
export const fmtChange = (p) => (p >= 0 ? "+" : "\u2212") + Math.abs(Math.round(p)) + "%";

/* Days in a row ending today (or yesterday, so the streak survives until you check in). */
export function streak(list) {
  const days = new Set(list.map((e) => e.date));
  const d = new Date();
  if (!days.has(dateKey(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(dateKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

/* The last n calendar days, oldest first. */
export function lastDays(n = 7) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); out.push(d); }
  return out;
}

/* Status of one calendar day for the week views: none | learn | ok | warn */
export function dayStatus(list, a, key) {
  const i = list.findIndex((e) => e.date === key);
  if (i < 0) return "none";
  if (!a.base.ready) return "learn";
  return METRIC_KEYS.some((k) => a.z[k][i] >= Z_LIMIT) ? "warn" : "ok";
}

/* ---------- sample patients (always labelled as sample in the UI) ---------- */
function seeded(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function makeSample(seed, days, drift) {
  const rand = seeded(seed), typical = { tremor: 12, speech: 22, typing: 320 }, out = [], today = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(today); d.setDate(today.getDate() - (days - 1 - i));
    const e = { date: dateKey(d), source: "sample" };
    METRIC_KEYS.forEach((k) => {
      let v = typical[k] * (1 + (rand() - 0.5) * 0.12);
      const dr = drift && drift[k];
      if (dr && i >= dr.from) v *= 1 + dr.slope * (i - dr.from + 1);
      e[k] = Math.round(v * 100) / 100;
    });
    out.push(e);
  }
  return out;
}
export const SAMPLE_PATIENTS = [
  { id: "014", name: "Patient 014", seed: 14, days: 30, drift: { tremor: { from: 24, slope: 0.05 } } },
  { id: "021", name: "Patient 021", seed: 21, days: 30 },
  { id: "027", name: "Patient 027", seed: 27, days: 30, drift: { speech: { from: 23, slope: 0.04 } } },
  { id: "033", name: "Patient 033", seed: 33, days: 30 }
];
export const sampleList = (p) => makeSample(p.seed, p.days, p.drift);

/* Everyone the doctor can see: sample patients plus this device (if it has check-ins). */
export function allPatients() {
  const rows = SAMPLE_PATIENTS.map((p) => ({ id: p.id, name: p.name, list: sampleList(p), sample: true }));
  const mine = getCheckins();
  if (mine.length) rows.unshift({ id: "me", name: "You (this device)", list: mine, sample: false });
  return rows;
}
