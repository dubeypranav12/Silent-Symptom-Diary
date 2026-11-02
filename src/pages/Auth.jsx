import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiLock, FiMail, FiUser } from "react-icons/fi";
import { LuBrain } from "react-icons/lu";
import { hasConsent } from "../lib/data.js";
import { loginUser, registerUser } from "../lib/api.js";

const DEMO_ACCOUNTS = {
  patient: { email: "patient.demo@silentdiary.app", password: "PatientDemo123" },
  doctor: { email: "doctor.demo@silentdiary.app", password: "DoctorDemo123" }
};

export default function AuthPage({ mode }) {
  const { role } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  if (role !== "patient" && role !== "doctor") return <Navigate to="/" replace />;

  const isRegister = mode === "register";
  const roleName = role === "doctor" ? "Doctor" : "Patient";
  const otherRole = role === "doctor" ? "patient" : "doctor";
  const destination = `/${isRegister ? "login" : "register"}/${role}`;

  async function submit(event) {
    event.preventDefault();
    setMessage("");
    const formData = new FormData(event.currentTarget);

    if (isRegister && formData.get("password") !== formData.get("confirmPassword")) {
      setMessage("Those passwords don’t match. Please check them and try again.");
      return;
    }

    setLoading(true);

    try {
      if (isRegister) {
        const name = formData.get("name") || email.split("@")[0];
        const res = await registerUser({
          name,
          email: email.trim(),
          password,
          role
        });

        if (res.success) {
          navigate(role === "doctor" ? "/doctor" : hasConsent() ? "/home" : "/consent");
        } else {
          setMessage(res.error || "Registration failed. Please try again.");
        }
      } else {
        const res = await loginUser(email.trim(), password);

        if (res.success) {
          const userRole = res.user?.role || role;
          navigate(userRole === "doctor" ? "/doctor" : hasConsent() ? "/home" : "/consent");
        } else {
          // Fallback to local demo account if backend is asleep or demo credentials used
          const demo = DEMO_ACCOUNTS[role];
          if (email.trim().toLowerCase() === demo.email && password === demo.password) {
            navigate(role === "doctor" ? "/doctor" : hasConsent() ? "/home" : "/consent");
            return;
          }
          setMessage(res.error || "Login failed. Please check your credentials.");
        }
      }
    } catch (err) {
      setMessage("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function fillDemoCredentials() {
    setEmail(DEMO_ACCOUNTS[role].email);
    setPassword(DEMO_ACCOUNTS[role].password);
    setMessage("Demo credentials filled. Select the sign-in button to continue.");
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
                <span className="input-wrap"><FiMail aria-hidden="true" /><input name="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></span>
              </label>
              <label className="auth-field">
                <span>Password</span>
                <span className="input-wrap"><FiLock aria-hidden="true" /><input name="password" type={showPassword ? "text" : "password"} autoComplete={isRegister ? "new-password" : "current-password"} placeholder={isRegister ? "Create a password" : "Enter your password"} minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /></span>
              </label>
              {isRegister && <label className="auth-field">
                <span>Confirm password</span>
                <span className="input-wrap"><FiLock aria-hidden="true" /><input name="confirmPassword" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Enter it again" minLength={8} required /></span>
              </label>}
              <label className="show-password"><input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} /> Show password</label>
              <button type="submit" className="btn lg block" disabled={loading}>
                {loading ? "Connecting…" : isRegister ? `Create ${roleName.toLowerCase()} account` : `Sign in as ${roleName.toLowerCase()}`}
              </button>
            </form>

            {!isRegister && <section className="demo-login" aria-label={`${roleName} demo account`}>
              <div><b>{roleName} demo account</b><span>Use these sample credentials to preview the {roleName.toLowerCase()} experience.</span></div>
              <dl><dt>Email</dt><dd>{DEMO_ACCOUNTS[role].email}</dd><dt>Password</dt><dd>{DEMO_ACCOUNTS[role].password}</dd></dl>
              <button type="button" className="link-btn" onClick={fillDemoCredentials}>Fill demo credentials</button>
            </section>}

            <p className="auth-switch">{isRegister ? "Already registered?" : "New to Silent Symptom Diary?"} <Link to={destination}>{isRegister ? "Sign in" : "Create an account"}</Link></p>
            <p className="auth-prototype" role="status" aria-live="polite">{message || (isRegister ? "Prototype preview: registration is not connected yet." : "Demo sign-in works locally; there is no real account service connected.")}</p>
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
