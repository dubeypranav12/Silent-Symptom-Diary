import { Z_LIMIT, prettyDate } from "../lib/data.js";

/* Big chart: lines show change from the person's own baseline, in standard deviations.
   The pale band is the "usual range" (-1.5 to +1.5). */
export function TrendChart({ series, dates, flagFrom, label, empty = "No data yet" }) {
  const W = 600, H = 240, L = 54, R = 14, T = 14, B = 30;
  const n = dates.length;
  if (!n || !series.length || !series[0].values.length) {
    return (
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={empty}>
        <text x={W / 2} y={H / 2} textAnchor="middle">{empty}</text>
      </svg>
    );
  }
  let top = 3;
  series.forEach((s) => s.values.forEach((v) => { if (v > top) top = v; }));
  const yMax = Math.min(8, Math.ceil(top + 0.5)), yMin = -3;
  const y = (v) => T + (H - T - B) * (1 - (Math.max(yMin, Math.min(yMax, v)) - yMin) / (yMax - yMin));
  const x = (i) => (n === 1 ? (L + W - R) / 2 : L + (i * (W - L - R)) / (n - 1));

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      <rect x={L} y={y(Z_LIMIT)} width={W - L - R} height={y(-Z_LIMIT) - y(Z_LIMIT)} rx="10" fill="#E6E9FF" />
      <line x1={L} x2={W - R} y1={y(0)} y2={y(0)} stroke="#9A9FF5" strokeDasharray="4 5" />
      <text x={L - 8} y={y(Z_LIMIT) - 6} textAnchor="end">Higher</text>
      <text x={L - 8} y={y(0) + 4} textAnchor="end">Usual</text>
      <text x={L - 8} y={y(-Z_LIMIT) + 14} textAnchor="end">Lower</text>
      {flagFrom !== undefined && flagFrom >= 0 && flagFrom < n && (
        <g>
          <line x1={x(flagFrom)} x2={x(flagFrom)} y1={T} y2={H - B} stroke="#F4577B" strokeWidth="2" strokeDasharray="5 4" />
          <text x={x(flagFrom) + 6} y={T + 10} fill="#C72D55" style={{ fill: "#C72D55" }}>Change starts</text>
        </g>
      )}
      {series.map((s) => (
        <g key={s.label}>
          <polyline fill="none" stroke={s.color} strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round"
            points={s.values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")} />
          <circle cx={x(s.values.length - 1)} cy={y(s.values[s.values.length - 1])} r="5.5" fill="#fff" stroke={s.color} strokeWidth="3" />
        </g>
      ))}
      <text x={x(0)} y={H - 8} textAnchor={n === 1 ? "middle" : "start"}>{prettyDate(dates[0])}</text>
      {n > 1 && <text x={x(n - 1)} y={H - 8} textAnchor="end">{prettyDate(dates[n - 1])}</text>}
    </svg>
  );
}

/* Smooth area chart for the indigo card in the right panel. */
export function MiniArea({ values, caption, big }) {
  const W = 280, H = 130, P = 14, n = values.length;
  const lo = Math.min(-1, ...values), hi = Math.max(3, ...values);
  const x = (i) => P + (i * (W - 2 * P)) / Math.max(1, n - 1);
  const y = (v) => 20 + (H - 52) * (1 - (v - lo) / (hi - lo));
  const pts = values.map((v, i) => [x(i), y(v)]);
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const mx = (pts[i - 1][0] + pts[i][0]) / 2;
    d += ` C${mx},${pts[i - 1][1]} ${mx},${pts[i][1]} ${pts[i][0]},${pts[i][1]}`;
  }
  const last = pts[pts.length - 1];
  const tipX = Math.min(W - 64, Math.max(4, last[0] - 30));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={caption}>
      <defs>
        <linearGradient id="miniFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".28" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${last[0]},${H - 22} L${pts[0][0]},${H - 22} Z`} fill="url(#miniFill)" />
      <path d={d} fill="none" stroke="#FF7A9C" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="6" fill="#fff" stroke="#FF7A9C" strokeWidth="3.5" />
      <rect x={tipX} y={Math.max(2, last[1] - 40)} width="60" height="30" rx="8" fill="#fff" opacity=".95" />
      <text x={tipX + 30} y={Math.max(2, last[1] - 40) + 13} textAnchor="middle" style={{ fill: "#2B2F6B", fontSize: 12, fontWeight: 600 }}>{big}</text>
      <text x={tipX + 30} y={Math.max(2, last[1] - 40) + 25} textAnchor="middle" style={{ fill: "#7377A6", fontSize: 9 }}>vs baseline</text>
    </svg>
  );
}

/* Progress ring used on banners. */
export function Ring({ value, max }) {
  const r = 40, c = 2 * Math.PI * r, f = Math.min(1, value / max);
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="9" />
      <circle cx="50" cy="50" r={r} fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round"
        strokeDasharray={`${c * f} ${c}`} transform="rotate(-90 50 50)" />
    </svg>
  );
}
