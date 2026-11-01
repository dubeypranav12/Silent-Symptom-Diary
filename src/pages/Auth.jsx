import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiLock, FiMail, FiUser } from "react-icons/fi";
import { LuBrain } from "react-icons/lu";

export default function AuthPage({ mode }) {
  const { role } = useParams();
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  if (role !== "patient" && role !== "doctor") return <Navigate to="/" replace />;

  const isRegister = mode === "register";
  const roleName = role === "doctor" ? "Doctor" : "Patient";
  const otherRole = role === "doctor" ? "patient" : "doctor";
  const destination = `/${isRegister ? "login" : "register"}/${role}`;

  function submit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (isRegister && formData.get("password") !== formData.get("confirmPassword")) {
      setMessage("Those passwords don’t match. Please check them and try again.");
      return;
    }
    setMessage("This is a design prototype. Account sign-in is not connected yet, and your details were not submitted.");
  }

  return (
    <div className="window solo auth-window">
      <div className="auth-layout">
        <header className="auth-topbar">
          <Link to="/" className="brand"><i><LuBrain /></i>Silent Symptom Diary</Link>
          <Link to="/" className="auth-back"><FiArrowLeft /> Back to website</Link>
        </header>

        <main className="auth-main">
          <section className="auth-card" aria-labelledby="auth-title">
            <span className="auth-eyebrow">{roleName} account</span>
            <h1 id="auth-title">{isRegister ? "Create your account" : `Welcome back, ${roleName.toLowerCase()}`}</h1>
            <p className="muted">{isRegister ? `Register as a ${roleName.toLowerCase()} to get started with Silent Symptom Diary.` : `Sign in to continue to your ${roleName.toLowerCase()} space.`}</p>

            <form className="auth-form" onSubmit={submit}>
              {isRegister && <label className="auth-field">
                <span>Full name</span>
                <span className="input-wrap"><FiUser aria-hidden="true" /><input name="name" autoComplete="name" placeholder={role === "doctor" ? "Dr. Alex Morgan" : "Your name"} required /></span>
              </label>}
              {isRegister && role === "doctor" && <label className="auth-field">
                <span>Clinic or organization <small>(optional)</small></span>
                <span className="input-wrap"><input name="clinic" autoComplete="organization" placeholder="Clinic name" /></span>
              </label>}
              <label className="auth-field">
                <span>{role === "doctor" ? "Work email" : "Email address"}</span>
                <span className="input-wrap"><FiMail aria-hidden="true" /><input name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></span>
              </label>
              <label className="auth-field">
                <span>Password</span>
                <span className="input-wrap"><FiLock aria-hidden="true" /><input name="password" type={showPassword ? "text" : "password"} autoComplete={isRegister ? "new-password" : "current-password"} placeholder={isRegister ? "Create a password" : "Enter your password"} minLength={8} required /></span>
              </label>
              {isRegister && <label className="auth-field">
                <span>Confirm password</span>
                <span className="input-wrap"><FiLock aria-hidden="true" /><input name="confirmPassword" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Enter it again" minLength={8} required /></span>
              </label>}
              <label className="show-password"><input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} /> Show password</label>
              <button type="submit" className="btn lg block">{isRegister ? `Create ${roleName.toLowerCase()} account` : `Sign in as ${roleName.toLowerCase()}`}</button>
            </form>

            <p className="auth-switch">{isRegister ? "Already registered?" : "New to Silent Symptom Diary?"} <Link to={destination}>{isRegister ? "Sign in" : "Create an account"}</Link></p>
            <p className="auth-prototype" role="status" aria-live="polite">{message || "Prototype preview: authentication is not connected yet."}</p>
          </section>

          <aside className="auth-aside">
            <span className="auth-aside-icon"><LuBrain /></span>
            <p className="auth-aside-kicker">A calmer way to keep track</p>
            <h2>Your health story, between visits.</h2>
            <p>Daily check-ins help people and clinicians follow changes over time.</p>
            <div className="auth-role-switch">
              <span>Looking for the {otherRole} portal?</span>
              <Link to={`/login/${otherRole}`}>Continue as {otherRole}</Link>
            </div>
            <p className="auth-aside-note">Supports clinical care. Does not diagnose or replace your clinician.</p>
          </aside>
        </main>
        <footer className="auth-footer">Silent Symptom Diary · A prototype concept, not a medical device.</footer>
      </div>
    </div>
  );
}
