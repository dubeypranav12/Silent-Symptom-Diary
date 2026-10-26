/* Hand-drawn flat illustrations (SVG, no image files).
   People are built from one reusable bust so the doctor, patient and avatars match. */

const SKINS = ["#F7D3BA", "#EBB68F", "#C98F6A", "#8E5B3D"];
const HAIRS = ["#2B2140", "#5B3A29", "#1F2A44", "#B5733A"];
const SHIRTS = ["#5B61EC", "#1FB5CC", "#F4577B", "#4A8BF6", "#FF9F43"];
const BGS = ["#DDE0FF", "#CFF3F8", "#FFD9E2", "#D7E7FF", "#FFE6C7"];
const STYLES = ["long", "short", "bun"];

const hash = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

/* The bust itself, drawn in a 120 x 140 box. */
export function PersonBody({ skin = "#F7D3BA", hair = "#2B2140", style = "long", coat = "#fff", shirt = "#5B61EC", glasses = false, stethoscope = false }) {
  return (
    <g>
      {style === "long" && <path d="M30 60C28 28 46 16 60 16s32 12 30 44l4 42c-10-2-16-8-18-14H44c-2 6-8 12-18 14z" fill={hair} />}
      {style === "bun" && <circle cx="60" cy="15" r="11" fill={hair} />}
      <path d="M8 140c0-34 24-46 52-46s52 12 52 46z" fill={coat} />
      <path d="M44 95l16 24 16-24z" fill={shirt} />
      <path d="M44 95L36 140M76 95l8 45" stroke="#000" strokeOpacity=".08" strokeWidth="2" />
      <rect x="52" y="76" width="16" height="22" rx="7" fill={skin} />
      <ellipse cx="60" cy="54" rx="24" ry="27" fill={skin} />
      <circle cx="36.5" cy="57" r="4" fill={skin} /><circle cx="83.5" cy="57" r="4" fill={skin} />
      <path d="M35 54C33 30 48 22 62 22c14 0 25 9 23 32-6-9-16-14-27-16-8 7-14 12-23 16z" fill={hair} />
      <circle cx="51" cy="58" r="2.8" fill="#2B2140" /><circle cx="69" cy="58" r="2.8" fill="#2B2140" />
      <circle cx="45" cy="67" r="4" fill="#F4577B" opacity=".28" /><circle cx="75" cy="67" r="4" fill="#F4577B" opacity=".28" />
      <path d="M53 67q7 7 14 0" stroke="#2B2140" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      {glasses && (
        <g stroke="#2B2140" strokeWidth="1.8" fill="none">
          <circle cx="51" cy="58" r="8.5" /><circle cx="69" cy="58" r="8.5" /><path d="M59.5 57h1" />
        </g>
      )}
      {stethoscope && (
        <g>
          <path d="M45 96c-8 22 8 34 22 30" stroke="#2B2F6B" strokeWidth="3" fill="none" strokeLinecap="round" />
          <circle cx="68" cy="126" r="4.5" fill="#B8BCE0" stroke="#2B2F6B" strokeWidth="2" />
        </g>
      )}
    </g>
  );
}

export function Person(props) {
  return (
    <svg viewBox="0 0 120 140" aria-hidden="true" focusable="false">
      <PersonBody {...props} />
    </svg>
  );
}

/* Round avatar. The same seed always gives the same face. */
export function Avatar({ seed = "x", size = 44 }) {
  const h = hash(seed);
  return (
    <span className="avatar" style={{ width: size, height: size, background: BGS[(h >> 8) % BGS.length] }}>
      <Person skin={SKINS[h % 4]} hair={HAIRS[(h >> 2) % 4]} style={STYLES[(h >> 4) % 3]} shirt={SHIRTS[(h >> 6) % 5]} coat={SHIRTS[(h >> 3) % 5]} />
    </span>
  );
}

export function DoctorAvatar({ size = 96 }) {
  return (
    <span className="avatar" style={{ width: size, height: size, background: "#DDE0FF" }}>
      <Person hair="#3A2A32" glasses stethoscope />
    </span>
  );
}

