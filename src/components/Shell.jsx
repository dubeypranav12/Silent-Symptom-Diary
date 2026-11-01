import { NavLink, Link } from "react-router-dom";
import { FiHome, FiMic, FiActivity, FiSettings, FiLogOut, FiGrid, FiGlobe, FiBell, FiPlus, FiShield } from "react-icons/fi";
import { LuBrain } from "react-icons/lu";
import { Ring } from "./Charts.jsx";
import { EmptyArt } from "./Illustrations.jsx";

const PATIENT_NAV = [
  { to: "/home", icon: FiHome, label: "Home" },
  { to: "/checkin", icon: FiMic, label: "Check-in" },
  { to: "/trends", icon: FiActivity, label: "Trends" },
  { to: "/settings", icon: FiSettings, label: "Settings" }
];
const DOCTOR_NAV = [
  { to: "/doctor", icon: FiGrid, label: "Dashboard" },
  { to: "/", icon: FiGlobe, label: "Website" }
];
const ADMIN_NAV = [
  { to: "/admin", icon: FiShield, label: "Doctor review" },
  { to: "/", icon: FiGlobe, label: "Website" }
];

/* Rounded indigo sidebar + content area. `right` is the optional right-hand panel. */
export function Shell({ role = "patient", right, children }) {
  const nav = role === "doctor" ? DOCTOR_NAV : role === "admin" ? ADMIN_NAV : PATIENT_NAV;
  return (
    <div className="window">
      <nav className="sidebar" aria-label="Main">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink key={to + label} to={to} end={to === "/"} className={({ isActive }) => "sb-link" + (isActive ? " active" : "")} aria-label={label} title={label}>
            <Icon />
          </NavLink>
        ))}
        <Link to="/" className="sb-link sb-end" aria-label="Back to website" title="Back to website"><FiLogOut /></Link>
      </nav>
      <div className={"layout" + (right ? "" : " no-right")}>
        <main className="main">
          <Link to="/" className="app-brand"><i aria-hidden="true"><LuBrain /></i><span>Silent Symptom Diary</span></Link>
          {children}
        </main>
        {right}
      </div>
    </div>
  );
}

export function PageHead({ title, date, children }) {
  return (
    <header className="page-head">
      <div><h1>{title}</h1>{date && <p className="date">{date}</p>}</div>
      <div className="pill-row no-print">{children}</div>
    </header>
  );
}

/* Big indigo welcome card with an illustration on the left and an optional ring on the right. */
export function Banner({ art, title, text, ring, children }) {
  return (
    <section className="banner">
      <div className="banner-art">{art}</div>
      <div className="banner-text">
        <h1>{title}</h1>
        {text && <p>{text}</p>}
        {children}
      </div>
      {ring && (
        <div className="banner-ring" role="img" aria-label={`${ring.value} of ${ring.max} ${ring.label}`}>
          <Ring value={ring.value} max={ring.max} />
          <div><b>{ring.value}</b><small>{ring.label}</small></div>
        </div>
      )}
    </section>
  );
}

export function StatCard({ icon: Icon, color, label, value }) {
  return (
    <div className="stat">
      <span className="stat-ic" style={{ background: color }}><Icon /></span>
      <small>{label}</small>
      <b>{value}</b>
    </div>
  );
}

export function AddCard({ to, label, onClick }) {
  const inner = (<><FiPlus /><span>{label}</span></>);
  return to
    ? <Link className="stat stat-add" to={to}>{inner}</Link>
    : <button type="button" className="stat stat-add" onClick={onClick}>{inner}</button>;
}

/* Right-hand panel: profile, a list, and the indigo chart card. */
export function RightPanel({ avatar, name, sub, listTitle, listLink, items, chart }) {
  const dots = [["8%", "30%", "#F4577B"], ["86%", "18%", "#1FB5CC"], ["94%", "58%", "#FF9F43"], ["4%", "68%", "#5B61EC"], ["72%", "4%", "#5B61EC"]];
  return (
    <aside className="right">
      <div className="panel">
        <div className="panel-head"><h3>My profile</h3><span className="bell" aria-hidden="true"><FiBell /></span></div>
        <div className="profile">
          {dots.map((d, i) => <span key={i} className="confetti" style={{ left: d[0], top: d[1], background: d[2] }} />)}
          <div className="ring-avatar">
            <svg className="ring" viewBox="0 0 128 128" aria-hidden="true">
              <circle cx="64" cy="64" r="60" fill="none" stroke="#5B61EC" strokeWidth="3" strokeDasharray="300 80" strokeLinecap="round" transform="rotate(-70 64 64)" />
            </svg>
            {avatar}
          </div>
          <b>{name}</b>
          <span className="muted small">{sub}</span>
        </div>
        <div className="list-title"><span>{listTitle}</span>{listLink}</div>
        {items.length === 0 && <p className="muted small">Nothing to show yet.</p>}
        {items.map((it, i) => (
          <div className="row-item" key={i}>
            {it.lead}
            <div className="t"><b>{it.title}</b><small>{it.sub}</small></div>
            {it.tag}
          </div>
        ))}
      </div>
      {chart}
    </aside>
  );
}

export function ChartCard({ title, sub, children }) {
  return (
    <div className="chart-card">
      <h3>{title}</h3>
      {sub && <p className="sub">{sub}</p>}
      {children}
    </div>
  );
}

export function Empty({ text }) {
  return <div className="empty"><EmptyArt /><p>{text}</p></div>;
}
