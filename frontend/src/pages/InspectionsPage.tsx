import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { api } from "../api";
import type { User, FormTemplate } from "../types";
import {
  cacheInspections, getCachedInspections,
  cacheTemplates, getCachedTemplates,
  saveLocalInspection, getLocalInspection, type LocalInspection,
} from "../offlineSync";

type InspectionRecord = {
  id: string;
  template_id: string;
  template_name: string;
  title: string;
  site: string;
  conducted_by: string;
  status: "in_progress" | "completed" | "approved" | "pending_approval" | "archived";
  score: number | null;
  total_questions: number;
  answered_questions: number;
  started_at: string;
  completed_at: string | null;
  flagged_items: { question_text: string; answer_value: string; action_created: boolean; skipped: boolean }[];
  _offline?: boolean;
};

type Props = { user: User | null; onLogout: () => void };

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns a human-readable date label ("Today", "Yesterday", or a formatted date string) for an ISO date string. */
function dateLabel(iso: string): string {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  if (d.getTime() === today.getTime()) return "Today";
  if (d.getTime() === yesterday.getTime()) return "Yesterday";
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
}

/** Groups an array of inspection records by their start date label and returns an array of labeled groups. */
function groupByDate(items: InspectionRecord[]): { label: string; items: InspectionRecord[] }[] {
  const map = new Map<string, InspectionRecord[]>();
  for (const item of items) {
    const label = dateLabel(item.started_at);
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(item);
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

/** Formats an ISO date string as a short localised date (e.g. "09 Jun 2026"). */
function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

const STATUS_BADGE: Record<string, string> = {
  in_progress:      "bg-amber-100 text-amber-700 border border-amber-200",
  completed:        "bg-brand-100 text-brand-700 border border-brand-200",
  approved:         "bg-green-100 text-green-700 border border-green-200",
  pending_approval: "bg-blue-100 text-blue-700 border border-blue-200",
  archived:         "bg-gray-100 text-gray-500 border border-gray-200",
};

const STATUS_LABEL: Record<string, string> = {
  in_progress:      "In Progress",
  completed:        "Completed",
  approved:         "Approved",
  pending_approval: "Pending Approval",
  archived:         "Archived",
};

const CATEGORY_BADGE: Record<string, string> = {
  Inspection: "bg-brand-50 text-brand-600",
  JSA:        "bg-amber-50 text-amber-600",
  Audit:      "bg-purple-50 text-purple-600",
};

// ── Score circle ──────────────────────────────────────────────────────────────

/** Renders a colour-coded percentage score indicator for an inspection. */
function ScoreCircle({ score, status, pct }: { score: number | null; status: string; pct: number }) {
  const display = status === "in_progress" ? pct : (score ?? null);
  const color =
    display === null ? "text-brand-400" :
    display >= 80 ? "text-green-600" :
    display >= 60 ? "text-amber-600" : "text-red-600";
  return (
    <span className={`font-bold tabular-nums ${color}`}>
      {display !== null ? `${display}%` : "—"}
    </span>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

/** Renders the Inspections page with a tabbed list of active and archived inspections and a modal to start a new inspection. */
export default function InspectionsPage({ user, onLogout }: Props) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"active" | "archive">("active");
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [site, setSite] = useState("");
  const [selectedTpl, setSelectedTpl] = useState<FormTemplate | null>(null);
  const [tplSearch, setTplSearch] = useState("");
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await api<InspectionRecord[]>("/api/inspections");
        setInspections(data);
        cacheInspections(data as unknown as LocalInspection[]).catch(() => null);
      } catch {
        const cached = await getCachedInspections().catch(() => []);
        setInspections(cached as unknown as InspectionRecord[]);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const data = await api<FormTemplate[]>("/api/templates");
        setTemplates(data);
        cacheTemplates(data as unknown as Parameters<typeof cacheTemplates>[0]).catch(() => null);
      } catch {
        const cached = await getCachedTemplates().catch(() => []);
        setTemplates(cached as unknown as FormTemplate[]);
      }
    })();
  }, []);

  const activeInspections = inspections.filter((i) =>
    i.status === "in_progress" || i.status === "completed" || i.status === "pending_approval"
  );
  const archivedInspections = inspections.filter((i) => i.status === "approved" || i.status === "archived");
  const shown = tab === "active" ? activeInspections : archivedInspections;
  const groups = groupByDate(shown);

  const filteredTpls = templates.filter((t) =>
    t.name.toLowerCase().includes(tplSearch.toLowerCase()) ||
    (t.description ?? "").toLowerCase().includes(tplSearch.toLowerCase())
  );

  function countTemplateQuestions(schema: FormTemplate["form_schema"]): number {
    return (schema.sections ?? []).reduce((n, s) => n + (s.questions?.length ?? 0), 0);
  }

  const handleStart = async () => {
    if (!selectedTpl) return;
    setStarting(true);
    setStartError("");

    if (!navigator.onLine) {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await saveLocalInspection({
        id,
        template_id: selectedTpl.id,
        template_name: selectedTpl.name,
        title: selectedTpl.name,
        site,
        conducted_by: user?.id ?? "u-tech",
        status: "in_progress",
        answers: {},
        flagged_items: [],
        score: null,
        total_questions: countTemplateQuestions(selectedTpl.form_schema),
        answered_questions: 0,
        started_at: now,
        completed_at: null,
        approved_by: null,
        supervisor_signature: null,
        pdf_url: null,
        _offline: true,
      });
      navigate(`/inspections/conduct/${id}`);
      return;
    }

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
      saveLocalInspection({ ...insp, _offline: false } as unknown as LocalInspection).catch(() => null);
      navigate(`/inspections/conduct/${insp.id}`);
    } catch (e: unknown) {
      setStartError(e instanceof Error ? e.message : "Failed to start. Check the backend is running.");
      setStarting(false);
    }
  };

  const openInspection = (insp: InspectionRecord) => {
    if (insp.status === "in_progress" || insp.status === "archived") navigate(`/inspections/conduct/${insp.id}`);
    else navigate(`/inspections/report/${insp.id}`);
  };

  const handleArchive = async (id: string) => {
    if (!confirm("Archive this inspection? It will move to the Archive tab.")) return;
    const insp = inspections.find((i) => i.id === id);
    if (insp?._offline) {
      const local = await getLocalInspection(id).catch(() => null);
      if (local) await saveLocalInspection({ ...local, status: "archived" }).catch(() => null);
      setInspections((prev) => prev.map((i) => i.id === id ? { ...i, status: "archived" } : i));
      return;
    }
    try {
      await api(`/api/inspections/${id}/archive`, { method: "PATCH" });
      setInspections((prev) => prev.map((i) => i.id === id ? { ...i, status: "archived" } : i));
    } catch {
      alert("Failed to archive. Please try again.");
    }
  };

  return (
    <Layout user={user} title="Inspections" onLogout={onLogout}>
      {/* ── Toolbar ───────────────────────────────────────────────────── */}
      <div className="mb-4 flex items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex rounded-lg border border-brand-200 bg-white p-0.5">
          {(["active", "archive"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-brand-700 text-white shadow-sm"
                  : "text-brand-600 hover:text-brand-900"
              }`}
            >
              {t === "active" ? "Inspections" : "Archive"}
              <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                tab === t ? "bg-brand-500 text-white" : "bg-brand-100 text-brand-500"
              }`}>
                {t === "active" ? activeInspections.length : archivedInspections.length}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowPicker(true)}
          className="flex items-center gap-1.5 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-800"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Start inspection
        </button>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-brand-100 bg-white shadow-sm">
        {/* Table header */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] border-b border-brand-100 bg-brand-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-brand-400">
          <span>Inspection</span>
          <span className="text-center">Score</span>
          <span>Conducted by</span>
          <span>Started</span>
          <span>Status</span>
        </div>

        {/* Empty state */}
        {shown.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            {tab === "archive" ? (
              <>
                <svg className="mb-4 h-14 w-14 text-brand-200" fill="none" stroke="currentColor" strokeWidth={1.25} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                <p className="font-semibold text-brand-600">No archived inspections</p>
                <p className="mt-1 text-sm text-brand-400">Approved and archived inspections appear here</p>
              </>
            ) : (
              <>
                <svg className="mb-4 h-14 w-14 text-brand-200" fill="none" stroke="currentColor" strokeWidth={1.25} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="font-semibold text-brand-600">No inspections yet</p>
                <p className="mt-1 text-sm text-brand-400">Click "Start inspection" to begin</p>
                <button
                  onClick={() => setShowPicker(true)}
                  className="mt-4 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
                >
                  + Start inspection
                </button>
              </>
            )}
          </div>
        )}

        {/* Grouped rows */}
        {groups.map(({ label, items }) => (
          <div key={label}>
            {/* Date group header */}
            <div className="border-b border-brand-50 bg-brand-50/60 px-4 py-2 text-xs font-bold uppercase tracking-wider text-brand-400">
              {label}
            </div>

            {items.map((insp) => {
              const pct = insp.total_questions > 0
                ? Math.round((insp.answered_questions / insp.total_questions) * 100)
                : 0;
              const flagged = insp.flagged_items?.length ?? 0;

              return (
                <div
                  key={insp.id}
                  onClick={() => openInspection(insp)}
                  className="group grid cursor-pointer grid-cols-[2fr_1fr_1fr_1fr_1fr] items-center border-b border-brand-50 px-4 py-3.5 transition-colors last:border-b-0 hover:bg-brand-50"
                >
                  {/* Inspection name + template */}
                  <div className="min-w-0 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-brand-900">{insp.title}</span>
                      {insp._offline && (
                        <span className="shrink-0 rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-600">
                          Pending sync
                        </span>
                      )}
                      {flagged > 0 && (
                        <span className="shrink-0 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                          {flagged} flagged
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${CATEGORY_BADGE[insp.template_name] ?? "bg-brand-50 text-brand-500"}`}>
                        {insp.template_name}
                      </span>
                      {insp.site && (
                        <span className="text-xs text-brand-400">· {insp.site}</span>
                      )}
                    </div>
                    {/* Progress bar for in-progress */}
                    {insp.status === "in_progress" && (
                      <div className="mt-1.5 h-1 w-48 rounded-full bg-brand-100">
                        <div
                          className="h-1 rounded-full bg-brand-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Score */}
                  <div className="text-center text-sm">
                    <ScoreCircle score={insp.score} status={insp.status} pct={pct} />
                  </div>

                  {/* Conducted by */}
                  <div className="text-sm text-brand-600 truncate">{insp.conducted_by}</div>

                  {/* Started date */}
                  <div className="text-sm text-brand-400">{fmt(insp.started_at)}</div>

                  {/* Status */}
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE[insp.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {STATUS_LABEL[insp.status] ?? insp.status}
                    </span>
                    {insp.status === "in_progress" ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleArchive(insp.id); }}
                        title="Archive inspection"
                        className="ml-auto hidden rounded-md border border-gray-200 px-2 py-0.5 text-xs text-gray-400 hover:border-red-200 hover:bg-red-50 hover:text-red-500 group-hover:block"
                      >
                        Archive
                      </button>
                    ) : (
                      <svg className="ml-auto h-4 w-4 text-brand-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* ── Start Inspection Modal ─────────────────────────────────────── */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex w-full max-w-xl flex-col rounded-2xl bg-white shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-brand-100 px-6 py-4">
              <div>
                <h2 className="font-display text-lg font-bold text-brand-900">Start an inspection</h2>
                <p className="text-sm text-brand-400">Choose a template to begin</p>
              </div>
              <button
                onClick={() => { setShowPicker(false); setSelectedTpl(null); setSite(""); setStartError(""); setTplSearch(""); }}
                className="rounded-lg p-1.5 text-brand-400 hover:bg-brand-50 hover:text-brand-700"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-4" style={{ maxHeight: "calc(80vh - 130px)" }}>
              {/* Site input */}
              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-semibold text-brand-600">
                  Site / Location <span className="font-normal text-brand-400">(optional)</span>
                </label>
                <input
                  value={site}
                  onChange={(e) => setSite(e.target.value)}
                  placeholder="e.g. Offshore Platform A"
                  className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>

              {/* Search templates */}
              <div className="mb-3">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    value={tplSearch}
                    onChange={(e) => setTplSearch(e.target.value)}
                    placeholder="Search templates…"
                    className="w-full rounded-lg border border-brand-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                </div>
              </div>

              {/* Template list */}
              <div className="space-y-2">
                {filteredTpls.map((tpl) => {
                  const qCount = (tpl.form_schema.sections ?? []).reduce(
                    (n, s) => n + (s.questions?.length ?? 0),
                    0
                  );
                  return (
                    <button
                      key={tpl.id}
                      onClick={() => setSelectedTpl(tpl.id === selectedTpl?.id ? null : tpl)}
                      className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                        selectedTpl?.id === tpl.id
                          ? "border-brand-600 bg-brand-50"
                          : "border-brand-100 hover:border-brand-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-brand-900">{tpl.name}</span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          CATEGORY_BADGE[tpl.category] ?? "bg-gray-100 text-gray-600"
                        }`}>
                          {tpl.category}
                        </span>
                      </div>
                      {tpl.description && (
                        <p className="mt-1 text-xs text-brand-500 line-clamp-1">{tpl.description}</p>
                      )}
                      <p className="mt-1.5 text-xs text-brand-400">
                        {qCount} question{qCount !== 1 ? "s" : ""} · {tpl.form_schema.sections?.length ?? 0} section{(tpl.form_schema.sections?.length ?? 0) !== 1 ? "s" : ""}
                      </p>
                    </button>
                  );
                })}
                {filteredTpls.length === 0 && (
                  <p className="py-6 text-center text-sm text-brand-400">No templates found.</p>
                )}
              </div>
            </div>

            {startError && (
              <div className="mx-6 mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {startError}
              </div>
            )}

            {/* Modal footer */}
            <div className="flex items-center justify-between border-t border-brand-100 px-6 py-4">
              <button
                onClick={() => { setShowPicker(false); setSelectedTpl(null); setSite(""); setStartError(""); setTplSearch(""); }}
                className="rounded-lg border border-brand-200 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
              >
                Cancel
              </button>
              <button
                onClick={handleStart}
                disabled={!selectedTpl || starting}
                className="rounded-lg bg-brand-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-40"
              >
                {starting ? "Starting…" : "Start inspection →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
