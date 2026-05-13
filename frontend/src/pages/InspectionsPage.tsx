import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { api } from "../api";
import type { User, FormTemplate } from "../types";

type InspectionRecord = {
  id: string;
  template_id: string;
  template_name: string;
  title: string;
  site: string;
  conducted_by: string;
  status: "in_progress" | "completed" | "approved";
  score: number | null;
  total_questions: number;
  answered_questions: number;
  started_at: string;
  completed_at: string | null;
  flagged_items: { question_text: string; answer_value: string; action_created: boolean; skipped: boolean }[];
};

type Props = { user: User | null; onLogout: () => void };

const STATUS_COLORS: Record<string, string> = {
  in_progress: "bg-yellow-100 text-yellow-800",
  completed:   "bg-blue-100 text-blue-700",
  approved:    "bg-green-100 text-green-800",
};

const STATUS_LABELS: Record<string, string> = {
  in_progress: "In Progress",
  completed:   "Completed",
  approved:    "Approved",
};

const CATEGORY_COLORS: Record<string, string> = {
  Inspection: "bg-brand-100 text-brand-700",
  JSA:        "bg-amber-100 text-amber-700",
  Audit:      "bg-purple-100 text-purple-700",
};

export default function InspectionsPage({ user, onLogout }: Props) {
  const navigate = useNavigate();
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [site, setSite] = useState("");
  const [selectedTpl, setSelectedTpl] = useState<FormTemplate | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const load = () => {
    const params = filterStatus !== "all" ? `?status=${filterStatus}` : "";
    api<InspectionRecord[]>(`/api/inspections${params}`).then(setInspections).catch(() => null);
  };

  useEffect(load, [filterStatus]);
  useEffect(() => {
    api<FormTemplate[]>("/api/templates").then(setTemplates).catch(() => null);
  }, []);

  const handleStart = async () => {
    if (!selectedTpl) return;
    setStarting(true);
    setStartError("");
    try {
      const insp = await api<InspectionRecord>("/api/inspections", {
        method: "POST",
        body: JSON.stringify({
          template_id: selectedTpl.id,
          title: selectedTpl.name,
          site,
          conducted_by: user?.id ?? "u-tech",
        }),
      });
      navigate(`/inspections/conduct/${insp.id}`);
    } catch (e: unknown) {
      setStartError(e instanceof Error ? e.message : "Failed to start inspection. Ensure the backend is running and restart it if needed.");
      setStarting(false);
    }
  };

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });

  const openInspection = (insp: InspectionRecord) => {
    if (insp.status === "in_progress") {
      navigate(`/inspections/conduct/${insp.id}`);
    } else {
      navigate(`/inspections/report/${insp.id}`);
    }
  };

  return (
    <Layout user={user} title="Inspections & Audits" onLogout={onLogout}>
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {["all", "in_progress", "completed", "approved"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                filterStatus === s
                  ? "bg-brand-700 text-white"
                  : "border border-brand-200 bg-white text-brand-700 hover:bg-brand-50"
              }`}
            >
              {s === "all" ? "All" : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowPicker(true)}
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
        >
          + Start Inspection
        </button>
      </div>

      {/* Inspections list */}
      <div className="space-y-2">
        {inspections.length === 0 && (
          <div className="rounded-xl border border-brand-100 bg-white p-12 text-center">
            <p className="text-3xl mb-3">📋</p>
            <p className="font-semibold text-brand-700">No inspections yet</p>
            <p className="mt-1 text-sm text-brand-400">Click "Start Inspection" to begin a new one</p>
          </div>
        )}
        {inspections.map((insp) => {
          const pct = insp.total_questions > 0
            ? Math.round((insp.answered_questions / insp.total_questions) * 100)
            : 0;
          const flaggedCount = insp.flagged_items?.length ?? 0;

          return (
            <div
              key={insp.id}
              onClick={() => openInspection(insp)}
              className="flex cursor-pointer items-start gap-4 rounded-xl border border-brand-100 bg-white p-4 shadow-sm transition-colors hover:border-brand-300"
            >
              {/* Score circle */}
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">
                {insp.status === "in_progress"
                  ? `${pct}%`
                  : insp.score !== null
                  ? `${insp.score}%`
                  : "—"}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-brand-900">{insp.title}</span>
                  <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[insp.status]}`}>
                    {STATUS_LABELS[insp.status]}
                  </span>
                  {flaggedCount > 0 && (
                    <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-700">
                      {flaggedCount} flagged
                    </span>
                  )}
                </div>

                <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-brand-400">
                  <span>Template: {insp.template_name}</span>
                  {insp.site && <span>Site: {insp.site}</span>}
                  <span>By: {insp.conducted_by}</span>
                  <span>Started: {fmt(insp.started_at)}</span>
                  {insp.completed_at && <span>Completed: {fmt(insp.completed_at)}</span>}
                </div>

                {insp.status === "in_progress" && (
                  <div className="mt-2">
                    <div className="mb-0.5 flex justify-between text-xs text-brand-400">
                      <span>{insp.answered_questions} / {insp.total_questions} answered</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-brand-100">
                      <div
                        className="h-1.5 rounded-full bg-brand-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <span className="shrink-0 text-sm text-brand-300">›</span>
            </div>
          );
        })}
      </div>

      {/* ── Template Picker Modal ──────────────────────────────────────── */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-1 font-display text-xl font-bold text-brand-900">Start Inspection</h2>
            <p className="mb-5 text-sm text-brand-500">Select a template to begin</p>

            {/* Site input */}
            <div className="mb-4">
              <label className="mb-1 block text-xs font-semibold text-brand-600">Site / Location (optional)</label>
              <input
                value={site}
                onChange={(e) => setSite(e.target.value)}
                placeholder="e.g. Offshore Platform A, Workshop Bay 3"
                className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>

            {/* Template grid */}
            <div className="grid gap-3 sm:grid-cols-2">
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => setSelectedTpl(tpl.id === selectedTpl?.id ? null : tpl)}
                  className={`rounded-xl border-2 p-4 text-left transition-all ${
                    selectedTpl?.id === tpl.id
                      ? "border-brand-600 bg-brand-50"
                      : "border-brand-100 bg-white hover:border-brand-300"
                  }`}
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <span className="font-semibold text-brand-900">{tpl.name}</span>
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold ${CATEGORY_COLORS[tpl.category] ?? "bg-gray-100 text-gray-600"}`}>
                      {tpl.category}
                    </span>
                  </div>
                  {tpl.description && (
                    <p className="text-xs text-brand-500 line-clamp-2">{tpl.description}</p>
                  )}
                  <p className="mt-2 text-xs text-brand-400">
                    {(tpl.form_schema.sections ?? []).reduce(
                      (n, s) => n + (s.fields?.length ?? (s as unknown as { questions?: unknown[] }).questions?.length ?? 0),
                      0
                    )} questions across {tpl.form_schema.sections?.length ?? 0} sections
                  </p>
                </button>
              ))}
              {templates.length === 0 && (
                <p className="col-span-2 text-center text-sm text-brand-400 py-4">No templates available.</p>
              )}
            </div>

            {startError && (
              <p className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {startError}
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => { setShowPicker(false); setSelectedTpl(null); setSite(""); setStartError(""); }}
                className="rounded-lg border border-brand-200 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
              >
                Cancel
              </button>
              <button
                onClick={handleStart}
                disabled={!selectedTpl || starting}
                className="rounded-lg bg-brand-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-40"
              >
                {starting ? "Starting…" : "Start Inspection →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
