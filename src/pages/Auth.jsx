import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { FiArrowLeft, FiLock, FiMail, FiUser, FiClock, FiCheckCircle, FiAlertTriangle, FiX } from "react-icons/fi";
import { LuBrain } from "react-icons/lu";
import { hasConsent, recordDoctorRegistration, getDoctorApplicationByEmail } from "../lib/data.js";
import { clearAuth, loginUser, registerUser } from "../lib/api.js";

export default function AuthPage({ mode }) {
  const { role } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState(() => searchParams.get("email") || "");
  const [password, setPassword] = useState("");

  const noticeParam = searchParams.get("notice");
  const [modal, setModal] = useState(() => {
    if (noticeParam === "request_sent") {
      return {
        open: true,
        type: "pending",
        title: "Request sent to Admin",
        text: "Your doctor registration and compliance consent have been submitted to the Admin. Please wait for an administrator to verify and approve your medical credentials before logging in."
      };
    }
    if (noticeParam === "rejected") {
      return {
        open: true,
        type: "rejected",
        title: "You are not approved by our admin,Sorry!",
        text: "Your clinician application was reviewed and not approved by the admin. If you believe this is an error, please contact clinical administration."
      };
    }
    if (noticeParam === "approved") {
      return {
        open: true,
        type: "approved",
        title: "Account Approved",
        text: "Your medical credentials have been verified by the Admin! Please enter your password to access the clinician portal."
      };
    }
    return { open: false, type: "", title: "", text: "" };
  });

  useEffect(() => {
    const notice = searchParams.get("notice");
    const prefillEmail = searchParams.get("email");
    if (prefillEmail) setEmail(prefillEmail);

    if (notice === "request_sent") {
      setModal({
        open: true,
        type: "pending",
        title: "Request sent to Admin",
        text: "Your doctor registration and compliance consent have been submitted to the Admin. Please wait for an administrator to verify and approve your medical credentials before logging in."
      });
    } else if (notice === "rejected") {
      setModal({
        open: true,
        type: "rejected",
        title: "You are not approved by our admin,Sorry!",
        text: "Your clinician application was reviewed and not approved by the admin. If you believe this is an error, please contact clinical administration."
      });
    } else if (notice === "approved") {
      setModal({
        open: true,
        type: "approved",
        title: "Account Approved",
        text: "Your medical credentials have been verified by the Admin! Please enter your password to access the clinician portal."
      });
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

        const res = await registerUser({
          name,
          email: email.trim(),
          password,
          role
        });

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

          // Prevent immediate login until approved by Admin
          clearAuth();

          // Redirect to login page with "Request sent to Admin" popup
          navigate(`/login/doctor?notice=request_sent&email=${encodeURIComponent(email.trim())}`);
          return;
        }

        if (res.success) {
          navigate(hasConsent() ? "/home" : "/consent");
        } else {
          setMessage(res.error || "Registration failed. Please try again.");
        }
      } else {
        // LOGIN FLOW
        if (role === "doctor") {
          const docApp = getDoctorApplicationByEmail(email.trim());
          if (docApp && docApp.status === "rejected") {
            clearAuth();
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
              text: "Your registration is still pending review by the admin. Please wait for admin approval before logging in."
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
                text: "Your registration is still pending review by the admin. Please wait for admin approval before logging in."
              });
              setLoading(false);
              return;
            }
          }
          navigate(userRole === "doctor" ? "/doctor" : hasConsent() ? "/home" : "/consent");
        } else {
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
            backgroundColor: "rgba(18, 24, 38, 0.65)",
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
              maxWidth: 440,
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

            <button
              type="button"
              className={modal.type === "rejected" ? "btn danger lg block" : "btn lg block"}
              onClick={() => setModal({ ...modal, open: false })}
              style={{ width: "100%" }}
            >
              {modal.type === "approved" ? "Continue to Sign In" : "Got it"}
            </button>
          </div>
        </div>
      )}

      <div className="auth-layout">
        <header className="auth-topbar">
          <Link to="/" className="brand"><i><LuBrain /></i>Silent Symptom Diary</Link>
          <Link to="/" className="auth-back"><FiArrowLeft /> Back to website</Link>
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