/* ---------- Banner characters ---------- */
export function DoctorArt() {
  return (
    <svg viewBox="0 0 190 150" aria-hidden="true" focusable="false">
      <g transform="translate(20,8)"><PersonBody hair="#3A2A32" glasses stethoscope /></g>
      <path d="M112 106C132 98 146 80 150 58" stroke="#fff" strokeWidth="17" strokeLinecap="round" fill="none" />
      <circle cx="151" cy="50" r="9" fill="#F7D3BA" />
      <g transform="rotate(-8 24 112)">
        <rect x="6" y="92" width="34" height="44" rx="5" fill="#fff" stroke="#5B61EC" strokeWidth="3" />
        <rect x="16" y="88" width="14" height="8" rx="3" fill="#5B61EC" />
        <path d="M13 108h20M13 116h20M13 124h12" stroke="#C7CBFA" strokeWidth="3" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function PatientArt() {
  return (
    <svg viewBox="0 0 190 150" aria-hidden="true" focusable="false">
      <g transform="translate(20,8)"><PersonBody skin="#EBB68F" hair="#2B2140" style="short" coat="#1FB5CC" shirt="#fff" /></g>
      <path d="M108 112C118 116 124 118 128 122" stroke="#1FB5CC" strokeWidth="16" strokeLinecap="round" fill="none" />
      <g transform="rotate(12 128 100)">
        <rect x="112" y="76" width="30" height="50" rx="7" fill="#2B2F6B" />
        <rect x="116" y="82" width="22" height="34" rx="4" fill="#E6E9FF" />
        <path d="M119 102l4-6 4 8 4-5 4 3" stroke="#F4577B" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>
      <circle cx="127" cy="126" r="8" fill="#EBB68F" />
      <g transform="translate(150,30)"><circle r="15" fill="#fff" /><path d="M0 8c-10-6-10-13-4-14 3 0 4 2 4 3 0-1 1-3 4-3 6 1 6 8 0 14z" fill="#F4577B" /></g>
    </svg>
  );
}

export function CelebrateArt() {
  return (
    <svg viewBox="0 0 190 150" aria-hidden="true" focusable="false">
      <g transform="translate(22,8)"><PersonBody skin="#EBB68F" hair="#2B2140" style="bun" coat="#fff" shirt="#F4577B" /></g>
      <path d="M112 108C128 100 138 84 140 64" stroke="#fff" strokeWidth="16" strokeLinecap="round" fill="none" />
      <circle cx="141" cy="56" r="8.5" fill="#EBB68F" />
      <circle cx="30" cy="40" r="5" fill="#FFD166" /><circle cx="170" cy="30" r="4" fill="#1FB5CC" /><circle cx="160" cy="100" r="5" fill="#F4577B" />
      <path d="M20 90l8 6-8 6z" fill="#fff" opacity=".8" /><path d="M172 70l7 5-7 5z" fill="#FFD166" />
    </svg>
  );
}

/* ---------- Check-in step art ---------- */
const sparkle = (x, y, c) => <circle cx={x} cy={y} r="4" fill={c} />;

export function VoiceArt() {
  return (
    <svg viewBox="0 0 260 190" aria-hidden="true" focusable="false">
      <circle cx="130" cy="96" r="82" fill="#E6E9FF" />
      <g stroke="#9A9FF5" strokeWidth="6" strokeLinecap="round" fill="none">
        <path d="M70 74c-12 14-12 36 0 50" /><path d="M52 62c-20 22-20 56 0 78" />
        <path d="M190 74c12 14 12 36 0 50" /><path d="M208 62c20 22 20 56 0 78" />
      </g>
      <rect x="106" y="34" width="48" height="84" rx="24" fill="#5B61EC" />
      <path d="M118 56h24M118 70h24M118 84h24" stroke="#fff" strokeOpacity=".45" strokeWidth="4" strokeLinecap="round" />
      <path d="M90 96c0 26 17 40 40 40s40-14 40-40" stroke="#2B2F6B" strokeWidth="7" fill="none" strokeLinecap="round" />
      <path d="M130 136v22M108 160h44" stroke="#2B2F6B" strokeWidth="7" strokeLinecap="round" />
      {sparkle(40, 30, "#F4577B")}{sparkle(224, 40, "#1FB5CC")}{sparkle(232, 150, "#FF9F43")}{sparkle(28, 150, "#5B61EC")}
    </svg>
  );
}

export function TypingArt() {
  const keys = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 9; c++) keys.push(<rect key={r + "-" + c} x={56 + c * 17.5} y={132 + r * 11} width="13" height="8" rx="2.5" fill={r === 1 && c === 4 ? "#F4577B" : "#C7CBFA"} />);
  return (
    <svg viewBox="0 0 260 190" aria-hidden="true" focusable="false">
      <circle cx="130" cy="96" r="82" fill="#E6E9FF" />
      <rect x="64" y="34" width="132" height="82" rx="10" fill="#2B2F6B" />
      <rect x="72" y="42" width="116" height="66" rx="6" fill="#F0F2FF" />
      <path d="M82 56h72M82 70h96M82 84h58" stroke="#5B61EC" strokeWidth="6" strokeLinecap="round" />
      <rect x="146" y="78" width="4" height="14" rx="2" fill="#F4577B" />
      <rect x="44" y="120" width="172" height="48" rx="12" fill="#5B61EC" />
      {keys}
      <g transform="rotate(-12 38 60)"><rect x="22" y="44" width="30" height="30" rx="8" fill="#fff" stroke="#1FB5CC" strokeWidth="3" /><text x="37" y="66" textAnchor="middle" fontSize="18" fontWeight="700" fill="#1FB5CC" fontFamily="Poppins,sans-serif">T</text></g>
      <g transform="rotate(10 226 52)"><rect x="210" y="36" width="30" height="30" rx="8" fill="#fff" stroke="#FF9F43" strokeWidth="3" /><text x="225" y="58" textAnchor="middle" fontSize="18" fontWeight="700" fill="#FF9F43" fontFamily="Poppins,sans-serif">F</text></g>
    </svg>
  );
}

export function MotionArt() {
  return (
    <svg viewBox="0 0 260 190" aria-hidden="true" focusable="false">
      <circle cx="130" cy="96" r="82" fill="#E6E9FF" />
      <g stroke="#9A9FF5" strokeWidth="6" strokeLinecap="round" fill="none">
        <path d="M84 52c-10 14-10 40 0 54" /><path d="M64 44c-16 20-16 56 0 76" />
        <path d="M176 52c10 14 10 40 0 54" /><path d="M196 44c16 20 16 56 0 76" />
      </g>
      <rect x="98" y="24" width="64" height="116" rx="16" fill="#2B2F6B" />
      <rect x="105" y="36" width="50" height="92" rx="9" fill="#F0F2FF" />
      <path d="M110 84c8-18 14 18 22 0s14 18 20 0" stroke="#F4577B" strokeWidth="4" fill="none" strokeLinecap="round" />
      <rect x="116" y="46" width="22" height="6" rx="3" fill="#C7CBFA" />
      <ellipse cx="130" cy="148" rx="46" ry="14" fill="#EBB68F" />
      <circle cx="96" cy="136" r="9" fill="#EBB68F" />
      {sparkle(44, 36, "#1FB5CC")}{sparkle(220, 30, "#F4577B")}{sparkle(226, 150, "#FF9F43")}
    </svg>
  );
}

export function ShieldArt() {
  return (
    <svg viewBox="0 0 260 190" aria-hidden="true" focusable="false">
      <circle cx="130" cy="96" r="82" fill="#E6E9FF" />
      <path d="M130 30l56 20v40c0 38-24 62-56 74-32-12-56-36-56-74V50z" fill="#5B61EC" />
      <path d="M130 42l44 16v32c0 30-18 50-44 60V42z" fill="#fff" opacity=".12" />
      <path d="M106 96l17 18 32-36" stroke="#fff" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {sparkle(50, 50, "#F4577B")}{sparkle(212, 62, "#1FB5CC")}{sparkle(206, 152, "#FF9F43")}{sparkle(54, 140, "#5B61EC")}
    </svg>
  );
}

export function EmptyArt() {
  return (
    <svg viewBox="0 0 200 150" aria-hidden="true" focusable="false">
      <circle cx="100" cy="78" r="62" fill="#E6E9FF" />
      <rect x="62" y="30" width="76" height="92" rx="12" fill="#fff" stroke="#5B61EC" strokeWidth="4" />
      <rect x="86" y="22" width="28" height="14" rx="6" fill="#5B61EC" />
      <path d="M74 96c8-16 14 8 22-6s14 6 20-10 8-8 10-14" stroke="#F4577B" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M74 58h40M74 70h28" stroke="#C7CBFA" strokeWidth="5" strokeLinecap="round" />
      {sparkle(30, 40, "#1FB5CC")}{sparkle(172, 110, "#FF9F43")}
    </svg>
  );
}
