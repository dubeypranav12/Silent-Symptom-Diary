/* Data layer: storage, baseline maths, and clinical signal analysis. */

export const STORE = {
  checkins: "ssd_checkins",
  notes: "ssd_notes",
  context: "ssd_context",
  consent: "ssd_consent",
  doctorApplications: "ssd_doctor_applications"
};
export const CONTEXT_BASELINE_DAYS = 7;
const STRESS_LEVELS = ["low", "medium", "high"];

/* The three signals. For all three, a higher value means more change. */
export const METRICS = {
  tremor: { label: "Motion variability", from: "Phone motion", color: "#5B61EC", tint: "#E6E9FF" },
  speech: { label: "Speech", from: "Voice", color: "#1FB5CC", tint: "#D9F5FA" },
  typing: { label: "Typing", from: "Typing", color: "#FF9F43", tint: "#FFEBD6" }
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
  const base = { n: Math.min(list.length, BASELINE_DAYS), ready: false };
  METRIC_KEYS.forEach((k) => {
    const v = list.map((e) => e[k]).filter(Number.isFinite).slice(0, BASELINE_DAYS);
    const m = v.length ? mean(v) : null;
    base[k] = {
      n: v.length,
      ready: v.length >= BASELINE_DAYS,
      mean: m,
      sd: v.length ? Math.max(stdev(v), Math.abs(m) * 0.05) : null
    };
  });
  base.ready = METRIC_KEYS.every((k) => base[k].ready);
  return base;
}

/* Turns check-ins into z-scores, flags and a latest summary. */
export function analyse(list) {
  const base = getBaseline(list);
  const out = { base, dates: list.map((e) => e.date), z: {}, flagged: [], latest: null, count: list.length };
  METRIC_KEYS.forEach((k) => {
    out.z[k] = base[k].ready ? list.map((e) => Number.isFinite(e[k]) ? (e[k] - base[k].mean) / base[k].sd : null) : [];
    if (base[k].ready) {
      const recent = out.z[k].slice(-FLAG_WINDOW);
      if (recent.filter((z) => Number.isFinite(z) && z >= Z_LIMIT).length >= FLAG_NEEDED) out.flagged.push(k);
    }
  });
  if (list.length) {
    const last = list[list.length - 1];
    out.latest = { entry: last, change: {}, z: {} };
    if (base.ready) {
      METRIC_KEYS.forEach((k) => {
        if (base[k].ready && Number.isFinite(last[k])) {
          out.latest.z[k] = out.z[k][list.length - 1];
          out.latest.change[k] = base[k].mean === 0 ? null : (last[k] / base[k].mean - 1) * 100;
        } else {
          out.latest.z[k] = null;
          out.latest.change[k] = null;
        }
      });
    } else {
      METRIC_KEYS.forEach((k) => {
        out.latest.z[k] = base[k].ready && Number.isFinite(last[k]) ? out.z[k][list.length - 1] : null;
        out.latest.change[k] = base[k].ready && Number.isFinite(last[k]) && base[k].mean !== 0
          ? (last[k] / base[k].mean - 1) * 100 : null;
      });
    }
  }
  return out;
}

export function describeZ(z) {
  if (!Number.isFinite(z)) return { text: "Unavailable", tone: "info" };
  if (z >= Z_LIMIT) return { text: "Higher than usual", tone: "warn" };
  if (z <= -Z_LIMIT) return { text: "Lower than usual", tone: "warn" };
  return { text: "Within usual range", tone: "ok" };
}
export const fmtChange = (p) => Number.isFinite(p) ? (p >= 0 ? "+" : "\u2212") + Math.abs(Math.round(p)) + "%" : "—";

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
  return METRIC_KEYS.some((k) => Number.isFinite(a.z[k][i]) && a.z[k][i] >= Z_LIMIT) ? "warn" : "ok";
}

/* Genuine patient records from this device (if check-ins exist). */
export function allPatients() {
  const mine = getCheckins();
  if (mine.length) {
    return [{ id: "me", name: "You (this device)", list: mine, sample: false }];
  }
  return [];
}

/* ---------- Doctor registration and admin verification consent layer ---------- */
export function getDoctorApplications() {
  return read(STORE.doctorApplications, []).sort((a, b) => (b.submittedAt || "").localeCompare(a.submittedAt || ""));
}

export function recordDoctorRegistration(doctor) {
  if (!doctor || !doctor.email) return null;
  const all = read(STORE.doctorApplications, []);
  const existingIndex = all.findIndex((d) => d.email.toLowerCase() === doctor.email.toLowerCase());
  
  const record = {
    id: (existingIndex >= 0 && all[existingIndex].id) ? all[existingIndex].id : ("DOC-" + Math.random().toString(36).substring(2, 7).toUpperCase()),
    name: doctor.name || (doctor.email.split("@")[0]),
    email: doctor.email.trim(),
    clinic: doctor.clinic || "Primary Healthcare Centre",
    specialty: doctor.specialty || "Neurology & Movement Disorders",
    registration: doctor.registration || ("MED-REG-" + Math.floor(10000 + Math.random() * 90000)),
    jurisdiction: doctor.jurisdiction || "National Medical Registry",
    consentReached: true,
    consentAt: doctor.consentAt || new Date().toISOString(),
    submittedAt: doctor.submittedAt || (existingIndex >= 0 ? all[existingIndex].submittedAt : new Date().toISOString()),
    status: (existingIndex >= 0 && all[existingIndex].status) ? all[existingIndex].status : "pending"
  };

  if (existingIndex >= 0) {
    all[existingIndex] = { ...all[existingIndex], ...record };
  } else {
    all.unshift(record);
  }

  write(STORE.doctorApplications, all);
  try {
    window.dispatchEvent(new CustomEvent("doctor:registered", { detail: record }));
  } catch (e) {
    // browser env safety
  }
  return record;
}

export function updateDoctorApplicationStatus(id, status) {
  const all = read(STORE.doctorApplications, []);
  const updated = all.map((app) => app.id === id ? { ...app, status, reviewedAt: new Date().toISOString() } : app);
  write(STORE.doctorApplications, updated);
  try {
    window.dispatchEvent(new CustomEvent("doctor:statusChanged", { detail: { id, status } }));
  } catch (e) {
    // browser env safety
  }
  return updated;
}

