import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Layout from "../components/Layout";
import { api } from "../api";
import type { User } from "../types";

// ─── Types ────────────────────────────────────────────────────────────────────

type ResponseType = "multiple_choice" | "text" | "number" | "temperature" | "date_time" | "checkbox" | "slider" | "media" | "location";

type Question = {
  id: string;
  text: string;
  type: ResponseType;
  required?: boolean;
  options?: string[];
  flagged_responses?: string[];
  score_map?: Record<string, number | null>;
  min?: number;
  max?: number;
  step?: number;
};

type Section = { id: string; title: string; questions: Question[] };
type Template = { sections: Section[] };

type AnswerState = {
  value: string | number | boolean | string[] | null;
  note: string;
  is_flagged: boolean;
  media_urls: string[];
};

type InspectionRecord = {
  id: string;
  template_id: string;
  template_name: string;
  title: string;
  site: string;
  conducted_by: string;
  status: string;
  answers: Record<string, AnswerState>;
  flagged_items: FlaggedItem[];
  total_questions: number;
  answered_questions: number;
  score: number | null;
};

type FlaggedItem = {
  question_id: string;
  question_text: string;
  answer_value: string;
  note: string;
  action_created: boolean;
  skipped: boolean;
};

type Props = { user: User | null; onLogout: () => void };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isFlagged(q: Question, value: string | number | boolean | string[] | null): boolean {
  if (!q.flagged_responses || value === null || value === undefined) return false;
  const strVal = Array.isArray(value) ? value.join(", ") : String(value);
  return q.flagged_responses.includes(strVal);
}

function allQids(template: Template): string[] {
  return template.sections.flatMap((s) => s.questions.map((q) => q.id));
}

function countAnswered(answers: Record<string, AnswerState>): number {
  return Object.values(answers).filter((a) => a.value !== null && a.value !== "" && !(Array.isArray(a.value) && a.value.length === 0)).length;
}

// ─── Response inputs ──────────────────────────────────────────────────────────

function MultipleChoice({ q, value, onChange }: { q: Question; value: string | null; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {(q.options ?? ["Yes", "No", "N/A"]).map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`rounded-xl border-2 px-5 py-2 text-sm font-semibold transition-all ${
            value === opt
              ? opt === "Yes" ? "border-green-500 bg-green-50 text-green-800"
                : opt === "No" ? "border-red-400 bg-red-50 text-red-800"
                : "border-brand-500 bg-brand-50 text-brand-800"
              : "border-brand-100 bg-white text-brand-700 hover:border-brand-300"
          }`}
        >
          {opt === "Yes" ? "✓ Yes" : opt === "No" ? "✗ No" : opt}
        </button>
      ))}
    </div>
  );
}

function TextInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={3}
      placeholder="Type your answer here…"
      className="w-full rounded-xl border border-brand-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
    />
  );
}

function NumberInput({ value, onChange, min, max }: { value: string; onChange: (v: string) => void; min?: number; max?: number }) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      min={min}
      max={max}
      placeholder="Enter number…"
      className="w-48 rounded-xl border border-brand-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
    />
  );
}

