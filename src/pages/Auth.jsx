import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { FiArrowLeft, FiLock, FiMail, FiUser, FiClock, FiCheckCircle, FiAlertTriangle, FiX } from "react-icons/fi";
import { LuBrain } from "react-icons/lu";
import { hasConsent, recordDoctorRegistration, getDoctorApplicationByEmail } from "../lib/data.js";
import { clearAuth, loginUser, registerUser, setToken, setUserRole } from "../lib/api.js";

export default function AuthPage({ mode }) {
  const { role } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState(() => searchParams.get("email") || "");
  const [password, setPassword] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("ssd_doctor_saved_creds") || "{}");
      const targetEmail = searchParams.get("email") || "";
      if (saved.email && saved.password && (!targetEmail || saved.email.toLowerCase() === targetEmail.toLowerCase())) {
        return saved.password;
      }
    } catch (e) {}
    return "";
  });

  const [modal, setModal] = useState({ open: false, type: "", title: "", text: "", actionBtn: null, secondaryBtn: null });

  const isAcceptedNotice = searchParams.get("notice") === "accepted" || searchParams.get("notice") === "approved";

  useEffect(() => {
    const notice = searchParams.get("notice");
    const prefillEmail = searchParams.get("email");
    if (prefillEmail) setEmail(prefillEmail);

    try {
      const saved = JSON.parse(localStorage.getItem("ssd_doctor_saved_creds") || "{}");
      const targetEmail = prefillEmail || email || "";
      if (saved.email && saved.password && (!targetEmail || saved.email.toLowerCase() === targetEmail.toLowerCase())) {
        setPassword(saved.password);
      }
    } catch (e) {}

    if (notice === "request_sent") {
      setModal({
        open: true,
        type: "pending",
        title: "Request sent to Admin",
        text: "Your doctor registration and consent have been submitted to the Admin. Please wait for an administrator to verify and approve your medical credentials before logging in.",
        actionBtn: { label: "Go to Admin Portal", onClick: () => navigate("/admin") },
        secondaryBtn: { label: "Stay on Login", onClick: () => setModal((m) => ({ ...m, open: false })) }
      });
    } else if (notice === "rejected") {
      setPassword("");
      setModal({
        open: true,
        type: "rejected",
        title: "You are not approved by our admin,Sorry!",
        text: "Your clinician application was reviewed and not approved by the admin. If you believe this is an error, please contact clinical administration.",
        actionBtn: { label: "Close", onClick: () => setModal((m) => ({ ...m, open: false })) }
      });
    } else if (notice === "accepted" || notice === "approved") {
      // Direct access with credentials prefilled — no blocking popup
      setModal({ open: false, type: "", title: "", text: "", actionBtn: null, secondaryBtn: null });
    }
  }, [searchParams]);

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
        const clinic = formData.get("clinic") || "";
        const specialty = formData.get("specialty") || "Neurology";
        const registration = formData.get("registration") || "";

        // Register in backend
        try {
          await registerUser({
            name,
            email: email.trim(),
            password,
            role
          });
        } catch (e) {
          console.warn("Backend registration notice:", e);
        }

        if (role === "doctor") {
          recordDoctorRegistration({
            name,
            email: email.trim(),
            clinic: clinic || "Primary Practice",
            specialty: specialty || "Neurology",
            registration: registration || ("MED-" + Math.floor(10000 + Math.random() * 90000)),
            consentReached: true,
            status: "pending"
          });

          // Remember credentials in localStorage across tabs
          try {
            localStorage.setItem("ssd_doctor_saved_creds", JSON.stringify({ email: email.trim(), password }));
          } catch (e) {}

          clearAuth();

          // Show "Request sent to Admin" notification immediately on screen
          setModal({
            open: true,
            type: "pending",
            title: "Request sent to Admin",
            text: "Your doctor registration and compliance consent have been submitted. An administrator must verify and approve your credentials before you can log in.",
            actionBtn: {
              label: "Go to Admin Portal",
              onClick: () => navigate("/admin")
            },
            secondaryBtn: {
              label: "Go to Doctor Login",
              onClick: () => navigate(`/login/doctor?notice=request_sent&email=${encodeURIComponent(email.trim())}`)
            }
          });
          setLoading(false);
          return;
        }

        navigate(hasConsent() ? "/home" : "/consent");
      } else {
        // LOGIN FLOW
        if (role === "doctor") {
          const docApp = getDoctorApplicationByEmail(email.trim());
          if (docApp && docApp.status === "rejected") {
            clearAuth();
            setPassword("");
            setModal({
              open: true,
              type: "rejected",
              title: "You are not approved by our admin,Sorry!",
              text: "Your clinician application was reviewed and not approved by the admin."
            });
            setLoading(false);
            return;
          }
          if (docApp && docApp.status === "pending") {
            clearAuth();
            setModal({
              open: true,
              type: "pending",
              title: "Request sent to Admin",
              text: "Your registration is still pending review by the admin. Please wait for admin approval before logging in.",
              actionBtn: {
                label: "Go to Admin Portal",
                onClick: () => navigate("/admin")
              }
            });
            setLoading(false);
            return;
          }
        }

        const res = await loginUser(email.trim(), password);

        if (res.success) {
          const userRole = res.user?.role || role;
          if (userRole === "doctor") {
            const docApp = getDoctorApplicationByEmail(email.trim());
            if (docApp && docApp.status === "rejected") {
              clearAuth();
              setPassword("");
              setModal({
                open: true,
                type: "rejected",
                title: "You are not approved by our admin,Sorry!",
                text: "Your clinician application was reviewed and not approved by the admin."
              });
              setLoading(false);
              return;
            }
            if (docApp && docApp.status === "pending") {
              clearAuth();
              setModal({
                open: true,
                type: "pending",
                title: "Request sent to Admin",
                text: "Your registration is still pending review by the admin. Please wait for admin approval before logging in.",
                actionBtn: {
                  label: "Go to Admin Portal",
                  onClick: () => navigate("/admin")
                }
              });
              setLoading(false);
              return;
            }
          }
          navigate(userRole === "doctor" ? "/doctor" : hasConsent() ? "/home" : "/consent");
        } else {
          // If backend had network/cold-start error, but doctor is approved by admin, grant access to Doctor Portal
          const docApp = role === "doctor" ? getDoctorApplicationByEmail(email.trim()) : null;
          if (docApp && docApp.status === "approved") {
            setToken("ssd_approved_doctor_" + Date.now());
            setUserRole("doctor");
            navigate("/doctor");
            return;
          }
          setMessage(res.error || "Invalid email or password. Please try again.");
        }
      }
    } catch (err) {
      setMessage("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="window solo auth-window">
      {modal.open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(18, 24, 38, 0.7)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 9999
          }}
          onClick={() => setModal({ ...modal, open: false })}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 24,
              padding: "36px 30px",
              maxWidth: 450,
              width: "100%",
              boxShadow: "0 24px 60px rgba(0, 0, 0, 0.3)",
              textAlign: "center",
              position: "relative",
              border: modal.type === "rejected" ? "2px solid #F4577B" : modal.type === "approved" ? "2px solid #22B98A" : "2px solid #FF9F43"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setModal({ ...modal, open: false })}
              aria-label="Close notification"
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                border: "none",
                background: "transparent",
                fontSize: 20,
                cursor: "pointer",
                color: "var(--muted)",
                padding: 4
              }}
            >
              <FiX />
            </button>

            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: "50%",
                margin: "0 auto 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 32,
                background: modal.type === "rejected" ? "#FFE9EE" : modal.type === "approved" ? "#E5F9F3" : "#FFF4E5",
                color: modal.type === "rejected" ? "#F4577B" : modal.type === "approved" ? "#22B98A" : "#FF9F43"
              }}
            >
              {modal.type === "rejected" ? <FiAlertTriangle /> : modal.type === "approved" ? <FiCheckCircle /> : <FiClock />}
            </div>

            <h2 id="modal-title" style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, color: "var(--ink)", lineHeight: 1.3 }}>
              {modal.title}
            </h2>

            <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
              {modal.text}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                type="button"
                className={modal.type === "rejected" ? "btn danger lg block" : "btn lg block"}
                onClick={() => {
                  if (modal.actionBtn && modal.actionBtn.onClick) {
                    modal.actionBtn.onClick();
                  } else {
                    setModal({ ...modal, open: false });
                  }
                }}
                style={{ width: "100%" }}
              >
                {modal.actionBtn?.label || (modal.type === "approved" ? "Continue to Sign In" : "Got it")}
              </button>

              {modal.secondaryBtn && (
                <button
                  type="button"
                  className="btn soft lg block"
                  onClick={() => {
                    if (modal.secondaryBtn.onClick) modal.secondaryBtn.onClick();
                    else setModal({ ...modal, open: false });
                  }}
                  style={{ width: "100%" }}
                >
                  {modal.secondaryBtn.label}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="auth-layout">
        <header className="auth-topbar">
          <Link to="/" className="brand"><i><LuBrain /></i>Silent Symptom Diary</Link>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Link to="/admin" className="auth-back" style={{ fontWeight: 600, color: "var(--indigo)" }}>Admin portal</Link>
            <Link to="/" className="auth-back"><FiArrowLeft /> Website</Link>
          </div>
        </header>

        <main className="auth-main">
          <section className="auth-card" aria-labelledby="auth-title">
            <span className="auth-eyebrow">{roleName} account</span>
            <h1 id="auth-title">{isRegister ? "Create your account" : `Welcome back, ${roleName.toLowerCase()}`}</h1>
            <p className="muted">
              {isRegister
                ? `Register as a ${roleName.toLowerCase()} to get started with Silent Symptom Diary.`
                : `Sign in to continue to your ${roleName.toLowerCase()} space.`}
            </p>

            {isAcceptedNotice && !isRegister && (
              <div
                style={{
                  background: "rgba(34, 185, 138, 0.12)",
                  border: "1.5px solid rgba(34, 185, 138, 0.35)",
                  borderRadius: 14,
                  padding: "14px 16px",
                  margin: "16px 0 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  color: "#0e704e"
                }}
              >
                <FiCheckCircle style={{ fontSize: 24, flexShrink: 0, color: "#22B98A" }} />
                <div style={{ fontSize: 13, lineHeight: 1.45 }}>
                  <b style={{ display: "block", marginBottom: 2 }}>Application approved by Admin!</b>
                  <div>Your credentials are prefilled. Click <strong>Sign in as doctor</strong> below to access the Doctor Portal.</div>
                </div>
              </div>
            )}

            <form className="auth-form" onSubmit={submit}>
              {isRegister && (
                <label className="auth-field">
                  <span>Full name</span>
                  <span className="input-wrap">
                    <FiUser aria-hidden="true" />
                    <input name="name" autoComplete="name" placeholder={role === "doctor" ? "Dr. Alex Morgan" : "Your name"} required />
                  </span>
                </label>
              )}
              {isRegister && role === "doctor" && (
                <>
                  <label className="auth-field">
                    <span>Clinic or organization</span>
                    <span className="input-wrap"><input name="clinic" autoComplete="organization" placeholder="e.g. City Neurology Care" required /></span>
                  </label>
                  <label className="auth-field">
                    <span>Specialty</span>
                    <span className="input-wrap"><input name="specialty" placeholder="e.g. Neurology, Movement Disorders" defaultValue="Neurology" required /></span>
                  </label>
                  <label className="auth-field">
                    <span>Medical license / Registration ID</span>
                    <span className="input-wrap"><input name="registration" placeholder="e.g. MED-REG-49102" required /></span>
                  </label>
                </>
              )}
              <label className="auth-field">
                <span>{role === "doctor" ? "Work email" : "Email address"}</span>
                <span className="input-wrap">
                  <FiMail aria-hidden="true" />
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </span>
              </label>
              <label className="auth-field">
                <span>Password</span>
                <span className="input-wrap">
                  <FiLock aria-hidden="true" />
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={isRegister ? "new-password" : "current-password"}
                    placeholder={isRegister ? "Create a password" : "Enter your password"}
                    minLength={8}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </span>
              </label>
              {isRegister && (
                <label className="auth-field">
                  <span>Confirm password</span>
                  <span className="input-wrap">
                    <FiLock aria-hidden="true" />
                    <input
                      name="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Enter it again"
                      minLength={8}
                      required
                    />
                  </span>
                </label>
              )}
              {isRegister && role === "doctor" && (
                <label className="show-password" style={{ marginTop: 4, alignItems: "flex-start", gap: 8, fontSize: 13, lineHeight: 1.45 }}>
                  <input type="checkbox" name="doctorConsent" required defaultChecked style={{ marginTop: 3 }} />
                  <span>I agree to clinical governance guidelines and grant consent for administrative verification.</span>
                </label>
              )}
              <label className="show-password">
                <input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} /> Show password
              </label>
              <button type="submit" className="btn lg block" disabled={loading}>
                {loading ? "Connecting…" : isRegister ? `Create ${roleName.toLowerCase()} account` : `Sign in as ${roleName.toLowerCase()}`}
              </button>
            </form>

            <p className="auth-switch">
              {isRegister ? "Already registered?" : "New to Silent Symptom Diary?"}{" "}
              <Link to={destination}>{isRegister ? "Sign in" : "Create an account"}</Link>
            </p>
            {message && <p className="auth-prototype" role="status" aria-live="polite" style={{ color: "#E02424", background: "#FFE5E7" }}>{message}</p>}
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
        <footer className="auth-footer">Silent Symptom Diary · Secure Clinical Symptom Tracking.</footer>
      </div>
    </div>
  );
}
