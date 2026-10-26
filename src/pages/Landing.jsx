import { useMemo } from "react";
import { Link } from "react-router-dom";
import { FiMic, FiSmartphone, FiHeart, FiCheck, FiArrowRight } from "react-icons/fi";
import { LuKeyboard, LuBrain } from "react-icons/lu";
import { DoctorArt, VoiceArt, TypingArt, MotionArt, ShieldArt } from "../components/Illustrations.jsx";
import { MiniArea } from "../components/Charts.jsx";
import { SAMPLE_PATIENTS, analyse, fmtChange, hasConsent, sampleList } from "../lib/data.js";

function HeroArt() {
  const a = useMemo(() => analyse(sampleList(SAMPLE_PATIENTS[0])), []);
  return (
    <div className="hero-art" aria-hidden="true">
      <div className="hero-blob" />
      <div className="hero-person"><DoctorArt /></div>
      <div className="hero-phone">
        <span className="chip info" style={{ justifySelf: "center" }}>Today's check-in</span>
        <div className="chart-card">
          <h3 style={{ fontSize: 13 }}>Tremor · sample</h3>
          <MiniArea values={a.z.tremor.slice(-14)} big={fmtChange(a.latest.change.tremor)} caption="Sample tremor trend" />
        </div>
        <div className="pill-screen">Sustained change noted</div>
      </div>
      <div className="float-chip" style={{ top: "10%", right: "0" }}><span className="lead-ic" style={{ background: "#1FB5CC" }}><FiMic /></span>Voice</div>
      <div className="float-chip" style={{ top: "30%", left: "0" }}><span className="lead-ic" style={{ background: "#FF9F43" }}><LuKeyboard /></span>Typing</div>
      <div className="float-chip" style={{ bottom: "12%", right: "2%" }}><span className="lead-ic" style={{ background: "#5B61EC" }}><FiSmartphone /></span>Motion</div>
    </div>
  );
}

export default function Landing() {
  const start = hasConsent() ? "/home" : "/consent";
  return (
    <div className="window solo">
      <div>
        <header className="l-nav">
          <Link to="/" className="brand"><i><LuBrain /></i>Silent Symptom Diary</Link>
          <nav className="l-links" aria-label="Main">
            <a href="#how">How it works</a>
            <a href="#privacy">Privacy</a>
            <Link className="btn soft" to="/doctor">For doctors</Link>
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
              <p className="muted small" style={{ marginTop: 18 }}>Supports clinicians. Never replaces them.</p>
            </div>
            <HeroArt />
          </section>

          <section className="l-section" id="what">
            <h2>Three signals, one daily habit</h2>
            <p className="muted">Each reading takes seconds and uses sensors already in the phone.</p>
            <div className="grid3">
              <article className="signal-card"><div className="art"><VoiceArt /></div><h3>Voice</h3><p className="muted small">A short “aaah” sample. Pauses and steadiness show speech changes.</p></article>
              <article className="signal-card"><div className="art"><TypingArt /></div><h3>Typing</h3><p className="muted small">Timing between key presses shows fatigue and brain fog.</p></article>
              <article className="signal-card"><div className="art"><MotionArt /></div><h3>Phone motion</h3><p className="muted small">Motion sensors while the phone is held steady show tremor.</p></article>
            </div>
          </section>

          <section className="l-section" id="how">
            <h2>How it works</h2>
            <ol className="grid3" style={{ listStyle: "none", padding: 0 }}>
              <li className="step-card"><span className="num">1</span><h3>Check in</h3><p className="muted small">Voice, typing and a steady hold. About 30 seconds a day.</p></li>
              <li className="step-card"><span className="num">2</span><h3>Compare with your own baseline</h3><p className="muted small">The first 7 days set what is normal for you. Only sustained changes are flagged, not one bad day.</p></li>
              <li className="step-card"><span className="num">3</span><h3>Doctor sees the trend</h3><p className="muted small">A clear chart between clinic visits, with optional notes on medicine and sleep.</p></li>
            </ol>
          </section>

          <section className="band" id="privacy">
            <div className="art"><ShieldArt /></div>
            <div className="txt">
              <h2>Private by design</h2>
              <ul className="ticks">
                <li><FiCheck />Voice is analysed on the phone. Raw audio is never stored or sent.</li>
                <li><FiCheck />Only numbers are shared with the doctor, and only after consent.</li>
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
