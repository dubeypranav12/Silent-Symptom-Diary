import { useMemo, useState } from "react";
import { analyse, dateKey, getCheckins, getNotes, toggleNote } from "./lib/data.js";

/* This device's check-ins plus the analysis (baseline, z-scores, flags). */
export function useCheckins() {
  const [version, setVersion] = useState(0);
  const list = useMemo(() => getCheckins(), [version]);
  const analysis = useMemo(() => analyse(list), [list]);
  return { list, analysis, refresh: () => setVersion((v) => v + 1) };
}

/* Today's quick notes (took medicine, slept well). */
export function useTodayNotes() {
  const [notes, setNotes] = useState(() => getNotes()[dateKey()] || {});
  const toggle = (name) => { const v = toggleNote(name); setNotes((n) => ({ ...n, [name]: v })); };
  return [notes, toggle];
}

export const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};
