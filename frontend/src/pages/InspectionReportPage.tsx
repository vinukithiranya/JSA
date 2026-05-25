import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Layout from "../components/Layout";
import { api } from "../api";
import type { User } from "../types";

type InspectionRecord = {
  id: string;
  template_id: string;
  template_name: string;
  title: string;
  site: string;
  conducted_by: string;
  status: "in_progress" | "completed" | "pending_approval" | "approved";
  answers: Record<string, { value: unknown; note: string; is_flagged: boolean; media_urls: string[] }>;
  flagged_items: { question_id: string; question_text: string; answer_value: string; note: string; action_created: boolean; skipped: boolean }[];
  score: number | null;
  total_questions: number;
  answered_questions: number;
  started_at: string;
  completed_at: string | null;
  approved_by: string | null;
  supervisor_signature: string | null;
};

type TemplateData = {
  template: { sections: Array<{ id: string; title: string; questions: Array<{ id: string; text: string; type: string }> }> };
  name: string;
  description: string;
};

type Props = { user: User | null; onLogout: () => void };

const STATUS_COLORS: Record<string, string> = {
  in_progress:      "bg-yellow-100 text-yellow-800",
  completed:        "bg-blue-100 text-blue-700",
  pending_approval: "bg-amber-100 text-amber-800",
  approved:         "bg-green-100 text-green-800",
};

