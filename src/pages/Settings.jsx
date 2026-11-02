import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiDownload, FiTrash2, FiLogOut, FiShield } from "react-icons/fi";
import { Shell, PageHead } from "../components/Shell.jsx";
import { STORE, clearAll, dateKey, getCheckins, getContextEntries, getNotes, read, write } from "../lib/data.js";
import { logoutUser } from "../lib/api.js";

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
  function deleteData() {
    if (!window.confirm("Delete all check-ins and notes from this browser?")) return;
    localStorage.removeItem(STORE.checkins); localStorage.removeItem(STORE.notes); localStorage.removeItem(STORE.context);
    setMsg("All check-ins and notes deleted.");
  }
  function withdraw() {
    if (!window.confirm("Withdraw consent? Your data will also be deleted.")) return;
    clearAll();
    logoutUser();
    nav("/");
  }
  function handleSignOut() {
    logoutUser();
    nav("/");
  }

  return (
    <Shell>
      <PageHead title="Settings" date={consent.at ? "Consent given on " + new Date(consent.at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : ""} />
      <div className="action-grid">
        <section className="action">
          <span className="stat-ic" style={{ background: "#1FB5CC", marginBottom: 0 }}><FiDownload /></span>
          <h2>Download my check-ins</h2>
          <p className="muted small">Saves your check-in and context data as a JSON file.</p>
          <button type="button" className="btn soft" onClick={download}>Download</button>
        </section>
        <section className="action">
          <span className="stat-ic" style={{ background: "#F4577B", marginBottom: 0 }}><FiTrash2 /></span>
          <h2>Delete all my data</h2>
          <p className="muted small">Removes all check-ins and notes from this browser.</p>
          <button type="button" className="btn danger" onClick={deleteData}>Delete data</button>
        </section>
        <section className="action">
          <span className="stat-ic" style={{ background: "#5B61EC", marginBottom: 0 }}><FiLogOut /></span>
          <h2>Sign out</h2>
          <p className="muted small">Logs you out from your account and clears your session.</p>
          <button type="button" className="btn soft" onClick={handleSignOut}>Sign out</button>
        </section>
        <section className="action">
          <span className="stat-ic" style={{ background: "#FF9F43", marginBottom: 0 }}><FiShield /></span>
          <h2>Withdraw consent</h2>
          <p className="muted small">Deletes your data, clears your account, and returns to the start.</p>
          <button type="button" className="btn danger" onClick={withdraw}>Withdraw</button>
        </section>
      </div>
      <p className="status" role="status" aria-live="polite">{msg}</p>
    </Shell>
  );
}
