import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiDownload, FiRefreshCw, FiTrash2, FiLogOut } from "react-icons/fi";
import { Shell, PageHead } from "../components/Shell.jsx";
import { STORE, clearAll, dateKey, getCheckins, getContextEntries, getNotes, makeSample, read, write } from "../lib/data.js";

export default function Settings() {
  const nav = useNavigate();
  const [msg, setMsg] = useState("");
  const consent = read(STORE.consent, {});

  function download() {
    const blob = new Blob([JSON.stringify({ checkins: getCheckins(), notes: getNotes(), dailyContext: getContextEntries() }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "silent-symptom-diary-" + dateKey() + ".json";
    a.click();
    URL.revokeObjectURL(a.href);
    setMsg("Download started.");
  }
  function loadSample() {
    if (!window.confirm("Replace your check-ins with 30 days of sample history?")) return;
    write(STORE.checkins, makeSample(99, 30, { tremor: { from: 20, slope: 0.03 } }));
    setMsg("Sample history loaded. Open Trends or the doctor dashboard to see it.");
  }
  function deleteData() {
    if (!window.confirm("Delete all check-ins and notes from this browser?")) return;
    localStorage.removeItem(STORE.checkins); localStorage.removeItem(STORE.notes); localStorage.removeItem(STORE.context);
    setMsg("All check-ins and notes deleted.");
  }
  function withdraw() {
    if (!window.confirm("Withdraw consent? Your data will also be deleted.")) return;
    clearAll();
    nav("/");
  }

  return (
    <Shell>
      <PageHead title="Settings" date={consent.at ? "Consent given on " + new Date(consent.at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : ""} />
      <div className="action-grid">
        <section className="action">
          <span className="stat-ic" style={{ background: "#1FB5CC", marginBottom: 0 }}><FiDownload /></span>
          <h2>Download my check-ins</h2>
          <p className="muted small">Saves your data as a file. Everything is stored in this browser only.</p>
          <button type="button" className="btn soft" onClick={download}>Download</button>
        </section>
        <section className="action">
          <span className="stat-ic" style={{ background: "#5B61EC", marginBottom: 0 }}><FiRefreshCw /></span>
          <h2>Load sample history</h2>
          <p className="muted small">30 days of marked sample data for demos. It replaces your current check-ins.</p>
          <button type="button" className="btn soft" onClick={loadSample}>Load sample</button>
        </section>
        <section className="action">
          <span className="stat-ic" style={{ background: "#F4577B", marginBottom: 0 }}><FiTrash2 /></span>
          <h2>Delete all my data</h2>
          <p className="muted small">Removes all check-ins and notes from this browser.</p>
          <button type="button" className="btn danger" onClick={deleteData}>Delete data</button>
        </section>
        <section className="action">
          <span className="stat-ic" style={{ background: "#FF9F43", marginBottom: 0 }}><FiLogOut /></span>
          <h2>Withdraw consent</h2>
          <p className="muted small">Deletes your data and returns you to the start.</p>
          <button type="button" className="btn danger" onClick={withdraw}>Withdraw</button>
        </section>
      </div>
      <p className="status" role="status" aria-live="polite">{msg}</p>
    </Shell>
  );
}