export default function InspectionReportPage({ user, onLogout }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [inspection, setInspection] = useState<InspectionRecord | null>(null);
  const [tplData, setTplData] = useState<TemplateData | null>(null);
  const [approving, setApproving] = useState(false);

  const isSup = user?.role === "supervisor" || user?.role === "admin";

  useEffect(() => {
    if (!id) return;
    api<InspectionRecord>(`/api/inspections/${id}`).then(setInspection);
    api<TemplateData>(`/api/inspections/${id}/template`).then(setTplData);
  }, [id]);

  const handleApprove = async () => {
    if (!id || !user) return;
    setApproving(true);
    try {
      const updated = await api<InspectionRecord>(
        `/api/inspections/${id}/approve`,
        { method: "POST", body: JSON.stringify({ approved_by: user.full_name }) }
      );
      setInspection(updated);
    } finally {
      setApproving(false);
    }
  };

  const handlePrint = () => {
    window.open(`/api/inspections/${id}/report`, "_blank");
  };

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-AU", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const fmtVal = (val: unknown): string => {
    if (val === null || val === undefined || val === "") return "—";
    if (Array.isArray(val)) return val.join(", ");
    return String(val);
  };

  if (!inspection) {
    return (
      <Layout user={user} title="Inspection Report" onLogout={onLogout}>
        <div className="flex h-64 items-center justify-center text-brand-400">Loading report…</div>
      </Layout>
    );
  }

  const flaggedCount = inspection.flagged_items.length;
  const scoreColor =
    inspection.score === null ? "text-brand-400"
    : inspection.score >= 80 ? "text-green-600"
    : inspection.score >= 60 ? "text-amber-600"
    : "text-red-600";

  return (
    <Layout user={user} title="Inspection Report" onLogout={onLogout}>
      {/* Actions bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => navigate("/inspections")}
          className="text-sm text-brand-500 hover:text-brand-700"
        >
          ← Back to Inspections
        </button>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="rounded-lg border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50"
          >
            🖨 Print / Export PDF
          </button>
          {isSup && (inspection.status === "pending_approval" || inspection.status === "completed") && (
            <button
              onClick={handleApprove}
              disabled={approving}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {approving ? "Approving…" : "✓ Approve Inspection"}
            </button>
          )}
        </div>
      </div>

      {/* Report card */}
      <div className="rounded-2xl border border-brand-100 bg-white shadow-sm">
        {/* Header */}
        <div className="flex items-start justify-between rounded-t-2xl border-b border-brand-100 bg-brand-700 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-200">RigPro Inspection Report</p>
            <h1 className="mt-1 font-display text-2xl font-bold text-white">{inspection.title}</h1>
            <p className="mt-1 text-sm text-brand-200">{inspection.template_name}</p>
          </div>
          <span className={`rounded-xl px-3 py-1.5 text-sm font-bold capitalize ${STATUS_COLORS[inspection.status]}`}>
            {inspection.status.replace("_", " ")}
          </span>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 gap-px border-b border-brand-100 bg-brand-100 sm:grid-cols-4">
          {[
            { label: "Score", value: inspection.score !== null ? `${inspection.score}%` : "N/A", color: scoreColor },
            { label: "Answered", value: `${inspection.answered_questions} / ${inspection.total_questions}`, color: "text-brand-700" },
            { label: "Flagged", value: String(flaggedCount), color: flaggedCount > 0 ? "text-red-600" : "text-green-600" },
            { label: "Status", value: inspection.status.replace("_", " "), color: "text-brand-700" },
          ].map((k) => (
            <div key={k.label} className="bg-white px-5 py-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-400">{k.label}</p>
              <p className={`mt-1 font-display text-2xl font-bold capitalize ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Meta */}
        <div className="grid gap-4 border-b border-brand-100 px-6 py-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase text-brand-400">Conducted By</p>
            <p className="mt-0.5 font-medium text-brand-800">{inspection.conducted_by}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-brand-400">Site</p>
            <p className="mt-0.5 font-medium text-brand-800">{inspection.site || "—"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-brand-400">Started</p>
            <p className="mt-0.5 font-medium text-brand-800">{fmt(inspection.started_at)}</p>
          </div>
          {inspection.completed_at && (
            <div>
              <p className="text-xs font-semibold uppercase text-brand-400">Completed</p>
              <p className="mt-0.5 font-medium text-brand-800">{fmt(inspection.completed_at)}</p>
            </div>
          )}
          {inspection.approved_by && (
            <div>
              <p className="text-xs font-semibold uppercase text-brand-400">Approved By</p>
              <p className="mt-0.5 font-medium text-green-700">{inspection.approved_by}</p>
            </div>
          )}
        </div>

        {/* Supervisor Approval */}
        {inspection.approved_by && (
          <div className="border-b border-brand-100 px-6 py-5">
            <h3 className="mb-3 font-semibold text-green-700">✓ Supervisor Approval</h3>
            <div className="grid gap-4 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase text-brand-400">Approved By</p>
                <p className="mt-0.5 font-bold text-green-700">{inspection.approved_by}</p>
              </div>
              {inspection.completed_at && (
                <div>
                  <p className="text-xs font-semibold uppercase text-brand-400">Approval Date</p>
                  <p className="mt-0.5 font-medium text-brand-800">{fmt(inspection.completed_at)}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold uppercase text-brand-400">Status</p>
                <p className="mt-0.5 font-bold text-green-700">APPROVED</p>
              </div>
            </div>
            {inspection.supervisor_signature && (
              <div className="mt-4">
                <p className="mb-1 text-xs font-semibold uppercase text-brand-400">Supervisor Signature</p>
                <div className="inline-block rounded-xl border border-brand-200 bg-white p-2 shadow-sm">
                  <img
                    src={inspection.supervisor_signature}
                    alt="Supervisor signature"
                    className="h-20 max-w-xs object-contain"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Flagged Items */}
        {flaggedCount > 0 && (
          <div className="border-b border-brand-100 px-6 py-4">
            <h3 className="mb-3 font-semibold text-red-700">⚑ Flagged Items ({flaggedCount})</h3>
            <div className="space-y-2">
              {inspection.flagged_items.map((item, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-200 text-xs font-bold text-red-700">{i + 1}</span>
                  <div>
                    <p className="font-semibold text-brand-900">{item.question_text}</p>
                    <p className="text-brand-500">Answer: <span className="font-medium text-red-700">"{item.answer_value}"</span></p>
                    {item.note && <p className="text-brand-400 text-xs">Note: {item.note}</p>}
                    <p className="mt-0.5 text-xs text-brand-400">
                      {item.action_created ? "✅ Action created" : item.skipped ? "⏭ Skipped" : "⬜ No action taken"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Answers by section */}
        <div className="px-6 py-4">
          <h3 className="mb-4 font-semibold text-brand-700">All Responses</h3>
          {(tplData?.template.sections ?? []).map((section) => (
            <div key={section.id} className="mb-6">
              <h4 className="mb-3 border-b border-brand-100 pb-1 text-sm font-bold uppercase tracking-wider text-brand-500">
                {section.title}
              </h4>
              <div className="space-y-2">
                {section.questions.map((q) => {
                  const ans = inspection.answers[q.id];
                  const flagged = ans?.is_flagged;
                  return (
                    <div
                      key={q.id}
                      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
                        flagged ? "border-red-200 bg-red-50" : "border-brand-100 bg-white"
                      }`}
                    >
                      {flagged && <span className="mt-0.5 shrink-0 text-red-500">⚑</span>}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-brand-800">{q.text}</p>
                        {ans?.note && (
                          <p className="mt-0.5 text-xs italic text-brand-400">Note: {ans.note}</p>
                        )}
                        {ans?.media_urls?.length > 0 && (
                          <div className="mt-2 flex gap-2">
                            {ans.media_urls.map((u, idx) => (
                              <a key={idx} href={u} target="_blank" rel="noreferrer">
                                <img src={u} alt={`attachment-${idx}`} className="h-16 w-16 rounded object-cover border" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold ${
                        flagged ? "bg-red-100 text-red-700" : "bg-brand-100 text-brand-700"
                      }`}>
                        {fmtVal(ans?.value)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
