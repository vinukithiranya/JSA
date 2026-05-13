import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Layout from "../components/Layout";
import { api } from "../api";
import type { JsaRecord, User } from "../types";

type Props = { user: User | null; onLogout: () => void };

function riskStyle(score: number) {
  if (score >= 7) return { badge: "bg-red-100 text-red-700",    label: "HIGH",   dot: "#dc2626" };
  if (score >= 4) return { badge: "bg-amber-100 text-amber-700", label: "MEDIUM", dot: "#d97706" };
  return            { badge: "bg-green-100 text-green-700",  label: "LOW",    dot: "#16a34a" };
}

export default function ReviewPage({ user, onLogout }: Props) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [jsa, setJsa] = useState<JsaRecord | null>(null);

  useEffect(() => {
    if (!id) return;
    api<JsaRecord>(`/api/jsa/${id}`).then(setJsa).catch(() => null);
  }, [id]);

  async function submitForApproval() {
    if (!id) return;
    await api<JsaRecord>(`/api/jsa/${id}/submit`, { method: "POST" });
    navigate("/dashboard");
  }

  return (
    <Layout user={user} title="Review Hazard Analysis" onLogout={onLogout}>
      {jsa && (
        <div className="mb-4 rounded-lg border border-brand-100 bg-white px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
            <span className="font-bold text-brand-900">{jsa.job_number}</span>
            <span className="text-brand-600">{jsa.boat_name}</span>
            <span className="text-brand-500">SL: {jsa.service_log_number}</span>
            <span className="text-brand-500">{jsa.location}</span>
            <span className="text-brand-500">{String(jsa.date)}</span>
            <span className={`ml-auto rounded px-2 py-0.5 text-xs font-bold capitalize ${
              jsa.status === "approved"         ? "bg-green-100 text-green-700"  :
              jsa.status === "pending_approval" ? "bg-amber-100 text-amber-700" :
              "bg-brand-100 text-brand-700"
            }`}>
              {jsa.status.replace(/_/g, " ")}
            </span>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {/* Hazards list */}
        <section className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm md:col-span-2">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-brand-600">
            Detected Hazards ({jsa?.hazards.length ?? 0})
          </h2>
          <div className="space-y-3">
            {jsa?.hazards.length ? jsa.hazards.map((hazard) => {
              const pre  = riskStyle(hazard.pre_score);
              const post = riskStyle(hazard.post_score);
              return (
                <article key={hazard.hazard_id} className="rounded-lg border border-brand-100 p-3">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: pre.dot }}
                      />
                      <h3 className="text-sm font-bold text-brand-900">{hazard.hazard_name}</h3>
                    </div>
                    <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-bold ${pre.badge}`}>
                      {pre.label} — {hazard.pre_score}
                    </span>
                  </div>

                  <p className="mb-3 text-xs leading-relaxed text-brand-700">{hazard.controls}</p>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded bg-brand-50 px-3 py-2">
                      <p className="mb-1 font-bold text-brand-500">Pre-Control</p>
                      <p className="text-brand-800">
                        L{hazard.pre_likelihood} × S{hazard.pre_severity}{" "}
                        <span className="font-bold">= {hazard.pre_score}</span>
                      </p>
                    </div>
                    <div className="rounded bg-green-50 px-3 py-2">
                      <p className="mb-1 font-bold text-green-600">Post-Control</p>
                      <p className="text-green-800">
                        L{hazard.post_likelihood} × S{hazard.post_severity}{" "}
                        <span className={`font-bold ${post.badge.split(" ")[1]}`}>= {hazard.post_score}</span>
                      </p>
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-brand-500">
                    <span className="font-semibold">PPE: </span>{hazard.ppe}
                  </p>
                </article>
              );
            }) : (
              <p className="text-sm text-brand-400">No hazards detected yet.</p>
            )}
          </div>
        </section>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-brand-600">
              PPE Required ({jsa?.ppe_list.length ?? 0})
            </h2>
            <ul className="space-y-1.5">
              {jsa?.ppe_list.length ? jsa.ppe_list.map((ppe) => (
                <li key={ppe} className="flex items-center gap-2 text-xs text-brand-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                  {ppe}
                </li>
              )) : (
                <li className="text-sm text-brand-400">No PPE items</li>
              )}
            </ul>
          </div>

          {/* Supervisor signature block (shown when approved) */}
          {jsa?.status === "approved" && jsa.supervisor_signature && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 shadow-sm">
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-green-700">
                Supervisor Approval
              </h2>
              <div className="rounded-lg border border-green-200 bg-white overflow-hidden mb-2">
                <img
                  src={jsa.supervisor_signature}
                  alt="Supervisor signature"
                  className="w-full h-16 object-contain"
                />
              </div>
              {jsa.approved_by && (
                <p className="text-xs font-semibold text-green-800">{jsa.approved_by}</p>
              )}
              <p className="text-xs text-green-600 mt-0.5">✓ Approved</p>
            </div>
          )}

          <div className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-brand-600">Actions</h2>
            <div className="space-y-2">
              {jsa?.status === "draft" && (
                <button
                  onClick={submitForApproval}
                  className="w-full rounded-lg bg-brand-700 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-800"
                >
                  Submit for Approval
                </button>
              )}
              {jsa?.status === "pending_approval" && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-center text-sm font-semibold text-amber-800">
                  ⏳ Awaiting Supervisor Approval
                </div>
              )}
              <Link
                to={`/jsa/report/${id}`}
                className="block w-full rounded-lg border border-brand-200 py-2.5 text-center text-sm font-semibold text-brand-800 transition-colors hover:bg-brand-50"
              >
                View / Export PDF
              </Link>
              <Link
                to="/dashboard"
                className="block w-full rounded-lg border border-brand-100 py-2 text-center text-sm text-brand-500 hover:text-brand-700"
              >
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </Layout>
  );
}
