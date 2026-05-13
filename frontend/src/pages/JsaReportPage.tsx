import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Layout from "../components/Layout";
import { api } from "../api";
import type { JsaRecord, User } from "../types";

type Props = { user: User | null; onLogout: () => void };

function riskBadge(score: number) {
  if (score >= 8) return { bg: "bg-red-100 text-red-700",    label: "HIGH",   dot: "#dc2626" };
  if (score >= 4) return { bg: "bg-amber-100 text-amber-700", label: "MED",    dot: "#d97706" };
  return             { bg: "bg-green-100 text-green-700",  label: "LOW",    dot: "#16a34a" };
}

export default function JsaReportPage({ user, onLogout }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const [jsa, setJsa] = useState<JsaRecord | null>(null);

  useEffect(() => {
    if (!id) return;
    api<JsaRecord>(`/api/jsa/${id}`).then(setJsa).catch(() => null);
  }, [id]);

  const handlePrint = () => window.print();

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-AU", {
      day: "2-digit", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  if (!jsa) {
    return (
      <Layout user={user} title="JSA Report" onLogout={onLogout}>
        <div className="flex h-64 items-center justify-center text-brand-400">Loading report…</div>
      </Layout>
    );
  }

  const maxPre = jsa.hazards.length
    ? Math.max(...jsa.hazards.map((h) => h.pre_score))
    : 0;
  const overallRisk = riskBadge(maxPre);

  const statusColors: Record<string, string> = {
    draft:            "bg-gray-100 text-gray-700",
    pending_approval: "bg-amber-100 text-amber-800",
    approved:         "bg-green-100 text-green-800",
  };

  return (
    <Layout user={user} title="JSA Report" onLogout={onLogout}>

      {/* ── Action bar (hidden during print) ─────────────────────────────── */}
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => navigate("/dashboard")}
          className="text-sm text-brand-500 hover:text-brand-700"
        >
          ← Back
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 rounded-lg border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50"
        >
          🖨 Print / Export PDF
        </button>
      </div>

      {/* ── Report card ───────────────────────────────────────────────────── */}
      <div className="report-card rounded-2xl border border-brand-100 bg-white shadow-sm">

        {/* Header */}
        <div
          className="flex items-start justify-between rounded-t-2xl border-b border-brand-100 px-6 py-5"
          style={{ background: "#377133" }}
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-green-200">
              RigPro JSA Report
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold text-white">
              Job Safety Assessment
            </h1>
            <p className="mt-1 text-sm text-green-100">
              {jsa.job_number} — {jsa.boat_name}
            </p>
          </div>
          <span className={`rounded-xl px-3 py-1.5 text-sm font-bold capitalize ${statusColors[jsa.status]}`}>
            {jsa.status.replace(/_/g, " ")}
          </span>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 gap-px border-b border-brand-100 bg-brand-100 sm:grid-cols-4">
          {[
            {
              label: "Hazards",
              value: String(jsa.hazards.length),
              color: jsa.hazards.length > 0 ? "text-red-600" : "text-green-600",
            },
            {
              label: "PPE Items",
              value: String(jsa.ppe_list.length),
              color: "text-brand-700",
            },
            {
              label: "Overall Risk",
              value: maxPre > 0 ? overallRisk.label : "—",
              color: maxPre >= 8 ? "text-red-600" : maxPre >= 4 ? "text-amber-600" : "text-green-600",
            },
            {
              label: "Status",
              value: jsa.status.replace(/_/g, " "),
              color: jsa.status === "approved" ? "text-green-600" : "text-amber-600",
            },
          ].map((k) => (
            <div key={k.label} className="bg-white px-5 py-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-400">{k.label}</p>
              <p className={`mt-1 font-display text-2xl font-bold capitalize ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Meta */}
        <div className="grid gap-4 border-b border-brand-100 px-6 py-4 text-sm sm:grid-cols-3">
          {[
            { label: "Job Number",   value: jsa.job_number },
            { label: "Vessel / Boat", value: jsa.boat_name },
            { label: "Service Log",  value: jsa.service_log_number },
            { label: "Location",     value: jsa.location },
            { label: "Date",         value: String(jsa.date) },
            { label: "Created",      value: fmt(jsa.created_at) },
            ...(jsa.approved_by ? [{ label: "Approved By", value: jsa.approved_by }] : []),
          ].map((item) => (
            <div key={item.label}>
              <p className="text-xs font-semibold uppercase text-brand-400">{item.label}</p>
              <p className={`mt-0.5 font-medium ${item.label === "Approved By" ? "text-green-700" : "text-brand-800"}`}>
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {/* Work Steps */}
        <div className="border-b border-brand-100 px-6 py-4">
          <h3 className="mb-3 font-semibold text-brand-700">
            Work Steps ({jsa.steps.length})
          </h3>
          <ol className="space-y-1.5">
            {jsa.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-brand-800">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        {/* Identified Hazards */}
        <div className="border-b border-brand-100 px-6 py-4">
          <h3 className="mb-3 font-semibold text-brand-700">
            Identified Hazards ({jsa.hazards.length})
          </h3>

          {jsa.hazards.length === 0 ? (
            <p className="text-sm text-brand-400">No hazards identified.</p>
          ) : (
            <div className="space-y-3">
              {jsa.hazards.map((h) => {
                const pre  = riskBadge(h.pre_score);
                const post = riskBadge(h.post_score);
                return (
                  <div
                    key={h.hazard_id}
                    className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm"
                  >
                    {/* Hazard name + pre badge */}
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: pre.dot }}
                        />
                        <span className="font-semibold text-brand-900">{h.hazard_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded px-2 py-0.5 text-xs font-bold ${pre.bg}`}>
                          Pre: {h.pre_score} ({pre.label})
                        </span>
                        <span className="text-brand-300">→</span>
                        <span className={`rounded px-2 py-0.5 text-xs font-bold ${post.bg}`}>
                          Post: {h.post_score} ({post.label})
                        </span>
                      </div>
                    </div>

                    {/* Controls */}
                    <p className="mb-2 text-sm leading-relaxed text-brand-700">{h.controls}</p>

                    {/* Score breakdown */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-brand-50 px-3 py-2">
                        <p className="mb-0.5 font-bold text-brand-500">Pre-Control</p>
                        <p className="text-brand-800">
                          L{h.pre_likelihood} × S{h.pre_severity} = <strong>{h.pre_score}</strong>
                        </p>
                      </div>
                      <div className="rounded-lg bg-green-50 px-3 py-2">
                        <p className="mb-0.5 font-bold text-green-600">Post-Control</p>
                        <p className="text-green-800">
                          L{h.post_likelihood} × S{h.post_severity} = <strong>{h.post_score}</strong>
                        </p>
                      </div>
                    </div>

                    {/* PPE for this hazard */}
                    <p className="mt-2 text-xs text-brand-500">
                      <span className="font-semibold">PPE required: </span>{h.ppe}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Required PPE */}
        <div className="border-b border-brand-100 px-6 py-4">
          <h3 className="mb-3 font-semibold text-brand-700">
            Required PPE ({jsa.ppe_list.length})
          </h3>
          {jsa.ppe_list.length === 0 ? (
            <p className="text-sm text-brand-400">No PPE specified.</p>
          ) : (
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {jsa.ppe_list.map((ppe) => (
                <li key={ppe} className="flex items-center gap-2 text-sm text-brand-800">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600 text-xs">
                    ✓
                  </span>
                  {ppe}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Supervisor Approval */}
        <div className="px-6 py-5">
          <h3 className="mb-4 font-semibold text-brand-700">Supervisor Approval</h3>

          {jsa.status === "approved" && jsa.supervisor_signature ? (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Signature */}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-green-600">Signature</p>
                  <div className="rounded-lg border border-green-200 bg-white p-2">
                    <img
                      src={jsa.supervisor_signature}
                      alt="Supervisor signature"
                      className="h-20 w-full object-contain"
                    />
                  </div>
                </div>

                {/* Approval details */}
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-green-600">Approved By</p>
                    <p className="mt-0.5 font-bold text-green-900">{jsa.approved_by}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-green-600">Date</p>
                    <p className="mt-0.5 font-medium text-green-800">{String(jsa.date)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-green-600">Status</p>
                    <p className="mt-0.5 text-lg font-bold text-green-700">✓ APPROVED</p>
                  </div>
                </div>
              </div>

              <p className="mt-3 text-xs text-green-600 border-t border-green-200 pt-3">
                This JSA has been formally approved by the nominated supervisor.
                Approval is binding under the applicable safety management system.
              </p>
            </div>
          ) : jsa.status === "pending_approval" ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
              <p className="font-semibold text-amber-800">⏳ Awaiting supervisor approval</p>
              <p className="mt-1 text-sm text-amber-700">
                This JSA has been submitted and is pending review by a supervisor.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-4">
              <p className="text-sm text-brand-500">Not yet submitted for approval.</p>

              {/* Blank signature line for physical signing */}
              <div className="mt-4 grid gap-6 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase text-brand-500">Supervisor Signature</p>
                  <div className="h-16 rounded border border-dashed border-brand-300 bg-white" />
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase text-brand-500">Date</p>
                  <div className="h-16 rounded border border-dashed border-brand-300 bg-white" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="rounded-b-2xl border-t border-brand-100 bg-brand-50 px-6 py-3">
          <p className="text-xs text-brand-400">
            RigPro JSA Platform — Record ID: {jsa.id} — Generated:{" "}
            {new Date().toLocaleString("en-AU", {
              day: "2-digit", month: "short", year: "numeric",
              hour: "2-digit", minute: "2-digit",
            })}
          </p>
        </div>
      </div>
    </Layout>
  );
}