function TemperatureInput({ value, onChange, min, max }: { value: string; onChange: (v: string) => void; min?: number; max?: number }) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={min ?? -50}
        max={max ?? 200}
        step={0.1}
        placeholder="0.0"
        className="w-36 rounded-xl border border-brand-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
      />
      <span className="text-2xl font-bold text-brand-400">°C</span>
      {value && (
        <span className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
          Number(value) > 50 ? "bg-red-100 text-red-700" :
          Number(value) > 30 ? "bg-amber-100 text-amber-700" :
          "bg-blue-100 text-blue-700"
        }`}>
          {Number(value) > 50 ? "⚠ High" : Number(value) > 30 ? "Warm" : "Normal"}
        </span>
      )}
    </div>
  );
}

function DateTimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="datetime-local"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-xl border border-brand-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
    />
  );
}

function CheckboxInput({ q, value, onChange }: { q: Question; value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (opt: string) => {
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  };
  return (
    <div className="space-y-2">
      {(q.options ?? []).map((opt) => (
        <label key={opt} className="flex cursor-pointer items-center gap-3 rounded-xl border border-brand-100 bg-white px-4 py-2.5 transition-colors hover:bg-brand-50">
          <input
            type="checkbox"
            checked={value.includes(opt)}
            onChange={() => toggle(opt)}
            className="h-4 w-4 accent-brand-600"
          />
          <span className="text-sm text-brand-800">{opt}</span>
        </label>
      ))}
    </div>
  );
}

function SliderInput({ q, value, onChange }: { q: Question; value: string; onChange: (v: string) => void }) {
  const min = q.min ?? 0;
  const max = q.max ?? 10;
  const step = q.step ?? 1;
  const numVal = value !== "" ? Number(value) : min;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-brand-400">
        <span>{min}</span>
        <span className="text-2xl font-bold text-brand-700">{value !== "" ? numVal : "—"}</span>
        <span>{max}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value !== "" ? numVal : min}
        onChange={(e) => onChange(e.target.value)}
        className="w-full accent-brand-600"
      />
      <div className="flex justify-between text-xs text-brand-300">
        {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((n) => (
          <span key={n}>{n}</span>
        ))}
      </div>
    </div>
  );
}

function MediaInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border-2 border-dashed border-brand-200 bg-brand-50 p-6 text-center">
        <p className="text-3xl mb-2">📷</p>
        <p className="text-sm font-medium text-brand-600">Tap to attach photo, video or PDF</p>
        <p className="mt-1 text-xs text-brand-400">Max 20 MB · JPG, PNG, MP4, PDF</p>
        <button
          onClick={() => {
            const url = prompt("Enter file URL or description (demo):");
            if (url) onChange([...value, url]);
          }}
          className="mt-3 rounded-lg border border-brand-300 bg-white px-4 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50"
        >
          + Add Media
        </button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((url, i) => (
            <div key={i} className="flex items-center gap-1.5 rounded-lg bg-brand-100 px-2.5 py-1 text-xs text-brand-700">
              📎 {url.length > 25 ? url.slice(0, 25) + "…" : url}
              <button onClick={() => onChange(value.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LocationInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const getLocation = () => {
    if (!navigator.geolocation) { onChange("GPS not supported"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => onChange(`${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`),
      () => onChange("Location unavailable"),
    );
  };
  return (
    <div className="space-y-3">
      <button
        onClick={getLocation}
        className="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-5 py-3 text-sm font-semibold text-brand-700 hover:bg-brand-100"
      >
        📍 Pin GPS Location
      </button>
      {value && (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5">
          <span className="text-green-600">📍</span>
          <span className="text-sm font-medium text-green-800">{value}</span>
        </div>
      )}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Or type coordinates manually…"
        className="w-full rounded-xl border border-brand-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
      />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function InspectionConductPage({ user, onLogout }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [inspection, setInspection] = useState<InspectionRecord | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [noteOpen, setNoteOpen] = useState<string | null>(null);
  const [showFlagged, setShowFlagged] = useState(false);
  const [completing, setCompleting] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // load inspection + template
  useEffect(() => {
    if (!id) return;
    api<InspectionRecord>(`/api/inspections/${id}`).then((insp) => {
      setInspection(insp);
      const existing: Record<string, AnswerState> = {};
      for (const [k, v] of Object.entries(insp.answers ?? {})) {
        existing[k] = v as AnswerState;
      }
      setAnswers(existing);
    });
    api<{ template: Template; name: string }>(`/api/inspections/${id}/template`).then((res) => {
      setTemplate(res.template);
      setTemplateName(res.name);
    });
  }, [id]);

  // auto-save answers with debounce
  const saveAnswers = useCallback(
    (current: Record<string, AnswerState>) => {
      if (!id) return;
      api(`/api/inspections/${id}/answers`, {
        method: "PATCH",
        body: JSON.stringify({
          answers: Object.fromEntries(
            Object.entries(current).map(([k, v]) => [
              k,
              { value: v.value, note: v.note, is_flagged: v.is_flagged, media_urls: v.media_urls },
            ])
          ),
        }),
      }).catch(() => null);
    },
    [id]
  );

  const setAnswer = (qid: string, value: AnswerState["value"], q: Question) => {
    const flagged = isFlagged(q, value);
    setAnswers((prev) => {
      const next = {
        ...prev,
        [qid]: { ...prev[qid], value, is_flagged: flagged, note: prev[qid]?.note ?? "", media_urls: prev[qid]?.media_urls ?? [] },
      };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => saveAnswers(next), 800);
      return next;
    });
  };

  const setNote = (qid: string, note: string) => {
    setAnswers((prev) => {
      const next = { ...prev, [qid]: { ...prev[qid], note } };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => saveAnswers(next), 800);
      return next;
    });
  };

  const setMediaUrls = (qid: string, media_urls: string[]) => {
    setAnswers((prev) => {
      const next = { ...prev, [qid]: { ...prev[qid], media_urls } };
      saveAnswers(next);
      return next;
    });
  };

  const handleComplete = () => {
    if (!template) return;
    // Build flagged items list
    const flaggedItems: FlaggedItem[] = [];
    for (const section of template.sections) {
      for (const q of section.questions) {
        const ans = answers[q.id];
        if (ans?.is_flagged) {
          flaggedItems.push({
            question_id: q.id,
            question_text: q.text,
            answer_value: String(ans.value),
            note: ans.note ?? "",
            action_created: false,
            skipped: false,
          });
        }
      }
    }
    setInspection((prev) => prev ? { ...prev, flagged_items: flaggedItems } : prev);
    setShowFlagged(true);
  };

  const confirmComplete = async (finalFlagged: FlaggedItem[]) => {
    if (!id) return;
    setCompleting(true);
    try {
      await api(`/api/inspections/${id}/complete`, {
        method: "POST",
        body: JSON.stringify({ flagged_items: finalFlagged }),
      });
      navigate(`/inspections/report/${id}`);
    } catch {
      setCompleting(false);
    }
  };

  if (!inspection || !template) {
    return (
      <Layout user={user} title="Inspection" onLogout={onLogout}>
        <div className="flex h-64 items-center justify-center text-brand-400">Loading inspection…</div>
      </Layout>
    );
  }

  const sections = template.sections;
  const activeSection = sections[activeSectionIdx];
  const totalQ = allQids(template).length;
  const answeredQ = countAnswered(answers);
  const pct = totalQ > 0 ? Math.round((answeredQ / totalQ) * 100) : 0;
  const flaggedCount = Object.values(answers).filter((a) => a?.is_flagged).length;

  return (
    <Layout user={user} title={templateName || "Inspection"} onLogout={onLogout}>
      {/* Top progress bar */}
      <div className="mb-4 rounded-xl border border-brand-100 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-semibold text-brand-700">{inspection.title}{inspection.site ? ` — ${inspection.site}` : ""}</span>
          <span className="text-brand-400">{answeredQ} / {totalQ} answered</span>
        </div>
        <div className="h-2 w-full rounded-full bg-brand-100">
          <div className="h-2 rounded-full bg-brand-600 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs font-bold text-brand-600">{pct}% complete</span>
          {flaggedCount > 0 && (
            <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
              {flaggedCount} flagged
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-4">
        {/* Section sidebar */}
        <aside className="hidden w-48 shrink-0 md:block">
          <div className="rounded-xl border border-brand-100 bg-white p-2 shadow-sm">
            <p className="mb-2 px-2 text-xs font-bold uppercase tracking-wider text-brand-400">Sections</p>
            {sections.map((s, idx) => {
              const sAnswered = s.questions.filter((q) => {
                const a = answers[q.id];
                return a?.value !== null && a?.value !== "" && !(Array.isArray(a?.value) && a?.value.length === 0);
              }).length;
              const done = sAnswered === s.questions.length;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSectionIdx(idx)}
                  className={`mb-0.5 flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    idx === activeSectionIdx ? "bg-brand-700 text-white" : "text-brand-700 hover:bg-brand-50"
                  }`}
                >
                  <span className="mt-0.5 shrink-0 text-xs">
                    {done ? "✓" : `${sAnswered}/${s.questions.length}`}
                  </span>
                  <span className="leading-snug">{s.title}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Questions area */}
        <div className="min-w-0 flex-1 space-y-4">
          {/* Section header */}
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-brand-900">{activeSection.title}</h2>
            {/* Mobile section nav */}
            <div className="flex gap-1 md:hidden">
              <button
                onClick={() => setActiveSectionIdx(Math.max(0, activeSectionIdx - 1))}
                disabled={activeSectionIdx === 0}
                className="rounded-lg border border-brand-200 px-2 py-1 text-xs disabled:opacity-30"
              >
                ‹ Prev
              </button>
              <button
                onClick={() => setActiveSectionIdx(Math.min(sections.length - 1, activeSectionIdx + 1))}
                disabled={activeSectionIdx === sections.length - 1}
                className="rounded-lg border border-brand-200 px-2 py-1 text-xs disabled:opacity-30"
              >
                Next ›
              </button>
            </div>
          </div>

          {/* Questions */}
          {activeSection.questions.map((q, qIdx) => {
            const ans = answers[q.id] ?? { value: null, note: "", is_flagged: false, media_urls: [] };
            const answered = ans.value !== null && ans.value !== "" && !(Array.isArray(ans.value) && ans.value.length === 0);
            const flagged = ans.is_flagged;

            return (
              <div
                key={q.id}
                className={`rounded-xl border bg-white p-5 shadow-sm transition-all ${
                  flagged ? "border-red-300" : answered ? "border-green-200" : "border-brand-100"
                }`}
              >
                {/* Question header */}
                <div className="mb-3 flex items-start gap-2">
                  <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    flagged ? "bg-red-100 text-red-600" :
                    answered ? "bg-green-100 text-green-700" :
                    "bg-brand-100 text-brand-600"
                  }`}>
                    {flagged ? "!" : answered ? "✓" : qIdx + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold text-brand-900">
                      {q.text}
                      {q.required && <span className="ml-1 text-red-500">*</span>}
                    </p>
                    {flagged && (
                      <p className="mt-0.5 text-xs font-semibold text-red-600">⚑ This response has been flagged</p>
                    )}
                  </div>
                </div>

                {/* Response input */}
                <div className="mb-4">
                  {q.type === "multiple_choice" && (
                    <MultipleChoice
                      q={q}
                      value={(ans.value as string) ?? null}
                      onChange={(v) => setAnswer(q.id, v, q)}
                    />
                  )}
                  {q.type === "text" && (
                    <TextInput
                      value={(ans.value as string) ?? ""}
                      onChange={(v) => setAnswer(q.id, v, q)}
                    />
                  )}
                  {q.type === "number" && (
                    <NumberInput
                      value={(ans.value as string) ?? ""}
                      onChange={(v) => setAnswer(q.id, v, q)}
                      min={q.min}
                      max={q.max}
                    />
                  )}
                  {q.type === "temperature" && (
                    <TemperatureInput
                      value={(ans.value as string) ?? ""}
                      onChange={(v) => setAnswer(q.id, v, q)}
                      min={q.min}
                      max={q.max}
                    />
                  )}
                  {q.type === "date_time" && (
                    <DateTimeInput
                      value={(ans.value as string) ?? ""}
                      onChange={(v) => setAnswer(q.id, v, q)}
                    />
                  )}
                  {q.type === "checkbox" && (
                    <CheckboxInput
                      q={q}
                      value={(ans.value as string[]) ?? []}
                      onChange={(v) => setAnswer(q.id, v, q)}
                    />
                  )}
                  {q.type === "slider" && (
                    <SliderInput
                      q={q}
                      value={(ans.value as string) ?? ""}
                      onChange={(v) => setAnswer(q.id, v, q)}
                    />
                  )}
                  {q.type === "media" && (
                    <MediaInput
                      value={ans.media_urls ?? []}
                      onChange={(v) => setMediaUrls(q.id, v)}
                    />
                  )}
                  {q.type === "location" && (
                    <LocationInput
                      value={(ans.value as string) ?? ""}
                      onChange={(v) => setAnswer(q.id, v, q)}
                    />
                  )}
                </div>

                {/* Note + Action bar */}
                <div className="flex flex-wrap items-center gap-2 border-t border-brand-50 pt-3">
                  <button
                    onClick={() => setNoteOpen(noteOpen === q.id ? null : q.id)}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      ans.note ? "bg-amber-100 text-amber-700" : "border border-brand-200 text-brand-500 hover:bg-brand-50"
                    }`}
                  >
                    📝 {ans.note ? "Edit Note" : "Add Note"}
                  </button>
                  {q.type !== "media" && (
                    <button
                      onClick={() => {
                        const url = prompt("Enter media URL or description (demo):");
                        if (url) setMediaUrls(q.id, [...(ans.media_urls ?? []), url]);
                      }}
                      className="flex items-center gap-1 rounded-lg border border-brand-200 px-2.5 py-1.5 text-xs font-medium text-brand-500 hover:bg-brand-50"
                    >
                      📷 Attach Media
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const title = `${q.text} — ${ans.value}`;
                      navigate(`/actions?prefill=${encodeURIComponent(title)}`);
                    }}
                    className="flex items-center gap-1 rounded-lg border border-brand-200 px-2.5 py-1.5 text-xs font-medium text-brand-500 hover:bg-brand-50"
                  >
                    ⚡ Create Action
                  </button>
                  {ans.media_urls?.length > 0 && (
                    <span className="text-xs text-brand-400">{ans.media_urls.length} file{ans.media_urls.length > 1 ? "s" : ""} attached</span>
                  )}
                </div>

                {/* Note textarea */}
                {noteOpen === q.id && (
                  <div className="mt-3">
                    <textarea
                      value={ans.note}
                      onChange={(e) => setNote(q.id, e.target.value)}
                      rows={2}
                      placeholder="Add a note or observation for this question…"
                      className="w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                    />
                  </div>
                )}
              </div>
            );
          })}

          {/* Section navigation */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setActiveSectionIdx(Math.max(0, activeSectionIdx - 1))}
              disabled={activeSectionIdx === 0}
              className="rounded-lg border border-brand-200 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-30"
            >
              ← Previous Section
            </button>
            {activeSectionIdx < sections.length - 1 ? (
              <button
                onClick={() => setActiveSectionIdx(activeSectionIdx + 1)}
                className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
              >
                Next Section →
              </button>
            ) : (
              <button
                onClick={handleComplete}
                className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700"
              >
                Complete Inspection ✓
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Flagged Items Panel ────────────────────────────────────────── */}
      {showFlagged && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="rounded-t-2xl bg-red-600 px-6 py-4">
              <h2 className="font-display text-xl font-bold text-white">
                ⚑ Flagged Items Review
              </h2>
              <p className="mt-0.5 text-sm text-red-100">
                {inspection.flagged_items.length} item{inspection.flagged_items.length !== 1 ? "s" : ""} need attention
              </p>
            </div>

            <div className="max-h-96 overflow-y-auto p-6">
              {inspection.flagged_items.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-3xl mb-2">✅</p>
                  <p className="font-semibold text-brand-700">No flagged items!</p>
                  <p className="text-sm text-brand-400">All responses are within acceptable range.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {inspection.flagged_items.map((item, idx) => (
                    <FlaggedItemRow
                      key={item.question_id}
                      item={item}
                      idx={idx}
                      onCreateAction={() => {
                        const title = `${item.question_text} — ${item.answer_value}`;
                        navigate(`/actions?prefill=${encodeURIComponent(title)}`);
                      }}
                      onSkip={() => {
                        setInspection((prev) => {
                          if (!prev) return prev;
                          const updated = prev.flagged_items.map((f, i) =>
                            i === idx ? { ...f, skipped: true } : f
                          );
                          return { ...prev, flagged_items: updated };
                        });
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-brand-100 px-6 py-4">
              <button
                onClick={() => setShowFlagged(false)}
                className="text-sm text-brand-500 hover:text-brand-700"
              >
                ← Back to Inspection
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    // Mark all unresolved as skipped
                    setInspection((prev) => {
                      if (!prev) return prev;
                      return {
                        ...prev,
                        flagged_items: prev.flagged_items.map((f) => ({ ...f, skipped: true })),
                      };
                    });
                  }}
                  className="rounded-lg border border-brand-200 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
                >
                  Skip All
                </button>
                <button
                  onClick={() => confirmComplete(inspection.flagged_items)}
                  disabled={completing}
                  className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {completing ? "Completing…" : "Complete Inspection ✓"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

// ─── Flagged item row ─────────────────────────────────────────────────────────

function FlaggedItemRow({
  item,
  idx,
  onCreateAction,
  onSkip,
}: {
  item: FlaggedItem;
  idx: number;
  onCreateAction: () => void;
  onSkip: () => void;
}) {
  return (
    <div className={`rounded-xl border p-4 ${item.skipped ? "border-gray-200 bg-gray-50" : "border-red-200 bg-red-50"}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          item.skipped ? "bg-gray-200 text-gray-500" : "bg-red-200 text-red-700"
        }`}>
          {idx + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-brand-900">{item.question_text}</p>
          <p className="mt-0.5 text-sm text-brand-500">
            Answer: <span className="font-semibold text-red-700">"{item.answer_value}"</span>
          </p>
          {item.note && <p className="mt-0.5 text-xs text-brand-400">Note: {item.note}</p>}
        </div>
        {!item.skipped && (
          <div className="flex shrink-0 flex-col gap-1.5">
            <button
              onClick={onCreateAction}
              className="rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-800 whitespace-nowrap"
            >
              ⚡ Create Action
            </button>
            <button
              onClick={onSkip}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 whitespace-nowrap"
            >
              ⏭ Skip
            </button>
          </div>
        )}
        {item.skipped && (
          <span className="shrink-0 rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-500">Skipped</span>
        )}
      </div>
    </div>
  );
}
