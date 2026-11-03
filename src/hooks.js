import { useEffect, useMemo, useState } from "react";
import { analyse, dateKey, getCheckins, getNotes, toggleNote, write, STORE } from "./lib/data.js";
import { getMeasurementHistory, isAuthenticated } from "./lib/api.js";

/* This device's check-ins plus the analysis (baseline, z-scores, flags). */
export function useCheckins() {
  const [list, setList] = useState(() => getCheckins());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) return;

    let mounted = true;
    async function syncMeasurements() {
      try {
        setLoading(true);
        const res = await getMeasurementHistory();
        if (mounted && res.success && Array.isArray(res.data) && res.data.length > 0) {
          const normalized = res.data.map((item) => {
            const date = item.date || (item.createdAt ? item.createdAt.slice(0, 10) : dateKey());
            return {
              date,
              tremor: item.tremor,
              speech: item.speech,
              typing: item.typing,
              source: item.source || { tremor: "sensor", speech: "mic", typing: "pad" },
              details: item.details || {},
              riskScore: item.riskScore,
              mlFlag: item.mlFlag,
              savedAt: item.savedAt || item.createdAt
            };
          });

          const mergedMap = new Map();
          getCheckins().forEach((entry) => mergedMap.set(entry.date, entry));
          normalized.forEach((serverEntry) => {
            const local = mergedMap.get(serverEntry.date);
            if (local) {
              mergedMap.set(serverEntry.date, {
                ...serverEntry,
                tremor: (Number.isFinite(serverEntry.tremor) && serverEntry.tremor > 0) ? serverEntry.tremor : local.tremor,
                typing: (Number.isFinite(serverEntry.typing) && serverEntry.typing > 0) ? serverEntry.typing : local.typing,
                speech: Number.isFinite(serverEntry.speech) ? serverEntry.speech : local.speech,
                details: {
                  ...(local.details || {}),
                  ...(serverEntry.details || {}),
                  typing_speed: (serverEntry.details?.typing_speed > 0) ? serverEntry.details.typing_speed : (local.details?.typing_speed ?? null),
                  motion_variability: (serverEntry.details?.motion_variability > 0) ? serverEntry.details.motion_variability : (local.details?.motion_variability ?? null)
                }
              });
            } else {
              mergedMap.set(serverEntry.date, serverEntry);
            }
          });

          const mergedList = Array.from(mergedMap.values()).sort((a, b) => a.date.localeCompare(b.date));
          write(STORE.checkins, mergedList);
          setList(mergedList);
        }
      } catch (err) {
        console.warn("Could not sync check-ins from backend:", err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    syncMeasurements();
    return () => { mounted = false; };
  }, []);

  const analysis = useMemo(() => analyse(list), [list]);
  return { list, analysis, loading, refresh: () => setList(getCheckins()) };
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
