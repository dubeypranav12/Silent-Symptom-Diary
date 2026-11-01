import { useMemo, useState } from "react";
import { FiCheck, FiClock, FiShield, FiX } from "react-icons/fi";
import { Shell, PageHead, StatCard } from "../components/Shell.jsx";

const SAMPLE_APPLICATIONS = [
  { id: "DEMO-101", name: "Alex Sample", email: "alex.sample@example.test", clinic: "Northside Demo Clinic", specialty: "Neurology", registration: "DEMO-MED-2041", jurisdiction: "Demo region", submitted: "Today", status: "pending" },
  { id: "DEMO-102", name: "Jordan Demo", email: "jordan.demo@example.test", clinic: "Example Health Centre", specialty: "Family medicine", registration: "DEMO-MED-1876", jurisdiction: "Demo region", submitted: "Yesterday", status: "pending" },
  { id: "DEMO-103", name: "Taylor Example", email: "taylor.example@example.test", clinic: "Sample Care Group", specialty: "Neurology", registration: "DEMO-MED-1028", jurisdiction: "Demo region", submitted: "28 Oct 2026", status: "approved" }
];

const FILTERS = ["pending", "approved", "rejected"];

export default function Admin() {
  const [applications, setApplications] = useState(SAMPLE_APPLICATIONS);
  const [filter, setFilter] = useState("pending");
  const [message, setMessage] = useState("");
  const counts = useMemo(() => applications.reduce((all, item) => {
    all[item.status] += 1;
    return all;
  }, { pending: 0, approved: 0, rejected: 0 }), [applications]);
  const visible = applications.filter((item) => item.status === filter);

  function review(id, status) {
    setApplications((items) => items.map((item) => item.id === id ? { ...item, status } : item));
    setMessage(`${id} marked ${status}. This demo decision is stored only in this page session.`);
  }

  return (
    <Shell role="admin">
      <PageHead title="Doctor verification" date="Admin review demo" />

      <div className="admin-demo-warning" role="note">
        <FiShield aria-hidden="true" />
        <div><b>Prototype only — not a security control</b><p>This page is publicly accessible. The sample records and review decisions are local to this page; no identity or medical license is verified, and approvals do not control doctor sign-in.</p></div>
      </div>

      <section aria-label="Application totals" className="stats">
        <StatCard icon={FiClock} color="#FF9F43" label="Pending review" value={counts.pending} />
        <StatCard icon={FiCheck} color="#22B98A" label="Approved (demo)" value={counts.approved} />
        <StatCard icon={FiX} color="#F4577B" label="Rejected (demo)" value={counts.rejected} />
      </section>

      <section className="card">
        <div className="card-head">
          <div><h2>Doctor applications</h2><p className="muted small">Review sample registration details before granting clinician access.</p></div>
          <div className="pill-row" role="group" aria-label="Filter applications">
            {FILTERS.map((status) => <button key={status} type="button" className="pill" aria-pressed={filter === status} onClick={() => setFilter(status)}>{status[0].toUpperCase() + status.slice(1)} ({counts[status]})</button>)}
          </div>
        </div>

        {visible.length === 0 ? <p className="muted admin-empty">No {filter} sample applications.</p> : (
          <div className="admin-applications">
            {visible.map((application) => (
              <article className="admin-application" key={application.id}>
                <div className="admin-application-head">
                  <div><span className="chip sample">Sample application · {application.id}</span><h3>{application.name}</h3><p className="muted small">{application.email}</p></div>
                  <span className={`chip ${application.status === "pending" ? "info" : application.status === "approved" ? "ok" : "warn"}`}>{application.status}</span>
                </div>
                <dl className="admin-details">
                  <div><dt>Clinic</dt><dd>{application.clinic}</dd></div>
                  <div><dt>Specialty</dt><dd>{application.specialty}</dd></div>
                  <div><dt>Registration ID</dt><dd>{application.registration}</dd></div>
                  <div><dt>Jurisdiction</dt><dd>{application.jurisdiction}</dd></div>
                  <div><dt>Submitted</dt><dd>{application.submitted}</dd></div>
                </dl>
                {application.status === "pending" && <div className="admin-actions">
                  <button type="button" className="btn" onClick={() => review(application.id, "approved")}><FiCheck /> Approve sample</button>
                  <button type="button" className="btn danger" onClick={() => review(application.id, "rejected")}><FiX /> Reject sample</button>
                </div>}
              </article>
            ))}
          </div>
        )}
        <p className="status" role="status" aria-live="polite">{message}</p>
      </section>
    </Shell>
  );
}
