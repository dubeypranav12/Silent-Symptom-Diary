import { useState } from "react";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { FiLock, FiUsers, FiHeart, FiClock } from "react-icons/fi";
import { ShieldArt } from "../components/Illustrations.jsx";
import { giveConsent, hasConsent } from "../lib/data.js";
import { giveConsent as apiGiveConsent } from "../lib/api.js";

const ITEMS = [
  { Icon: FiLock, text: "Voice is analysed on my phone. Raw audio is never sent." },
  { Icon: FiUsers, text: "Only calculated numerical features are securely sent to your clinical care team; raw audio, typed words and motion samples are not." },
  { Icon: FiClock, text: "Sleep, stress and work-hour notes are stored for personal and clinician trends." },
  { Icon: FiHeart, text: "I understand this supports my doctor and is not a diagnosis." }
];

export default function Consent() {
  const nav = useNavigate();
  const [checked, setChecked] = useState(ITEMS.map(() => false));
  const [error, setError] = useState(false);
  if (hasConsent()) return <Navigate to="/home" replace />;

  async function submit(e) {
    e.preventDefault();
    const ok = checked.every(Boolean);
    setError(!ok);
    if (ok) {
      giveConsent();
      try {
        await apiGiveConsent(true);
      } catch (err) {
        console.warn("Backend consent sync skipped:", err.message);
      }
      nav("/home");
    }
  }

  return (
    <div className="window solo">
      <div className="consent-wrap">
        <Link to="/" className="brand">Silent Symptom Diary</Link>
        <div className="art"><ShieldArt /></div>
        <h1>Before we begin</h1>
        <p className="muted">Please read and agree. You can change this any time in Settings.</p>
        <form onSubmit={submit} noValidate>
          {ITEMS.map(({ Icon, text }, i) => (
            <label className="consent-item" key={i}>
              <input type="checkbox" checked={checked[i]} onChange={(e) => setChecked(checked.map((c, j) => (j === i ? e.target.checked : c)))} />
              <Icon aria-hidden="true" style={{ color: "#5B61EC", fontSize: 22, flex: "none" }} />
              <span>{text}</span>
            </label>
          ))}
          {error && <p className="status err" role="alert">Please tick all boxes to continue.</p>}
          <button className="btn lg block" type="submit">I agree and continue</button>
        </form>
        <p className="muted small">Your check-ins are securely saved and synced. You can manage your data in Settings.</p>
      </div>
    </div>
  );
}
