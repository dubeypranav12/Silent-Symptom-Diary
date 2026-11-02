import { Link } from "react-router-dom";
import { FiMic, FiSmartphone, FiHeart, FiCheck, FiArrowRight } from "react-icons/fi";
import { LuKeyboard, LuBrain } from "react-icons/lu";
import { DoctorArt, VoiceArt, TypingArt, MotionArt, ShieldArt } from "../components/Illustrations.jsx";
import { MiniArea } from "../components/Charts.jsx";
import { hasConsent } from "../lib/data.js";

function HeroArt() {
  const trendValues = [0.1, 0.2, 0.15, 0.3, 0.25, 0.4, 0.5, 0.45, 0.6, 0.75, 0.9, 1.1, 1.3, 1.6];
  return (
    <div className="hero-art" aria-hidden="true">
      <div className="hero-blob" />
      <div className="hero-person"><DoctorArt /></div>
      <div className="hero-phone">
        <span className="chip info" style={{ justifySelf: "center" }}>Today's check-in</span>
        <div className="chart-card">
          <h3 style={{ fontSize: 13 }}>Motion variability · Clinical signal</h3>
          <MiniArea values={trendValues} big="+18%" caption="Motion variability trend" />
        </div>
        <div className="pill-screen">Sustained change noted</div>
      </div>
      <div className="float-chip" style={{ top: "10%", right: "0" }}><span className="lead-ic" style={{ background: "#1FB5CC" }}><FiMic /></span>Voice</div>
      <div className="float-chip" style={{ top: "30%", left: "0" }}><span className="lead-ic" style={{ background: "#FF9F43" }}><LuKeyboard /></span>Typing</div>
      <div className="float-chip" style={{ bottom: "12%", right: "2%" }}><span className="lead-ic" style={{ background: "#5B61EC" }}><FiSmartphone /></span>Motion</div>
    </div>
  );
}

function scrollToSection(event, id) {
  event.preventDefault();
  const section = document.getElementById(id);
  if (!section) return;
  section.focus({ preventScroll: true });
  section.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    block: "start"
  });
}

export default function Landing() {
  const start = hasConsent() ? "/home" : "/consent";
  return (
    <div className="window solo">
      <div>
        <header className="l-nav">
          <Link to="/" className="brand"><i><LuBrain /></i>Silent Symptom Diary</Link>
          <nav className="l-links" aria-label="Main">
            <a href="#how" onClick={(event) => scrollToSection(event, "how")}>How it works</a>
            <a href="#privacy" onClick={(event) => scrollToSection(event, "privacy")}>Privacy</a>
            <Link className="btn soft" to="/login/patient">Patient log in</Link>
            <Link className="btn soft" to="/login/doctor">Doctor log in</Link>
          </nav>
        </header>

        <main>
          <section className="hero">
            <div>
              <h1>Between visits, see what actually happened.</h1>
              <p className="lead">A 30-second daily check-in on the phone patients already own. Voice, typing and motion are compared with each person's own baseline, so doctors see trends instead of relying on memory.</p>
              <div className="row">
                <Link className="btn lg" to={start}>Start daily check-in <FiArrowRight /></Link>
                <Link className="btn lg soft" to="/doctor">View doctor dashboard</Link>
              </div>
              <p className="auth-shortcuts">New here? <Link to="/register/patient">Create a patient account</Link> <span aria-hidden="true">·</span> <Link to="/register/doctor">Register as a doctor</Link></p>
              <p className="muted small" style={{ marginTop: 18 }}>Supports clinicians. Never replaces them.</p>
            </div>
            <HeroArt />
          </section>

          <section className="l-section" id="what">
            <h2>Three signals, one daily habit</h2>
            <p className="muted">Each reading takes seconds and uses sensors already in the phone.</p>
            <div className="grid3">
              <article className="signal-card"><div className="art"><VoiceArt /></div><h3>Voice</h3><p className="muted small">Read a fixed sentence aloud. Speech duration and pause count are calculated on this device; no transcript is created.</p></article>
              <article className="signal-card"><div className="art"><TypingArt /></div><h3>Typing</h3><p className="muted small">We compare the timing between key presses. Key holds and typing errors are recorded as context.</p></article>
              <article className="signal-card"><div className="art"><MotionArt /></div><h3>Phone motion</h3><p className="muted small">A motion variability feature is calculated on this device. It is not a tremor amplitude measurement.</p></article>
            </div>
          </section>

          <section className="l-section" id="how" tabIndex={-1}>
            <h2>How it works</h2>
            <ol className="grid3" style={{ listStyle: "none", padding: 0 }}>
              <li className="step-card"><span className="num">1</span><h3>Check in</h3><p className="muted small">Voice, typing and a steady hold. About 30 seconds a day.</p></li>
              <li className="step-card"><span className="num">2</span><h3>Compare with your own baseline</h3><p className="muted small">The first 7 days set what is normal for you. Only sustained changes are flagged, not one bad day.</p></li>
              <li className="step-card"><span className="num">3</span><h3>Review your trend</h3><p className="muted small">See your measurements and optional notes in real time, securely synchronized with your clinical care team.</p></li>
            </ol>
          </section>

          <section className="band" id="privacy" tabIndex={-1}>
            <div className="art"><ShieldArt /></div>
            <div className="txt">
              <h2>Private by design</h2>
              <ul className="ticks">
                <li><FiCheck />Voice is analysed on the phone. Raw audio and transcripts are never stored or sent.</li>
                <li><FiCheck />Typed characters and raw motion samples are not retained. Only processed numerical features are securely synced with clinical records.</li>
                <li><FiCheck />The app tracks change. It does not diagnose, and a doctor makes every clinical decision.</li>
              </ul>
            </div>
            <Link className="btn white lg" to={start}><FiHeart /> Try the check-in</Link>
          </section>
        </main>

        <footer className="foot">The Ultimate Descenders · Ajay Kumar Garg Engineering College, Ghaziabad · A prototype concept, not a medical device.</footer>
      </div>
    </div>
  );
}
