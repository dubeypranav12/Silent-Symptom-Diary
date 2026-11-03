import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiCheck, FiClock, FiShield, FiX, FiSearch, FiUserPlus, FiUserCheck, FiFileText } from "react-icons/fi";
import { Shell, PageHead, StatCard, Empty } from "../components/Shell.jsx";
import { getDoctorApplications, updateDoctorApplicationStatus } from "../lib/data.js";

const FILTERS = ["all", "pending", "approved", "rejected"];

export default function Admin() {
  const [applications, setApplications] = useState(() => getDoctorApplications());
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  function refresh() {
    setApplications(getDoctorApplications());
  }

  useEffect(() => {
    function handleUpdate() {
      refresh();
    }
    window.addEventListener("doctor:registered", handleUpdate);
    window.addEventListener("doctor:statusChanged", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("doctor:registered", handleUpdate);
      window.removeEventListener("doctor:statusChanged", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const counts = useMemo(() => applications.reduce((all, item) => {
    const st = item.status || "pending";
    if (all[st] !== undefined) all[st] += 1;
    all.all += 1;
    return all;
  }, { all: 0, pending: 0, approved: 0, rejected: 0 }), [applications]);

  const visible = useMemo(() => {
    return applications.filter((item) => {
      const matchesFilter = filter === "all" || (item.status || "pending") === filter;
      if (!matchesFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.email && item.email.toLowerCase().includes(q)) ||
        (item.clinic && item.clinic.toLowerCase().includes(q)) ||
        (item.registration && item.registration.toLowerCase().includes(q)) ||
        (item.specialty && item.specialty.toLowerCase().includes(q)) ||
        (item.id && item.id.toLowerCase().includes(q))
      );
    });
  }, [applications, filter, search]);

  function review(id, status) {
    updateDoctorApplicationStatus(id, status);
    setApplications(getDoctorApplications());
    const label = status === "approved" ? "verified and approved" : status === "rejected" ? "rejected" : "moved to pending";
    setMessage(`Application ${id} ${label}. Doctor record updated.`);
  }

  const dateText = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric"
  });

  return (
    <Shell role="admin">
      <PageHead title="Doctor Verification & Consent" date={dateText} />

      <div className="admin-demo-warning" style={{ background: "var(--lav2)", borderColor: "var(--lav3)", color: "var(--ink)" }} role="note">
        <FiShield aria-hidden="true" style={{ color: "var(--indigo)" }} />
        <div>
          <b>Clinician Governance & Verification Console</b>
          <p>
            When clinicians register, their licensing details, clinic affiliation, and compliance consent are transmitted here for administrative review and approval.
          </p>
        </div>
      </div>

      <section aria-label="Application totals" className="stats">
        <StatCard icon={FiFileText} color="#5B61EC" label="Total registered" value={counts.all} />
        <StatCard icon={FiClock} color="#FF9F43" label="Pending verification" value={counts.pending} />
        <StatCard icon={FiCheck} color="#22B98A" label="Verified clinicians" value={counts.approved} />
        <StatCard icon={FiX} color="#F4577B" label="Rejected applications" value={counts.rejected} />
      </section>

      <section className="card">
        <div className="card-head" style={{ flexWrap: "wrap", gap: 14 }}>
          <div>
            <h2>Doctor Registration Applications</h2>
            <p className="muted small">Review real-time doctor registrations and verified consent requests.</p>
          </div>
          <div className="pill-row" role="group" aria-label="Filter applications">
            {FILTERS.map((st) => (
              <button
                key={st}
                type="button"
                className="pill"
                aria-pressed={filter === st}
                onClick={() => setFilter(st)}
              >
                {st[0].toUpperCase() + st.slice(1)} ({counts[st]})
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center", margin: "16px 0", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: "1 1 240px" }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }}>
              <FiSearch />
            </span>
            <input
              type="search"
              placeholder="Search by doctor name, email, clinic or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                minHeight: 42,
                borderRadius: 12,
                border: "1.5px solid var(--lav3)",
                paddingLeft: 38,
                paddingRight: 14,
                fontSize: 13,
                fontFamily: "inherit"
              }}
            />
          </div>
          <Link to="/register/doctor" className="btn soft" style={{ minHeight: 42, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <FiUserPlus /> Register doctor
          </Link>
        </div>

        {visible.length === 0 ? (
          <div style={{ padding: "32px 16px", textAlign: "center" }}>
            <Empty text={applications.length === 0
              ? "No doctor registration applications received yet. When a doctor registers at /register/doctor, their credential verification request and consent will appear here."
              : `No applications matching filter "${filter}".`}
            />
            {applications.length === 0 && (
              <div style={{ marginTop: 16 }}>
                <Link to="/register/doctor" className="btn">
                  <FiUserPlus /> Register a test doctor
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="admin-applications">
            {visible.map((application) => {
              const st = application.status || "pending";
              const consentDate = application.consentAt || application.submittedAt;
              const formattedConsent = consentDate ? new Date(consentDate).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric"
              }) : "Confirmed";

              return (
                <article className="admin-application" key={application.id}>
                  <div className="admin-application-head">
                    <div>
                      <span className="chip info" style={{ marginBottom: 6 }}>
                        ID: {application.id}
                      </span>
                      <h3>{application.name}</h3>
                      <p className="muted small">{application.email}</p>
                    </div>
                    <span className={`chip ${st === "pending" ? "warn" : st === "approved" ? "ok" : "danger"}`}>
                      {st === "pending" ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <FiClock /> Consent Received · Pending
                        </span>
                      ) : st === "approved" ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <FiCheck /> Verified & Approved
                        </span>
                      ) : (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <FiX /> Rejected
                        </span>
                      )}
                    </span>
                  </div>

                  <dl className="admin-details">
                    <div>
                      <dt>Clinic / Organization</dt>
                      <dd>{application.clinic || "Primary Healthcare Centre"}</dd>
                    </div>
                    <div>
                      <dt>Specialty</dt>
                      <dd>{application.specialty || "Neurology"}</dd>
                    </div>
                    <div>
                      <dt>Registration / License ID</dt>
                      <dd>{application.registration || "N/A"}</dd>
                    </div>
                    <div>
                      <dt>Consent Reached Admin</dt>
                      <dd style={{ color: "var(--teal)", fontWeight: 600 }}>
                        ✓ Consent Verified ({formattedConsent})
                      </dd>
                    </div>
                    <div>
                      <dt>Submitted Date</dt>
                      <dd>{application.submittedAt ? new Date(application.submittedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Today"}</dd>
                    </div>
                  </dl>

                  <div className="admin-actions">
                    {st === "pending" && (
                      <>
                        <button type="button" className="btn" onClick={() => review(application.id, "approved")}>
                          <FiCheck /> Verify & Approve Doctor
                        </button>
                        <button type="button" className="btn danger" onClick={() => review(application.id, "rejected")}>
                          <FiX /> Reject Application
                        </button>
                      </>
                    )}
                    {st === "approved" && (
                      <>
                        <button type="button" className="btn soft" onClick={() => review(application.id, "pending")}>
                          <FiClock /> Revert to Pending
                        </button>
                        <button type="button" className="btn danger" onClick={() => review(application.id, "rejected")}>
                          <FiX /> Revoke Verification
                        </button>
                      </>
                    )}
                    {st === "rejected" && (
                      <>
                        <button type="button" className="btn" onClick={() => review(application.id, "approved")}>
                          <FiCheck /> Re-evaluate & Approve
                        </button>
                        <button type="button" className="btn soft" onClick={() => review(application.id, "pending")}>
                          <FiClock /> Move to Pending
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {message && (
          <p className="status" role="status" aria-live="polite" style={{ marginTop: 14 }}>
            {message}
          </p>
        )}
      </section>
    </Shell>
  );
}
