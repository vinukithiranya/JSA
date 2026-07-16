import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import type { User } from "../types";

// ─── Types ────────────────────────────────────────────────────────────────────

type TitlePageType = "site" | "inspection_date" | "person" | "inspection_location" | "document_number" | "asset" | "company";
type InspectionType = "text" | "number" | "checkbox" | "datetime" | "media" | "slider" | "annotation" | "signature" | "location" | "instruction" | "multiple_choice" | "table";
type ResponseType = TitlePageType | InspectionType;
type TableColumnType = "text" | "number" | "multiple_choice" | "checkbox";
type OptionColor = "red" | "orange" | "yellow" | "green" | "blue" | "purple" | "gray";
type LogicTrigger = "ask_questions" | "require_action" | "require_evidence" | "notify" | "skip_to_complete";
type LogicOp = "is" | "is_not" | "is_selected" | "is_not_selected" | "is_one_of" | "is_not_one_of"
  | "lt" | "lte" | "eq" | "neq" | "gte" | "gt" | "between"
  | "checked" | "not_checked" | "exists" | "not_exists";

interface OptionMeta { id: string; label: string; color: OptionColor; is_flagged: boolean; score: number | null }
interface TableColumn { id: string; label: string; type: TableColumnType; options?: string[] }
interface LogicRule {
  id: string; op: LogicOp; value: string; value2?: string;
  trigger: LogicTrigger;
  evidence_notes?: boolean; evidence_media?: boolean;
  notify_msg?: string; notify_timing?: "immediately" | "on_completion";
}
interface Question {
  id: string; text: string; type: ResponseType; required: boolean;
  multiple_selection?: boolean;
  options?: string[]; option_meta?: OptionMeta[];
  flagged_responses?: string[]; score_map?: Record<string, number | null>;
  min?: number; max?: number; step?: number;
  table_columns?: TableColumn[];
  logic_rules?: LogicRule[];
  nested_questions?: Question[];
  text_format?: "short" | "long";
  number_format?: "number" | "percentage" | "cost";
  number_unit?: string;
  include_date?: boolean;
  include_time?: boolean;
  doc_number_format?: string;
  annotation_image?: string;
  question_score?: number | null;
}
interface Section {
  id: string; title: string; description?: string; collapsed: boolean;
  is_title_page?: boolean; is_completion?: boolean; questions: Question[];
  score_enabled?: boolean;
}
interface FormSchema { sections: Section[]; header_image?: string }

// ─── RightPanelState ──────────────────────────────────────────────────────────

type RightPanelState =
  | { type: "mc_library" }
  | { type: "mc" }
  | { type: "table" }
  | { type: "logic_config"; ruleId: string }
  | { type: "slider_range" }
  | { type: "doc_number_format" }
  | { type: "text_format" }
  | { type: "number_format" }
  | null;

// ─── Constants ────────────────────────────────────────────────────────────────

const TITLE_TYPES: { value: TitlePageType; label: string }[] = [
  { value: "site", label: "Site" },
  { value: "inspection_date", label: "Inspection date" },
  { value: "person", label: "Person" },
  { value: "inspection_location", label: "Inspection location" },
  { value: "document_number", label: "Document number" },
  { value: "asset", label: "Asset" },
  { value: "company", label: "Company" },
];

const INSPECT_TYPES: { value: InspectionType; label: string; icon: string }[] = [
  { value: "multiple_choice", label: "Multiple choice", icon: "⊙" },
  { value: "text", label: "Text answer", icon: "T" },
  { value: "number", label: "Number", icon: "#" },
  { value: "checkbox", label: "Checkbox", icon: "☑" },
  { value: "datetime", label: "Date & Time", icon: "📅" },
  { value: "media", label: "Media", icon: "📷" },
  { value: "slider", label: "Slider", icon: "⟷" },
  { value: "annotation", label: "Annotation", icon: "✏" },
  { value: "signature", label: "Signature", icon: "✍" },
  { value: "location", label: "Location", icon: "📍" },
  { value: "instruction", label: "Instruction", icon: "ℹ" },
  { value: "table", label: "Table", icon: "⊞" },
];

const OPT_COLORS: { v: OptionColor; dot: string; chip: string }[] = [
  { v: "red", dot: "bg-red-500", chip: "bg-red-100 text-red-700" },
  { v: "orange", dot: "bg-orange-500", chip: "bg-orange-100 text-orange-700" },
  { v: "yellow", dot: "bg-yellow-400", chip: "bg-yellow-100 text-yellow-700" },
  { v: "green", dot: "bg-green-500", chip: "bg-green-100 text-green-700" },
  { v: "blue", dot: "bg-blue-500", chip: "bg-blue-100 text-blue-700" },
  { v: "purple", dot: "bg-purple-500", chip: "bg-purple-100 text-purple-700" },
  { v: "gray", dot: "bg-gray-400", chip: "bg-gray-100 text-gray-600" },
];

const TRIGGER_STYLE: Record<LogicTrigger, string> = {
  ask_questions: "bg-indigo-100 text-indigo-700",
  require_action: "bg-amber-100 text-amber-700",
  require_evidence: "bg-sky-100 text-sky-700",
  notify: "bg-teal-100 text-teal-700",
  skip_to_complete: "bg-red-100 text-red-700",
};

const TRIGGER_LABEL: Record<LogicTrigger, string> = {
  ask_questions: "Ask questions",
  require_action: "Require action",
  require_evidence: "Require evidence",
  notify: "Notify",
  skip_to_complete: "Skip to complete",
};

const CATEGORIES = ["Safety", "Quality", "Environmental", "Maintenance", "Operations", "Training", "JSA"];

// ─── MC Preset Response Sets ──────────────────────────────────────────────────

const MC_PRESETS: { label: string; opts: { label: string; color: OptionColor; is_flagged: boolean }[] }[] = [
  { label: "Good / Fair / Poor / N/A", opts: [
    { label: "Good",  color: "green",  is_flagged: false },
    { label: "Fair",  color: "yellow", is_flagged: false },
    { label: "Poor",  color: "red",    is_flagged: true  },
    { label: "N/A",   color: "gray",   is_flagged: false },
  ]},
  { label: "Yes / No / N/A", opts: [
    { label: "Yes",   color: "green", is_flagged: false },
    { label: "No",    color: "red",   is_flagged: true  },
    { label: "N/A",   color: "gray",  is_flagged: false },
  ]},
  { label: "Pass / Fail / N/A", opts: [
    { label: "Pass",  color: "green", is_flagged: false },
    { label: "Fail",  color: "red",   is_flagged: true  },
    { label: "N/A",   color: "gray",  is_flagged: false },
  ]},
  { label: "Safe / At Risk / N/A", opts: [
    { label: "Safe",     color: "green",  is_flagged: false },
    { label: "At Risk",  color: "orange", is_flagged: true  },
    { label: "N/A",      color: "gray",   is_flagged: false },
  ]},
  { label: "Compliant / Non-Compliant / N/A", opts: [
    { label: "Compliant",     color: "green", is_flagged: false },
    { label: "Non-Compliant", color: "red",   is_flagged: true  },
    { label: "N/A",           color: "gray",  is_flagged: false },
  ]},
  { label: "Sound – No Issues / Issues Found", opts: [
    { label: "Sound – No Issues", color: "green",  is_flagged: false },
    { label: "Issues Found",      color: "orange", is_flagged: true  },
    { label: "N/A",               color: "gray",   is_flagged: false },
  ]},
  { label: "Satisfactory / Unsatisfactory", opts: [
    { label: "Satisfactory",   color: "green", is_flagged: false },
    { label: "Unsatisfactory", color: "red",   is_flagged: true  },
    { label: "N/A",            color: "gray",  is_flagged: false },
  ]},
  { label: "Positive / Negative", opts: [
    { label: "Positive", color: "green", is_flagged: false },
    { label: "Negative", color: "red",   is_flagged: true  },
    { label: "N/A",      color: "gray",  is_flagged: false },
  ]},
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 10);

function typeLabel(t: ResponseType): string {
  return [...TITLE_TYPES, ...INSPECT_TYPES].find(x => x.value === t)?.label ?? t;
}

function chipClass(color: OptionColor) {
  return OPT_COLORS.find(c => c.v === color)?.chip ?? "bg-gray-100 text-gray-600";
}

function defaultTableColumns(): TableColumn[] {
  return [
    { id: uid(), label: "Item", type: "text" },
    { id: uid(), label: "Status", type: "multiple_choice", options: ["Yes", "No", "N/A"] },
    { id: uid(), label: "Notes", type: "text" },
  ];
}

function defaultOptionMeta(): OptionMeta[] {
  return [
    { id: uid(), label: "Yes", color: "green", is_flagged: false, score: null },
    { id: uid(), label: "No", color: "red", is_flagged: true, score: null },
    { id: uid(), label: "N/A", color: "gray", is_flagged: false, score: null },
  ];
}

function makeDefaultSchema(): FormSchema {
  return {
    sections: [
      { id: uid(), title: "Title Page", collapsed: false, is_title_page: true, questions: [
        { id: uid(), text: "Site", type: "site", required: true },
        { id: uid(), text: "Conducted by", type: "person", required: true },
        { id: uid(), text: "Date & Time", type: "inspection_date", required: true },
      ]},
      { id: uid(), title: "Section 1", collapsed: false, questions: [] },
      { id: uid(), title: "Completion", collapsed: false, is_completion: true, questions: [
        { id: uid(), text: "Completion signature", type: "signature", required: true },
      ]},
    ],
  };
}

function syncOptionArrays(q: Question): Question {
  if (!q.option_meta) return q;
  return {
    ...q,
    options: q.option_meta.map(m => m.label),
    flagged_responses: q.option_meta.filter(m => m.is_flagged).map(m => m.label),
    score_map: Object.fromEntries(q.option_meta.map(m => [m.label, m.score])),
  };
}

// ─── Type Picker Panel ────────────────────────────────────────────────────────

function TypePickerPanel({ isTitlePage, current, onSelect, onClose }: {
  isTitlePage: boolean; current: ResponseType;
  onSelect: (t: ResponseType) => void; onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const types = isTitlePage ? TITLE_TYPES : INSPECT_TYPES;
  const filtered = types.filter(t => t.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="absolute left-0 top-full z-50 mt-1 w-72 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.14)]">
      <div className="border-b border-gray-100 px-3 py-2.5">
        <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search response types…"
          className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-100 transition" />
      </div>
      <div className="max-h-72 overflow-y-auto py-1">
        {filtered.map(t => (
          <button key={t.value} onClick={() => { onSelect(t.value); onClose(); }}
            className={`flex w-full items-center justify-between px-3.5 py-2.5 text-sm transition hover:bg-brand-50 ${current === t.value ? "font-semibold text-brand-700 bg-brand-50/70" : "text-gray-800"}`}>
            <span className="flex items-center gap-2.5">
              {(t as { icon?: string }).icon && <span className="w-5 text-center text-base">{(t as { icon?: string }).icon}</span>}
              {t.label}
            </span>
            {current === t.value && (
              <svg className="h-3.5 w-3.5 text-brand-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── MC Options Right Panel ────────────────────────────────────────────────────

function MCOptionsPanel({ meta, onChange, onClose, onBack }: {
  meta: OptionMeta[]; onChange: (m: OptionMeta[]) => void; onClose: () => void;
  onBack?: () => void;
}) {
  const [items, setItems] = useState<OptionMeta[]>(() => meta.length ? meta : defaultOptionMeta());
  const [scoring, setScoring] = useState(() => meta.some(m => m.score !== null));

  function update(id: string, patch: Partial<OptionMeta>) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
  }
  function add() {
    setItems(prev => [...prev, { id: uid(), label: "New option", color: "gray" as OptionColor, is_flagged: false, score: null }]);
  }
  function remove(id: string) {
    setItems(prev => prev.filter(i => i.id !== id));
  }
  function move(idx: number, dir: -1 | 1) {
    setItems(prev => {
      const next = [...prev];
      const t = idx + dir;
      if (t < 0 || t >= next.length) return prev;
      [next[idx], next[t]] = [next[t], next[idx]];
      return next;
    });
  }
  function saveAndApply() { onChange(items); if (onBack) onBack(); else onClose(); }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          {onBack && (
            <button onClick={onBack} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
          )}
          <div>
            <p className="font-display text-sm font-semibold text-gray-900">Multiple choice responses</p>
            <p className="text-xs text-gray-400">e.g. Yes, No, N/A</p>
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-1.5">
          <input type="checkbox" checked={scoring} onChange={e => setScoring(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-gray-300 accent-brand-600" />
          <span className="text-xs font-semibold text-gray-600">Scoring</span>
        </label>
      </div>

      {/* Response label */}
      <div className="border-b border-gray-100 px-4 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Response</p>
      </div>

      {/* Options list */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
        {items.map((item, idx) => (
          <div key={item.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {/* Row 1: drag + label + color dot (right) */}
            <div className="flex items-center gap-2 px-2 py-2">
              <div className="flex shrink-0 flex-col gap-0.5 cursor-grab">
                <button onClick={() => move(idx, -1)} disabled={idx === 0}
                  className="text-gray-300 hover:text-gray-500 disabled:opacity-20 transition">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                </button>
                <button onClick={() => move(idx, 1)} disabled={idx === items.length - 1}
                  className="text-gray-300 hover:text-gray-500 disabled:opacity-20 transition">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </button>
              </div>
              <input value={item.label} onChange={e => update(item.id, { label: e.target.value })}
                className="min-w-0 flex-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-100 transition" />
              {/* Color dot — right side */}
              <div className="relative shrink-0 group/color">
                <button className={`h-5 w-5 rounded-full ${OPT_COLORS.find(c => c.v === item.color)?.dot ?? "bg-gray-400"} ring-2 ring-white shadow-sm hover:ring-gray-300 transition`} />
                <div className="absolute right-0 top-full z-50 mt-1 hidden w-40 flex-wrap gap-1 rounded-lg border border-gray-200 bg-white p-2 shadow-lg group-hover/color:flex">
                  {OPT_COLORS.map(c => (
                    <button key={c.v} onClick={() => update(item.id, { color: c.v })}
                      className={`h-5 w-5 rounded-full ${c.dot} ${item.color === c.v ? "ring-2 ring-brand-500 ring-offset-1" : ""}`} />
                  ))}
                </div>
              </div>
            </div>

            {/* Row 2: flagged + score + delete */}
            <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-3 py-1.5">
              <label className="flex cursor-pointer items-center gap-1.5">
                <input type="checkbox" checked={item.is_flagged} onChange={e => update(item.id, { is_flagged: e.target.checked })}
                  className="h-3.5 w-3.5 rounded border-gray-300 accent-red-500" />
                <span className={`text-xs font-medium ${item.is_flagged ? "text-red-600" : "text-gray-500"}`}>
                  {item.is_flagged ? "Marked as flagged" : "Mark as flagged"}
                </span>
              </label>
              <div className="flex items-center gap-1.5">
                {scoring ? (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-400">Score:</span>
                    <input type="number" placeholder="/" value={item.score ?? ""}
                      onChange={e => update(item.id, { score: e.target.value === "" ? null : Number(e.target.value) })}
                      className="w-14 rounded-lg border border-gray-200 px-1.5 py-0.5 text-xs text-center outline-none focus:border-brand-400 transition" />
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">
                    Score: {item.score !== null && item.score !== undefined ? item.score : "/"}
                  </span>
                )}
                <button onClick={() => remove(item.id)}
                  className="rounded p-1 text-gray-300 hover:bg-red-50 hover:text-red-500 transition">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          </div>
        ))}

        <button onClick={add}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-300 py-2.5 text-sm font-medium text-gray-500 transition hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          + Add Response
        </button>
      </div>

      {/* Footer */}
      <div className="flex gap-2 border-t border-gray-100 px-4 py-3">
        <button onClick={onBack ?? onClose}
          className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50">
          Cancel
        </button>
        <button onClick={saveAndApply}
          className="flex-1 rounded-lg bg-brand-700 py-2 text-sm font-semibold text-white transition hover:bg-brand-800">
          Save and apply
        </button>
      </div>
    </div>
  );
}

// ─── MC Library Panel ─────────────────────────────────────────────────────────

function MCLibraryPanel({ question, onApplyAndEdit, onEditCurrent, onClose }: {
  question: Question;
  onApplyAndEdit: (meta: OptionMeta[]) => void;
  onEditCurrent: () => void;
  onClose: () => void;
}) {
  const hasOptions = (question.option_meta?.length ?? 0) > 0;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <p className="font-display text-sm font-semibold text-gray-900">Multiple choice responses</p>
        <div className="flex items-center gap-1.5">
          <button onClick={() => onApplyAndEdit(defaultOptionMeta())}
            className="flex items-center gap-1 rounded-lg bg-brand-50 px-2.5 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Responses
          </button>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Current options */}
        {hasOptions && (
          <div className="border-b border-gray-100 px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Current</p>
              <button onClick={onEditCurrent}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50 transition">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                Edit
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {question.option_meta!.map(m => (
                <span key={m.id} className={`rounded-full px-2 py-0.5 text-xs font-medium ${chipClass(m.color)}`}>{m.label}</span>
              ))}
            </div>
          </div>
        )}

        {/* Presets */}
        <div className="px-4 pt-3 pb-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Preset response sets</p>
        </div>
        {MC_PRESETS.map(preset => (
          <div key={preset.label}
            className="group flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition cursor-pointer"
            onClick={() => {
              const meta: OptionMeta[] = preset.opts.map(o => ({ id: uid(), label: o.label, color: o.color, is_flagged: o.is_flagged, score: null }));
              onApplyAndEdit(meta);
            }}>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1">
                {preset.opts.slice(0, 3).map(o => {
                  const cc = OPT_COLORS.find(c => c.v === o.color);
                  return (
                    <span key={o.label} className={`rounded-full px-2 py-0.5 text-xs font-medium ${cc?.chip ?? "bg-gray-100 text-gray-600"}`}>
                      {o.label}
                    </span>
                  );
                })}
                {preset.opts.length > 3 && (
                  <span className="text-xs text-gray-400">+{preset.opts.length - 3}</span>
                )}
              </div>
            </div>
            <svg className="h-4 w-4 shrink-0 text-gray-300 group-hover:text-brand-500 transition" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Logic Configure Panel ────────────────────────────────────────────────────

function LogicConfigPanel({ rule, onUpdate, onClose }: {
  rule: LogicRule; onUpdate: (r: LogicRule) => void; onClose: () => void;
}) {
  const [draft, setDraft] = useState(rule);
  function save() { onUpdate(draft); onClose(); }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-brand-100 px-5 py-3.5">
        <p className="font-display text-sm font-semibold text-brand-900">
          {rule.trigger === "require_evidence" ? "Require evidence" : "Notify"}
        </p>
        <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-5">
        {rule.trigger === "require_evidence" ? (
          <div>
            <p className="mb-4 text-sm text-gray-600">Choose the evidence that'll be required when this answer is selected.</p>
            <label className="mb-2 flex cursor-pointer items-center gap-3 rounded-xl border border-brand-100 p-3.5 transition hover:bg-brand-50">
              <input type="checkbox" checked={draft.evidence_notes ?? false}
                onChange={e => setDraft(d => ({ ...d, evidence_notes: e.target.checked }))}
                className="h-4 w-4 rounded border-brand-300 text-brand-600 accent-brand-600" />
              <div>
                <p className="text-sm font-medium text-brand-900">Notes</p>
                <p className="text-xs text-gray-500">Require a written note with context</p>
              </div>
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-brand-100 p-3.5 transition hover:bg-brand-50">
              <input type="checkbox" checked={draft.evidence_media ?? false}
                onChange={e => setDraft(d => ({ ...d, evidence_media: e.target.checked }))}
                className="h-4 w-4 rounded border-brand-300 text-brand-600 accent-brand-600" />
              <div>
                <p className="text-sm font-medium text-brand-900">Media</p>
                <p className="text-xs text-gray-500">Require a photo or video attachment</p>
              </div>
            </label>
          </div>
        ) : (
          <div>
            <p className="mb-4 text-sm text-gray-600">Configure who gets notified and when.</p>
            <div className="mb-4">
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Message</label>
              <textarea value={draft.notify_msg ?? ""} rows={3}
                onChange={e => setDraft(d => ({ ...d, notify_msg: e.target.value }))}
                placeholder="Describe the notification message…"
                className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 resize-none transition" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">When to notify</label>
              {(["immediately", "on_completion"] as const).map(v => (
                <label key={v} className="mb-2 flex cursor-pointer items-center gap-3 rounded-xl border border-brand-100 p-3 transition hover:bg-brand-50">
                  <input type="radio" name="notify_timing" value={v}
                    checked={(draft.notify_timing ?? "immediately") === v}
                    onChange={() => setDraft(d => ({ ...d, notify_timing: v }))}
                    className="accent-brand-600" />
                  <span className="text-sm font-medium text-brand-900 capitalize">
                    {v === "immediately" ? "Immediately" : "On inspection completion"}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-2 border-t border-brand-100 px-5 py-3.5">
        <button onClick={onClose} className="flex-1 rounded-lg border border-brand-200 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-50">Cancel</button>
        <button onClick={save} className="flex-1 rounded-lg bg-brand-700 py-2 text-sm font-semibold text-white transition hover:bg-brand-800">Save and apply</button>
      </div>
    </div>
  );
}

// ─── Slider Range Panel ───────────────────────────────────────────────────────

function SliderRangePanel({ question, onSave, onClose }: {
  question: Question; onSave: (min: number, max: number, step: number) => void; onClose: () => void;
}) {
  const [minVal, setMinVal] = useState(question.min ?? 0);
  const [maxVal, setMaxVal] = useState(question.max ?? 10);
  const [stepVal, setStepVal] = useState(question.step ?? 1);
  const pct = Math.round(((minVal + maxVal) / 2 - minVal) / (maxVal - minVal || 1) * 100);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-brand-100 px-5 py-3.5">
        <div>
          <p className="font-display text-sm font-semibold text-brand-900">Slider</p>
          <p className="text-xs text-gray-500">You can define the range of response with the slider.</p>
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-5">
        {/* Visual preview */}
        <div className="mb-6 rounded-xl border border-brand-100 bg-brand-50/50 p-4">
          <p className="mb-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Preview</p>
          <div className="relative h-2 rounded-full bg-brand-100">
            <div className="absolute left-0 top-0 h-2 rounded-full bg-brand-400" style={{ width: `${pct}%` }} />
            <div className="absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-brand-600 shadow-sm border-2 border-white" style={{ left: `calc(${pct}% - 8px)` }} />
          </div>
          <div className="mt-2 flex justify-between text-xs text-gray-500">
            <span>{minVal}</span><span>{maxVal}</span>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Min</label>
            <input type="number" value={minVal} onChange={e => setMinVal(Number(e.target.value))}
              className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Max</label>
            <input type="number" value={maxVal} onChange={e => setMaxVal(Number(e.target.value))}
              className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Increment</label>
            <input type="number" value={stepVal} min={1} onChange={e => setStepVal(Number(e.target.value))}
              className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition" />
          </div>
        </div>
      </div>
      <div className="flex gap-2 border-t border-brand-100 px-5 py-3.5">
        <button onClick={onClose} className="flex-1 rounded-lg border border-brand-200 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-50">Cancel</button>
        <button onClick={() => { onSave(minVal, maxVal, stepVal); onClose(); }}
          className="flex-1 rounded-lg bg-brand-700 py-2 text-sm font-semibold text-white transition hover:bg-brand-800">Save and apply</button>
      </div>
    </div>
  );
}

// ─── Doc Number Format Panel ──────────────────────────────────────────────────

function DocNumberFormatPanel({ question, onSave, onClose }: {
  question: Question; onSave: (fmt: string) => void; onClose: () => void;
}) {
  const [fmt, setFmt] = useState(question.doc_number_format ?? "[number]");
  const preview = fmt.replace("[number]", "000001");
  const preview2 = fmt.replace("[number]", "000002");
  const preview3 = fmt.replace("[number]", "000003");

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-brand-100 px-5 py-3.5">
        <div>
          <p className="font-display text-sm font-semibold text-brand-900">Document number format</p>
          <p className="text-xs text-gray-500">Each inspection generates an individual number.</p>
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <p className="mb-4 text-sm text-gray-600">You can customize the format below:</p>
        <div className="mb-4 rounded-xl border border-brand-100 bg-brand-50/50 p-4">
          <p className="mb-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">Preview</p>
          <p className="text-sm text-brand-700 font-mono">{preview}, {preview2}, {preview3}</p>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Document number format</label>
          <input value={fmt} onChange={e => setFmt(e.target.value)}
            className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition" />
          <p className="mt-2 text-xs text-gray-500">
            Customize the document number format by inserting text. For example, "Safety R[number]" generates "Safety R000001, Safety R000002, …".
          </p>
        </div>
      </div>
      <div className="flex gap-2 border-t border-brand-100 px-5 py-3.5">
        <button onClick={onClose} className="flex-1 rounded-lg border border-brand-200 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-50">Cancel</button>
        <button onClick={() => { onSave(fmt); onClose(); }}
          className="flex-1 rounded-lg bg-brand-700 py-2 text-sm font-semibold text-white transition hover:bg-brand-800">Save and apply</button>
      </div>
    </div>
  );
}

// ─── Text Format Panel ────────────────────────────────────────────────────────

function TextFormatPanel({ question, onSave, onClose }: {
  question: Question; onSave: (fmt: "short" | "long") => void; onClose: () => void;
}) {
  const [fmt, setFmt] = useState<"short" | "long">(question.text_format ?? "short");

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-brand-100 px-5 py-3.5">
        <p className="font-display text-sm font-semibold text-brand-900">Text format</p>
        <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-5">
        {(["short", "long"] as const).map(v => (
          <label key={v} className="mb-3 flex cursor-pointer items-center gap-3 rounded-xl border border-brand-100 p-3.5 transition hover:bg-brand-50">
            <input type="radio" name="text_format" value={v} checked={fmt === v} onChange={() => setFmt(v)} className="accent-brand-600" />
            <span className="text-sm font-medium text-brand-900">{v === "short" ? "Short answer" : "Long answer"}</span>
          </label>
        ))}
      </div>
      <div className="flex gap-2 border-t border-brand-100 px-5 py-3.5">
        <button onClick={onClose} className="flex-1 rounded-lg border border-brand-200 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-50">Cancel</button>
        <button onClick={() => { onSave(fmt); onClose(); }}
          className="flex-1 rounded-lg bg-brand-700 py-2 text-sm font-semibold text-white transition hover:bg-brand-800">Save and apply</button>
      </div>
    </div>
  );
}

// ─── Number Format Panel ──────────────────────────────────────────────────────

function NumberFormatPanel({ question, onSave, onClose }: {
  question: Question; onSave: (fmt: "number" | "percentage" | "cost", unit: string) => void; onClose: () => void;
}) {
  const [fmt, setFmt] = useState<"number" | "percentage" | "cost">(question.number_format ?? "number");
  const [unit, setUnit] = useState(question.number_unit ?? "");

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-brand-100 px-5 py-3.5">
        <p className="font-display text-sm font-semibold text-brand-900">Number format</p>
        <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="mb-5">
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Format</label>
          <select value={fmt} onChange={e => setFmt(e.target.value as "number" | "percentage" | "cost")}
            className="w-full rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition">
            <option value="number">Number</option>
            <option value="percentage">Percentage</option>
            <option value="cost">Cost</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Unit</label>
          <input value={unit} onChange={e => setUnit(e.target.value)}
            placeholder="e.g. km, kg, °C"
            className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition" />
        </div>
      </div>
      <div className="flex gap-2 border-t border-brand-100 px-5 py-3.5">
        <button onClick={onClose} className="flex-1 rounded-lg border border-brand-200 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-50">Cancel</button>
        <button onClick={() => { onSave(fmt, unit); onClose(); }}
          className="flex-1 rounded-lg bg-brand-700 py-2 text-sm font-semibold text-white transition hover:bg-brand-800">Save and apply</button>
      </div>
    </div>
  );
}

// ─── Table Columns Right Panel ─────────────────────────────────────────────────

function TableColumnsPanel({ columns, onChange, onClose }: {
  columns: TableColumn[]; onChange: (cols: TableColumn[]) => void; onClose: () => void;
}) {
  const [items, setItems] = useState<TableColumn[]>(columns);

  function update(id: string, patch: Partial<TableColumn>) {
    const next = items.map(c => c.id === id ? { ...c, ...patch } : c);
    setItems(next); onChange(next);
  }
  function add() {
    const next = [...items, { id: uid(), label: "Column", type: "text" as TableColumnType }];
    setItems(next); onChange(next);
  }
  function remove(id: string) {
    if (items.length <= 1) return;
    const next = items.filter(c => c.id !== id);
    setItems(next); onChange(next);
  }
  function move(idx: number, dir: -1 | 1) {
    const next = [...items];
    const t = idx + dir;
    if (t < 0 || t >= next.length) return;
    [next[idx], next[t]] = [next[t], next[idx]];
    setItems(next); onChange(next);
  }

  const COL_TYPE_ICON: Record<TableColumnType, string> = {
    text: "T", number: "#", multiple_choice: "⊙", checkbox: "☑",
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-brand-100 px-5 py-3.5">
        <div>
          <p className="font-display text-sm font-semibold text-brand-900">Table columns</p>
          <p className="text-xs text-gray-500">Define headers and response types</p>
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {items.map((col, idx) => (
          <div key={col.id} className="group mb-3">
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition">
                <button onClick={() => move(idx, -1)} disabled={idx === 0} className="text-gray-300 hover:text-gray-600 disabled:opacity-20">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                </button>
                <button onClick={() => move(idx, 1)} disabled={idx === items.length - 1} className="text-gray-300 hover:text-gray-600 disabled:opacity-20">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </button>
              </div>
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-600">
                {idx + 1}
              </span>
              <input value={col.label} onChange={e => update(col.id, { label: e.target.value })}
                placeholder="Column name"
                className="min-w-0 flex-1 rounded-lg border border-brand-200 px-2.5 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition" />
              <select value={col.type} onChange={e => update(col.id, { type: e.target.value as TableColumnType, options: e.target.value === "multiple_choice" ? ["Yes", "No", "N/A"] : undefined })}
                className="rounded-lg border border-brand-200 bg-white px-2 py-1.5 text-xs font-medium text-brand-700 outline-none focus:border-brand-500 transition">
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="multiple_choice">Choice</option>
                <option value="checkbox">Checkbox</option>
              </select>
              <button onClick={() => remove(col.id)} disabled={items.length <= 1}
                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 disabled:opacity-10 transition">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {col.type === "multiple_choice" && (
              <div className="ml-7 mt-1.5 border-l-2 border-indigo-100 pl-3">
                <p className="mb-1 text-xs text-gray-500">Options — comma separated</p>
                <input
                  value={(col.options ?? []).join(", ")}
                  onChange={e => update(col.id, { options: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                  placeholder="Yes, No, N/A"
                  className="w-full rounded-lg border border-brand-200 px-2.5 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition" />
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {(col.options ?? []).map(opt => (
                    <span key={opt} className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-600">{opt}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="ml-7 mt-1 flex items-center gap-1 text-xs text-gray-400">
              <span className="font-mono">{COL_TYPE_ICON[col.type]}</span>
              <span>{col.type === "text" ? "Free text" : col.type === "number" ? "Numeric" : col.type === "multiple_choice" ? "Multiple choice" : "Checkbox"}</span>
            </div>
          </div>
        ))}

        <button onClick={add}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 py-2.5 text-sm font-medium text-gray-600 transition hover:border-brand-400 hover:bg-brand-50/70 hover:text-brand-700">
          + Add Column
        </button>
      </div>

      <div className="border-t border-brand-100 px-5 py-3.5">
        <p className="mb-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
          <span className="font-semibold text-brand-600">Preview: </span>
          {items.map(c => c.label).join(" · ")}
        </p>
        <button onClick={onClose}
          className="w-full rounded-lg bg-brand-700 py-2 text-sm font-semibold text-white transition hover:bg-brand-800">
          Done
        </button>
      </div>
    </div>
  );
}

// ─── Inline Logic Rule Row ─────────────────────────────────────────────────────

function LogicRuleRow({ rule, question, isTitlePage, depth = 0, onUpdate, onDelete, onOpenConfig, onAddNested, onUpdateNested, onDeleteNested, onOpenPanel }: {
  rule: LogicRule; question: Question; isTitlePage: boolean; depth?: number;
  onUpdate: (r: LogicRule) => void; onDelete: () => void;
  onOpenConfig: () => void;
  onAddNested: (type: ResponseType) => void;
  onUpdateNested: (idx: number, q: Question) => void;
  onDeleteNested: (idx: number) => void;
  onOpenPanel: (qId: string, p: RightPanelState) => void;
}) {
  const [showTypePicker, setShowTypePicker] = useState(false);
  const isMC = question.type === "multiple_choice";
  const isCheckbox = question.type === "checkbox";
  const isNum = question.type === "number" || question.type === "slider";
  const nested = question.nested_questions ?? [];

  const condOps = isMC
    ? [["is", "is"], ["is_not", "is not"], ["is_selected", "is selected"], ["is_not_selected", "is not selected"], ["is_one_of", "is one of"], ["is_not_one_of", "is not one of"]]
    : isCheckbox
    ? [["checked", "is checked"], ["not_checked", "is not checked"]]
    : isNum
    ? [["lt", "< less than"], ["lte", "≤ ≤ to"], ["eq", "= equals"], ["neq", "≠ not equal"], ["gte", "≥ ≥ to"], ["gt", "> greater"], ["between", "between"]]
    : [["is", "is"], ["is_not", "is not"], ["exists", "exists"], ["not_exists", "does not exist"]];

  const needsValue = !["checked", "not_checked", "exists", "not_exists", "is_selected", "is_not_selected"].includes(rule.op);

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-brand-100 bg-gray-50 px-3 py-2.5">
        <span className="text-xs font-medium text-gray-500">If answer</span>
        <select value={rule.op} onChange={e => onUpdate({ ...rule, op: e.target.value as LogicOp })}
          className="rounded-md border border-brand-200 bg-white px-2 py-1 text-xs font-medium text-brand-700 outline-none focus:border-brand-500 transition">
          {condOps.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {needsValue && (
          isMC && question.option_meta?.length ? (
            <select value={rule.value} onChange={e => onUpdate({ ...rule, value: e.target.value })}
              className="rounded-md border border-brand-200 bg-white px-2 py-1 text-xs font-medium text-brand-700 outline-none focus:border-brand-500 transition">
              <option value="">select option…</option>
              {question.option_meta.map(m => <option key={m.id} value={m.label}>{m.label}</option>)}
            </select>
          ) : (
            <input value={rule.value} onChange={e => onUpdate({ ...rule, value: e.target.value })}
              placeholder="value…"
              className="w-24 rounded-md border border-brand-200 bg-white px-2 py-1 text-xs outline-none focus:border-brand-500 transition" />
          )
        )}
        <span className="text-xs font-medium text-gray-500">then</span>
        <select value={rule.trigger} onChange={e => onUpdate({ ...rule, trigger: e.target.value as LogicTrigger })}
          className="rounded-md border border-brand-200 bg-white px-2 py-1 text-xs font-semibold text-brand-700 outline-none focus:border-brand-500 transition">
          {(Object.keys(TRIGGER_LABEL) as LogicTrigger[]).map(t => (
            <option key={t} value={t}>{TRIGGER_LABEL[t]}</option>
          ))}
        </select>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TRIGGER_STYLE[rule.trigger]}`}>
          {TRIGGER_LABEL[rule.trigger]}
        </span>
        {(rule.trigger === "require_evidence" || rule.trigger === "notify") && (
          <button onClick={onOpenConfig}
            className="rounded-md border border-brand-200 bg-white px-2 py-1 text-xs text-brand-600 hover:bg-brand-50 transition">
            Configure…
          </button>
        )}
        <button onClick={onDelete} className="ml-auto text-gray-300 hover:text-red-500 transition">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {rule.trigger === "ask_questions" && (
        <div className="ml-6 mt-1 border-l-2 border-indigo-200 pl-3">
          {nested.map((nq, ni) => (
            <NestedQuestionCard key={nq.id} question={nq} isTitlePage={isTitlePage} depth={depth}
              onUpdate={q => onUpdateNested(ni, q)}
              onDelete={() => onDeleteNested(ni)}
              onOpenPanel={onOpenPanel} />
          ))}
          <div className="relative mt-1">
            <button onClick={() => setShowTypePicker(v => !v)}
              className="flex items-center gap-1 rounded-lg border border-dashed border-indigo-300 px-3 py-1.5 text-xs font-medium text-indigo-600 transition hover:border-indigo-500 hover:bg-indigo-50">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              Add question
            </button>
            {showTypePicker && (
              <div className="absolute left-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-xl border border-brand-100 bg-white shadow-card">
                {(isTitlePage ? TITLE_TYPES : INSPECT_TYPES).map(t => (
                  <button key={t.value} onClick={() => { onAddNested(t.value); setShowTypePicker(false); }}
                    className="flex w-full px-3.5 py-2.5 text-sm text-brand-800 hover:bg-brand-50 transition">
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Nested Question Card ─────────────────────────────────────────────────────

function NestedQuestionCard({ question, isTitlePage, depth = 0, onUpdate, onDelete, onOpenPanel }: {
  question: Question; isTitlePage: boolean; depth?: number;
  onUpdate: (q: Question) => void; onDelete: () => void;
  onOpenPanel: (qId: string, p: RightPanelState) => void;
}) {
  const [editing, setEditing] = useState(!question.text);
  const [draft, setDraft] = useState(question.text);
  const [showType, setShowType] = useState(false);
  const indent = Math.min(depth, 4);

  function commit() {
    setEditing(false);
    if (draft.trim()) onUpdate({ ...question, text: draft.trim() });
    else setDraft(question.text);
  }

  function onSetPanel(p: RightPanelState) {
    onOpenPanel(question.id, p);
  }

  function changeType(t: ResponseType) {
    const patch: Partial<Question> = { type: t };
    if (t === "multiple_choice") {
      if (!question.option_meta?.length) {
        const meta = defaultOptionMeta();
        patch.option_meta = meta; patch.options = meta.map(m => m.label);
      }
      onUpdate(syncOptionArrays({ ...question, ...patch }));
      setShowType(false);
      onSetPanel({ type: "mc_library" });
      return;
    }
    if (t === "table" && !question.table_columns?.length) {
      patch.table_columns = defaultTableColumns();
    }
    onUpdate(syncOptionArrays({ ...question, ...patch }));
    setShowType(false);
  }

  function updateRule(id: string, r: LogicRule) {
    onUpdate({ ...question, logic_rules: question.logic_rules?.map(x => x.id === id ? r : x) });
  }
  function deleteRule(id: string) {
    onUpdate({ ...question, logic_rules: question.logic_rules?.filter(x => x.id !== id) });
  }
  function addNested(type: ResponseType) {
    const nq: Question = { id: uid(), text: "", type, required: false };
    if (type === "multiple_choice") { const meta = defaultOptionMeta(); nq.option_meta = meta; nq.options = meta.map(m => m.label); }
    onUpdate({ ...question, nested_questions: [...(question.nested_questions ?? []), nq] });
  }
  function updateNested(idx: number, nq: Question) {
    const nested = (question.nested_questions ?? []).map((q, i) => i === idx ? syncOptionArrays(nq) : q);
    onUpdate({ ...question, nested_questions: nested });
  }
  function deleteNested(idx: number) {
    onUpdate({ ...question, nested_questions: (question.nested_questions ?? []).filter((_, i) => i !== idx) });
  }

  const hasMcOptions = question.type === "multiple_choice" && (question.option_meta?.length ?? 0) > 0;

  return (
    <div className="group mb-1.5 overflow-hidden rounded-lg border border-indigo-100 bg-white shadow-sm" style={{ marginLeft: indent * 2 }}>
      <div className="flex items-start gap-2 px-3 py-2.5">
        <div className="flex-1">
          {editing ? (
            <input value={draft} autoFocus
              onChange={e => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setEditing(false); setDraft(question.text); } }}
              placeholder="Enter question…"
              className="w-full rounded-md border border-brand-300 bg-brand-50 px-2 py-1 text-sm font-medium text-brand-900 outline-none focus:border-brand-500" />
          ) : (
            <p onClick={() => { setEditing(true); setDraft(question.text); }}
              className={`cursor-text text-sm font-medium ${question.text ? "text-gray-800 hover:text-gray-600" : "italic text-gray-400"}`}>
              {question.required && <span className="mr-0.5 text-red-500">*</span>}
              {question.text || "Click to enter question…"}
            </p>
          )}
          <div className="mt-1.5 flex items-center gap-2">
            <div className="relative">
              <button onClick={() => setShowType(v => !v)}
                className="flex items-center gap-1 rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600 hover:bg-brand-100 transition">
                {typeLabel(question.type)}
                <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
              </button>
              {showType && (
                <TypePickerPanel isTitlePage={isTitlePage} current={question.type}
                  onSelect={changeType} onClose={() => setShowType(false)} />
              )}
            </div>
            {hasMcOptions && (
              <button onClick={() => onSetPanel({ type: "mc_library" })}
                className="rounded-md px-2 py-0.5 text-xs font-medium text-brand-600 hover:bg-brand-50 transition">
                Edit responses
              </button>
            )}
          </div>
        </div>
        <button onClick={onDelete} className="mt-0.5 opacity-0 group-hover:opacity-100 transition rounded p-1 text-gray-300 hover:bg-red-50 hover:text-red-500">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <ControlBar question={question} isTitlePage={isTitlePage} onUpdate={onUpdate} onSetPanel={onSetPanel} />

      {(question.logic_rules ?? []).length > 0 && (
        <div className="px-3 pb-2">
          {(question.logic_rules ?? []).map(rule => (
            <LogicRuleRow key={rule.id} rule={rule} question={question} isTitlePage={isTitlePage} depth={depth + 1}
              onUpdate={r => updateRule(rule.id, r)}
              onDelete={() => deleteRule(rule.id)}
              onOpenConfig={() => onSetPanel({ type: "logic_config", ruleId: rule.id })}
              onAddNested={addNested}
              onUpdateNested={updateNested}
              onDeleteNested={deleteNested}
              onOpenPanel={onOpenPanel} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Template Header Card ─────────────────────────────────────────────────────

function TemplateHeaderCard({ name, description, headerImage, onNameChange, onDescriptionChange, onImageChange }: {
  name: string; description: string; headerImage?: string;
  onNameChange: (n: string) => void; onDescriptionChange: (d: string) => void;
  onImageChange: (url: string) => void;
}) {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(name);
  const fileRef = useRef<HTMLInputElement>(null);

  function commitName() {
    setEditingName(false);
    if (nameDraft.trim()) onNameChange(nameDraft.trim());
    else setNameDraft(name);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { if (ev.target?.result) onImageChange(ev.target.result as string); };
    reader.readAsDataURL(file);
  }

  return (
    <div className="mb-5 rounded-2xl border border-brand-100 bg-white shadow-sm p-6 flex items-start gap-6">
      {/* Image — large, top-left */}
      <div
        onClick={() => fileRef.current?.click()}
        className="flex h-32 w-32 shrink-0 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50 hover:border-brand-400 hover:bg-brand-100 transition overflow-hidden">
        {headerImage ? (
          <img src={headerImage} alt="Template" className="h-full w-full object-cover" />
        ) : (
          <svg className="h-12 w-12 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M7.5 8.25h.008v.008H7.5V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
          </svg>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {/* Title and description — left-aligned beside image */}
      <div className="flex-1 min-w-0 pt-1">
        {editingName ? (
          <input value={nameDraft} autoFocus
            onChange={e => setNameDraft(e.target.value)}
            onBlur={commitName}
            onKeyDown={e => { if (e.key === "Enter") commitName(); if (e.key === "Escape") { setEditingName(false); setNameDraft(name); } }}
            className="mb-2 w-full rounded-lg border border-brand-300 px-3 py-1.5 font-display text-2xl font-bold text-brand-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100" />
        ) : (
          <button onClick={() => { setEditingName(true); setNameDraft(name); }}
            className="mb-2 block w-full text-left font-display text-2xl font-bold text-brand-900 hover:text-brand-600 transition cursor-text leading-tight">
            {name}
          </button>
        )}
        <textarea
          value={description}
          onChange={e => onDescriptionChange(e.target.value)}
          placeholder="Add a description for this template…"
          rows={3}
          className="w-full resize-none rounded-lg border border-transparent bg-transparent py-1 text-sm leading-relaxed text-gray-600 outline-none focus:border-brand-200 focus:bg-brand-50 focus:px-2 transition placeholder:text-gray-400" />
      </div>
    </div>
  );
}

// ─── Control Bar ──────────────────────────────────────────────────────────────

function Divider() {
  return <span className="h-3.5 w-px bg-gray-200 shrink-0" />;
}

function CtrlCheckbox({ checked, label, onChange }: { checked: boolean; label: string; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        className="h-3.5 w-3.5 rounded border-gray-300 accent-brand-600" />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}

function CtrlButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="rounded-md border border-gray-200 bg-white px-2.5 py-0.5 text-sm font-medium text-brand-700 hover:bg-brand-50 hover:border-brand-300 transition">
      {label}
    </button>
  );
}

function ControlBar({ question, isTitlePage, onUpdate, onSetPanel }: {
  question: Question; isTitlePage: boolean;
  onUpdate: (q: Question) => void;
  onSetPanel: (p: RightPanelState) => void;
}) {
  const t = question.type;
  const hasLogic = ["multiple_choice", "text", "number", "checkbox", "slider", "signature", "person", "document_number"].includes(t);

  function addLogicRule() {
    const rule: LogicRule = { id: uid(), op: "is" as LogicOp, value: "", trigger: "ask_questions" };
    onUpdate({ ...question, logic_rules: [...(question.logic_rules ?? []), rule] });
  }

  const items: React.ReactNode[] = [];

  if (hasLogic) {
    items.push(
      <button key="logic" onClick={addLogicRule}
        className="flex items-center gap-1.5 rounded-md px-2 py-0.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition">
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
        Add logic
      </button>
    );
  }

  // Required checkbox (most types)
  const showRequired = !["instruction"].includes(t);
  if (showRequired && items.length > 0) items.push(<Divider key="d-req" />);
  if (showRequired) {
    items.push(
      <CtrlCheckbox key="req" checked={question.required} label="Required"
        onChange={v => onUpdate({ ...question, required: v })} />
    );
  }

  // Type-specific extras
  if (t === "inspection_date" || t === "datetime") {
    items.push(<Divider key="d-date" />);
    items.push(
      <CtrlCheckbox key="date" checked={question.include_date ?? true} label="Date"
        onChange={v => onUpdate({ ...question, include_date: v })} />
    );
    items.push(
      <CtrlCheckbox key="time" checked={question.include_time ?? true} label="Time"
        onChange={v => onUpdate({ ...question, include_time: v })} />
    );
  }

  if (t === "multiple_choice") {
    items.push(<Divider key="d-ms" />);
    items.push(
      <CtrlCheckbox key="ms" checked={question.multiple_selection ?? false} label="Multiple selection"
        onChange={v => onUpdate({ ...question, multiple_selection: v })} />
    );
    const flaggedLabels = question.option_meta?.filter(m => m.is_flagged).map(m => m.label) ?? [];
    if (flaggedLabels.length > 0) {
      items.push(<Divider key="d-flag" />);
      items.push(
        <span key="flagged" className="flex items-center gap-1 text-sm text-gray-600">
          Flagged: {flaggedLabels.map(l => (
            <span key={l} className="ml-0.5 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">{l}</span>
          ))}
        </span>
      );
    }
  }

  if (t === "document_number") {
    items.push(<Divider key="d-docfmt" />);
    items.push(
      <CtrlButton key="docfmt" label={`Format: ${question.doc_number_format ?? "[number]"}`}
        onClick={() => onSetPanel({ type: "doc_number_format" })} />
    );
  }

  if (t === "text") {
    items.push(<Divider key="d-textfmt" />);
    items.push(
      <CtrlButton key="textfmt" label={`Format: ${question.text_format === "long" ? "Long answer" : "Short answer"}`}
        onClick={() => onSetPanel({ type: "text_format" })} />
    );
  }

  if (t === "number") {
    items.push(<Divider key="d-numfmt" />);
    items.push(
      <CtrlButton key="numfmt" label={`Format: ${question.number_format ?? "Number"}`}
        onClick={() => onSetPanel({ type: "number_format" })} />
    );
    items.push(<Divider key="d-unit" />);
    items.push(
      <CtrlButton key="unit" label={`Unit: ${question.number_unit || "None"}`}
        onClick={() => onSetPanel({ type: "number_format" })} />
    );
  }

  if (t === "table") {
    items.push(<Divider key="d-tbl" />);
    items.push(
      <CtrlButton key="tblcols" label={`${question.table_columns?.length ?? 0} columns`}
        onClick={() => onSetPanel({ type: "table" })} />
    );
  }

  if (t === "slider") {
    items.push(<Divider key="d-range" />);
    items.push(
      <CtrlButton key="range" label={`Range: ${question.min ?? 0} - ${question.max ?? 10}`}
        onClick={() => onSetPanel({ type: "slider_range" })} />
    );
  }

  if (t === "annotation") {
    items.push(<Divider key="d-ann" />);
    items.push(
      <span key="ann" className="text-sm text-gray-500 italic">Upload image to annotate</span>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2.5 border-t border-gray-100 bg-gray-50 px-4 py-2">
      {items}
    </div>
  );
}

// ─── Question Row (table-style) ───────────────────────────────────────────────

function QuestionRow({ question, isTitlePage, isActive, scoreEnabled, onUpdate, onDelete, onSetPanel, onOpenPanel, onActivate }: {
  question: Question; isTitlePage: boolean; isActive: boolean; scoreEnabled: boolean;
  onUpdate: (q: Question) => void; onDelete: () => void;
  onSetPanel: (p: RightPanelState) => void;
  onOpenPanel: (qId: string, p: RightPanelState) => void;
  onActivate: () => void;
}) {
  const [showType, setShowType] = useState(false);
  const [editingText, setEditingText] = useState(!question.text);
  const [textDraft, setTextDraft] = useState(question.text);
  const [showContext, setShowContext] = useState(false);

  function commitText() {
    setEditingText(false);
    if (textDraft.trim()) onUpdate({ ...question, text: textDraft.trim() });
    else setTextDraft(question.text);
  }

  function changeType(t: ResponseType) {
    const patch: Partial<Question> = { type: t };
    if (t === "multiple_choice") {
      if (!question.option_meta?.length) {
        const meta = defaultOptionMeta();
        patch.option_meta = meta; patch.options = meta.map(m => m.label);
      }
      onUpdate(syncOptionArrays({ ...question, ...patch }));
      setShowType(false);
      onSetPanel({ type: "mc_library" });
      return;
    }
    if (t === "table" && !question.table_columns?.length) {
      patch.table_columns = defaultTableColumns();
    }
    onUpdate(syncOptionArrays({ ...question, ...patch }));
    setShowType(false);
  }

  function applyPresetMeta(meta: OptionMeta[]) {
    onUpdate(syncOptionArrays({ ...question, type: "multiple_choice", option_meta: meta }));
  }

  function updateRule(id: string, r: LogicRule) {
    onUpdate({ ...question, logic_rules: question.logic_rules?.map(x => x.id === id ? r : x) });
  }
  function deleteRule(id: string) {
    onUpdate({ ...question, logic_rules: question.logic_rules?.filter(x => x.id !== id) });
  }
  function addNested(type: ResponseType) {
    const nq: Question = { id: uid(), text: "", type, required: false };
    if (type === "multiple_choice") { const meta = defaultOptionMeta(); nq.option_meta = meta; nq.options = meta.map(m => m.label); }
    onUpdate({ ...question, nested_questions: [...(question.nested_questions ?? []), nq] });
  }
  function updateNested(idx: number, nq: Question) {
    const nested = (question.nested_questions ?? []).map((q, i) => i === idx ? syncOptionArrays(nq) : q);
    onUpdate({ ...question, nested_questions: nested });
  }
  function deleteNested(idx: number) {
    onUpdate({ ...question, nested_questions: (question.nested_questions ?? []).filter((_, i) => i !== idx) });
  }

  // Type badge display
  function TypeBadge() {
    if (question.type === "multiple_choice" && question.option_meta?.length) {
      return (
        <button onClick={e => { e.stopPropagation(); onSetPanel({ type: "mc_library" }); }}
          className="flex flex-wrap gap-1 text-left hover:opacity-80 transition" title="Edit responses">
          {question.option_meta.slice(0, 3).map(m => (
            <span key={m.id} className={`rounded-full px-2 py-0.5 text-xs font-medium ${chipClass(m.color)}`}>{m.label}</span>
          ))}
          {question.option_meta.length > 3 && <span className="text-xs text-gray-500">+{question.option_meta.length - 3}</span>}
        </button>
      );
    }
    const found = [...TITLE_TYPES, ...INSPECT_TYPES].find(x => x.value === question.type);
    const icon = (found as { icon?: string })?.icon ?? "";
    return (
      <span className="flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-sm font-medium text-brand-800">
        {icon && <span>{icon}</span>}
        {found?.label ?? question.type}
      </span>
    );
  }

  return (
    <div className={`group transition-colors ${isActive ? "bg-brand-50/30" : "hover:bg-gray-50/50"}`}>
      {/* Main row */}
      <div className="flex items-start" onClick={onActivate}>
        {/* Drag handle */}
        <div className="flex w-9 shrink-0 items-center justify-center pt-3 opacity-20 group-hover:opacity-100 transition cursor-grab active:cursor-grabbing">
          <svg className="h-5 w-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
            <circle cx="6.5" cy="4.5" r="1.5" /><circle cx="13.5" cy="4.5" r="1.5" />
            <circle cx="6.5" cy="10" r="1.5" /><circle cx="13.5" cy="10" r="1.5" />
            <circle cx="6.5" cy="15.5" r="1.5" /><circle cx="13.5" cy="15.5" r="1.5" />
          </svg>
        </div>

        {/* Question cell */}
        <div className="flex-1 min-w-0 border-r border-brand-100 py-2.5 pr-3">
          {editingText ? (
            <input value={textDraft} autoFocus
              onChange={e => setTextDraft(e.target.value)}
              onBlur={commitText}
              onKeyDown={e => { if (e.key === "Enter") commitText(); if (e.key === "Escape") { setEditingText(false); setTextDraft(question.text); } }}
              placeholder="Enter question…"
              className="w-full rounded-md border border-brand-300 bg-brand-50 px-2 py-1 text-sm font-medium text-brand-900 outline-none focus:border-brand-500"
              onClick={e => e.stopPropagation()} />
          ) : (
            <div className="flex items-center gap-1.5">
              <p className={`text-sm font-medium leading-snug ${question.text ? "text-gray-800" : "italic text-gray-400"}`}>
                {question.required && <span className="mr-0.5 text-red-500">*</span>}
                {question.text || "Click to enter question…"}
              </p>
              <button
                onClick={e => { e.stopPropagation(); setEditingText(true); setTextDraft(question.text); }}
                className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition rounded p-0.5 text-gray-400 hover:text-gray-700">
                <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              </button>
            </div>
          )}
        </div>

        {/* Type of response cell */}
        <div className="w-48 shrink-0 border-r border-brand-100 py-2.5 px-3">
          <div className="relative flex items-center gap-1">
            <div className="flex-1 min-w-0">
              <TypeBadge />
            </div>
            <button
              onClick={e => { e.stopPropagation(); setShowType(v => !v); }}
              className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </button>
            {showType && (
              <TypePickerPanel isTitlePage={isTitlePage} current={question.type}
                onSelect={changeType} onClose={() => setShowType(false)} />
            )}
          </div>
        </div>

        {/* Score cell */}
        {scoreEnabled && (
          <div className="w-20 shrink-0 py-2.5 px-3">
            {question.type === "multiple_choice" ? (
              <span className="text-xs text-gray-400">/</span>
            ) : (
              <input type="number" placeholder="—"
                value={question.question_score ?? ""}
                onChange={e => onUpdate({ ...question, question_score: e.target.value === "" ? null : Number(e.target.value) })}
                onClick={e => e.stopPropagation()}
                className="w-full rounded border border-brand-200 px-2 py-1 text-xs text-center outline-none focus:border-brand-500 transition" />
            )}
          </div>
        )}

        {/* 3-dot menu */}
        <div className="w-8 shrink-0 flex items-center justify-center pt-2.5">
          <div className="relative">
            <button onClick={e => { e.stopPropagation(); setShowContext(v => !v); }}
              className="rounded p-1 text-gray-300 opacity-0 group-hover:opacity-100 transition hover:bg-gray-100 hover:text-gray-600">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 7a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 7a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" /></svg>
            </button>
            {showContext && (
              <div className="absolute right-0 z-50 mt-1 w-40 overflow-hidden rounded-xl border border-brand-100 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
                onClick={e => { e.stopPropagation(); setShowContext(false); }}>
                <button onClick={onDelete} className="flex w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">Delete</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Control bar */}
      <div className="pl-8">
        <ControlBar question={question} isTitlePage={isTitlePage} onUpdate={onUpdate} onSetPanel={onSetPanel} />
      </div>

      {/* Logic rules inline */}
      {(question.logic_rules ?? []).length > 0 && (
        <div className="pl-8 pr-4 pb-2">
          {(question.logic_rules ?? []).map(rule => (
            <LogicRuleRow key={rule.id} rule={rule} question={question} isTitlePage={isTitlePage}
              onUpdate={r => updateRule(rule.id, r)}
              onDelete={() => deleteRule(rule.id)}
              onOpenConfig={() => onSetPanel({ type: "logic_config", ruleId: rule.id })}
              onAddNested={addNested}
              onUpdateNested={updateNested}
              onDeleteNested={deleteNested}
              onOpenPanel={onOpenPanel} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Section Block ─────────────────────────────────────────────────────────────

function SectionBlock({ section, sectionIdx, totalSections, activePanelQ, sectionRef, onUpdate, onDelete, onMoveSection, onSetPanel }: {
  section: Section; sectionIdx: number; totalSections: number; activePanelQ: string | null;
  sectionRef?: (el: HTMLDivElement | null) => void;
  onUpdate: (s: Section) => void; onDelete: () => void;
  onMoveSection: (dir: "up" | "down") => void;
  onSetPanel: (state: { qId: string; panel: RightPanelState } | null) => void;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(section.title);
  const [showAddType, setShowAddType] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const isFixed = section.is_title_page || section.is_completion;

  function commitTitle() {
    setEditingTitle(false);
    if (titleDraft.trim()) onUpdate({ ...section, title: titleDraft.trim() });
    else setTitleDraft(section.title);
  }

  function addQuestion(type: ResponseType) {
    const q: Question = { id: uid(), text: "", type, required: false };
    if (type === "multiple_choice") {
      const meta = defaultOptionMeta();
      q.option_meta = meta; q.options = meta.map(m => m.label);
    }
    if (type === "table") { q.table_columns = defaultTableColumns(); }
    onUpdate({ ...section, questions: [...section.questions, q] });
    setShowAddType(false);
  }

  function updateQuestion(idx: number, q: Question) {
    onUpdate({ ...section, questions: section.questions.map((old, i) => i === idx ? syncOptionArrays(q) : old) });
  }

  const types = section.is_title_page ? TITLE_TYPES : INSPECT_TYPES;
  const scoreEnabled = !!section.score_enabled;

  return (
    <div ref={sectionRef} className="mb-4 rounded-2xl border border-brand-100 bg-white shadow-sm">
      {/* Section header */}
      <div className={`flex items-center gap-2 px-4 py-3 ${isFixed ? "bg-brand-50/70" : "bg-white"} rounded-t-2xl border-b border-brand-100`}>
        {/* Title */}
        <div className="flex flex-1 items-center gap-1.5 min-w-0">
          {editingTitle && !isFixed ? (
            <input value={titleDraft} autoFocus
              onChange={e => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={e => { if (e.key === "Enter") commitTitle(); if (e.key === "Escape") { setEditingTitle(false); setTitleDraft(section.title); } }}
              className="flex-1 rounded-lg border border-brand-300 px-2.5 py-1 font-display text-sm font-semibold text-brand-900 outline-none focus:border-brand-500" />
          ) : (
            <span className={`font-display text-sm font-semibold text-brand-900 truncate ${!isFixed ? "cursor-default" : ""}`}>
              {section.title}
              {isFixed && <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-normal text-gray-500">Fixed</span>}
            </span>
          )}
          {!isFixed && !editingTitle && (
            <button onClick={() => { setEditingTitle(true); setTitleDraft(section.title); }}
              className="shrink-0 rounded p-0.5 text-gray-400 hover:text-gray-600 transition">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs text-gray-500">{section.questions.length}q</span>

          {/* Score toggle */}
          {!isFixed && (
            <button onClick={() => onUpdate({ ...section, score_enabled: !section.score_enabled })}
              className={`rounded-lg px-2 py-1 text-xs font-medium transition ${scoreEnabled ? "bg-amber-100 text-amber-700 hover:bg-amber-200" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"}`}>
              {scoreEnabled ? "Hide score column" : "View score column"}
            </button>
          )}

          {/* Collapse/Expand */}
          <button onClick={() => onUpdate({ ...section, collapsed: !section.collapsed })}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition">
            <svg className={`h-4 w-4 transition-transform duration-200 ${section.collapsed ? "" : "rotate-180"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
          </button>

          {/* 3-dot menu */}
          {!isFixed && (
            <div className="relative">
              <button onClick={() => setShowContext(v => !v)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 7a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 7a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" /></svg>
              </button>
              {showContext && (
                <div className="absolute right-0 z-50 mt-1 w-44 overflow-hidden rounded-xl border border-brand-100 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
                  onClick={() => setShowContext(false)}>
                  <button onClick={() => onMoveSection("up")} disabled={sectionIdx <= 1}
                    className="flex w-full px-4 py-2.5 text-sm text-brand-800 hover:bg-brand-50 disabled:opacity-40">Move up</button>
                  <button onClick={() => onMoveSection("down")} disabled={sectionIdx >= totalSections - 2}
                    className="flex w-full px-4 py-2.5 text-sm text-brand-800 hover:bg-brand-50 disabled:opacity-40">Move down</button>
                  <div className="border-t border-brand-100" />
                  <button onClick={onDelete} className="flex w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">Delete section</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Questions table */}
      {!section.collapsed && (
        <div>
          {section.questions.length > 0 && (
            <>
              {/* Table header */}
              <div className="flex items-center border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-widest text-gray-500">
                <div className="w-8 shrink-0" />
                <div className="flex-1 py-2.5 pr-3 border-r border-gray-200">Question</div>
                <div className="w-48 shrink-0 py-2.5 px-3 border-r border-gray-200">Type of response</div>
                {scoreEnabled && <div className="w-20 shrink-0 py-2.5 px-3 border-r border-gray-200">Max score</div>}
                <div className="w-8 shrink-0" />
              </div>

              {/* Question rows */}
              <div className="divide-y divide-brand-50">
                {section.questions.map((q, qi) => (
                  <QuestionRow
                    key={q.id}
                    question={q}
                    isTitlePage={!!section.is_title_page}
                    isActive={activePanelQ === q.id}
                    scoreEnabled={scoreEnabled}
                    onUpdate={updated => updateQuestion(qi, updated)}
                    onDelete={() => onUpdate({ ...section, questions: section.questions.filter((_, i) => i !== qi) })}
                    onSetPanel={panel => onSetPanel(panel ? { qId: q.id, panel } : null)}
                    onOpenPanel={(qId, panel) => onSetPanel(panel ? { qId, panel } : null)}
                    onActivate={() => {}} />
                ))}
              </div>
            </>
          )}

          {section.questions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <svg className="mb-2 h-8 w-8 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-sm font-medium text-gray-500">No questions yet</p>
              <p className="mt-1 text-xs text-gray-400">Click "Add question" below to get started</p>
            </div>
          )}

          {/* Add question */}
          <div className="border-t border-brand-50 px-4 py-3">
            <div className="relative inline-block">
              <button onClick={() => setShowAddType(v => !v)}
                className="flex items-center gap-1.5 rounded-lg border border-dashed border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                Add question
              </button>
              {showAddType && (
                <div className="absolute left-0 z-40 mt-1 w-52 overflow-hidden rounded-xl border border-brand-100 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                  {types.map(t => (
                    <button key={t.value} onClick={() => addQuestion(t.value)}
                      className="flex w-full px-4 py-2.5 text-sm text-brand-800 transition hover:bg-brand-50">
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

type Tab = "build" | "access";
type GlobalPanel = { qId: string; panel: RightPanelState } | null;
type Props = { user: User | null; onLogout: () => void };

export default function TemplateBuilderPage({ user: _user, onLogout: _onLogout }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [name, setName] = useState("Untitled Template");
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("Untitled Template");
  const [category, setCategory] = useState("Safety");
  const [description, setDescription] = useState("");
  const [schema, setSchema] = useState<FormSchema>(makeDefaultSchema());
  const [loading, setLoading] = useState(!!id && id !== "new");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "unsaved" | "saving">("saved");
  const [globalPanel, setGlobalPanel] = useState<GlobalPanel>(null);
  const [tab, setTab] = useState<Tab>("build");
  const [history, setHistory] = useState<FormSchema[]>([]);
  const [future, setFuture] = useState<FormSchema[]>([]);
  const [showCatMenu, setShowCatMenu] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [sideOpen, setSideOpen] = useState(() => window.innerWidth >= 768);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const templateId = useRef<string | null>(id && id !== "new" ? id : null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!id || id === "new") { setLoading(false); return; }
    api<{ id: string; name: string; category: string; description: string; form_schema: FormSchema }>(`/api/templates/${id}`)
      .then(t => {
        setName(t.name); setNameDraft(t.name);
        setCategory(t.category || "Safety");
        setDescription(t.description || "");
        const s = t.form_schema?.sections?.length ? t.form_schema : makeDefaultSchema();
        setSchema(s);
        setSaveStatus("saved");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  function scheduleAutoSave(s: FormSchema, n: string, cat: string, desc: string) {
    setSaveStatus("unsaved");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => doSave(s, n, cat, desc), 800);
  }

  async function doSave(s: FormSchema, n: string, cat: string, desc: string, publish = false) {
    setSaveStatus("saving"); setSaving(true);
    try {
      if (!templateId.current) {
        const r = await api<{ id: string }>("/api/templates", {
          method: "POST",
          body: JSON.stringify({ name: n, category: cat, description: desc, form_schema: s }),
        });
        templateId.current = r.id;
        window.history.replaceState(null, "", `/templates/edit/${r.id}`);
      } else {
        await api(`/api/templates/${templateId.current}`, {
          method: "PUT",
          body: JSON.stringify({ name: n, category: cat, description: desc, form_schema: s }),
        });
      }
      setSaveStatus("saved");
      if (publish) navigate("/templates");
    } catch { setSaveStatus("unsaved"); }
    finally { setSaving(false); }
  }

  function updateSchema(next: FormSchema) {
    setHistory(h => [...h.slice(-30), schema]);
    setFuture([]);
    setSchema(next);
    scheduleAutoSave(next, name, category, description);
  }

  function undo() {
    if (!history.length) return;
    const prev = history[history.length - 1];
    setFuture(f => [schema, ...f]);
    setHistory(h => h.slice(0, -1));
    setSchema(prev);
    scheduleAutoSave(prev, name, category, description);
  }

  function redo() {
    if (!future.length) return;
    const next = future[0];
    setHistory(h => [...h, schema]);
    setFuture(f => f.slice(1));
    setSchema(next);
    scheduleAutoSave(next, name, category, description);
  }

  function addSection() {
    const sections = [...schema.sections];
    const n = sections.filter(s => !s.is_title_page && !s.is_completion).length + 1;
    sections.splice(sections.length - 1, 0, { id: uid(), title: `Section ${n}`, collapsed: false, questions: [] });
    updateSchema({ ...schema, sections });
  }

  function updateSection(idx: number, s: Section) {
    updateSchema({ ...schema, sections: schema.sections.map((old, i) => i === idx ? s : old) });
  }

  function deleteSection(idx: number) {
    updateSchema({ ...schema, sections: schema.sections.filter((_, i) => i !== idx) });
  }

  function moveSection(idx: number, dir: "up" | "down") {
    const sections = [...schema.sections];
    const target = dir === "up" ? idx - 1 : idx + 1;
    if (target < 1 || target >= sections.length - 1) return;
    [sections[idx], sections[target]] = [sections[target], sections[idx]];
    updateSchema({ ...schema, sections });
  }

  function findQuestionDeep(questions: Question[], qId: string): Question | null {
    for (const q of questions) {
      if (q.id === qId) return q;
      if (q.nested_questions?.length) {
        const found = findQuestionDeep(q.nested_questions, qId);
        if (found) return found;
      }
    }
    return null;
  }

  function findQuestion(qId: string): { q: Question | null } {
    for (const s of schema.sections) {
      const q = findQuestionDeep(s.questions, qId);
      if (q) return { q };
    }
    return { q: null };
  }

  function updateQuestionDeep(questions: Question[], qId: string, updated: Question): Question[] {
    return questions.map(q => {
      if (q.id === qId) return syncOptionArrays(updated);
      if (q.nested_questions?.length) {
        return { ...q, nested_questions: updateQuestionDeep(q.nested_questions, qId, updated) };
      }
      return q;
    });
  }

  function updatePanelQuestion(qId: string, updated: Question) {
    const sections = schema.sections.map(s => ({ ...s, questions: updateQuestionDeep(s.questions, qId, updated) }));
    updateSchema({ ...schema, sections });
  }

  const panelQId = globalPanel?.qId ?? null;
  const { q: panelQ } = panelQId ? findQuestion(panelQId) : { q: null };

  function scrollToSection(sid: string) {
    sectionRefs.current[sid]?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSectionId(sid);
  }

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <svg className="h-7 w-7 animate-spin text-brand-400" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
    </div>
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-50" onClick={() => { setShowCatMenu(false); }}>

      {/* ── Top Bar ── */}
      <div className="flex shrink-0 items-center gap-2 border-b border-brand-100 bg-white px-4 py-2.5 shadow-sm overflow-x-auto">
        {/* Sidebar toggle (build tab only) */}
        {tab === "build" && (
          <button
            onClick={() => setSideOpen(v => !v)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-brand-500 transition hover:bg-brand-50 hover:text-brand-800"
            aria-label="Toggle sections panel"
            title="Toggle sections panel"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <button onClick={() => navigate("/templates")}
          className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-brand-500 transition hover:bg-brand-50 hover:text-brand-700">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          <span className="hidden sm:inline">Templates</span>
        </button>
        <div className="h-4 w-px bg-brand-200" />

        {/* Template name */}
        {editingName ? (
          <input value={nameDraft} autoFocus onChange={e => setNameDraft(e.target.value)}
            onBlur={() => { setEditingName(false); if (nameDraft.trim()) { setName(nameDraft.trim()); scheduleAutoSave(schema, nameDraft.trim(), category, description); } else setNameDraft(name); }}
            onKeyDown={e => { if (e.key === "Enter") { setEditingName(false); if (nameDraft.trim()) { setName(nameDraft.trim()); scheduleAutoSave(schema, nameDraft.trim(), category, description); } } if (e.key === "Escape") { setEditingName(false); setNameDraft(name); } }}
            className="w-56 rounded-lg border border-brand-300 px-2.5 py-1.5 font-display text-sm font-semibold text-brand-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100" />
        ) : (
          <button onClick={() => { setEditingName(true); setNameDraft(name); }}
            className="max-w-xs truncate rounded-lg px-2 py-1.5 text-left font-display text-sm font-semibold text-brand-900 hover:bg-brand-50 transition">
            {name}
          </button>
        )}

        {/* Category */}
        <div className="relative" onClick={e => e.stopPropagation()}>
          <button onClick={() => setShowCatMenu(v => !v)}
            className="flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-600 hover:bg-brand-100 transition">
            {category}
            <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
          </button>
          {showCatMenu && (
            <div className="absolute left-0 top-full z-50 mt-1 w-40 overflow-hidden rounded-xl border border-brand-100 bg-white shadow-card">
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => { setCategory(c); setShowCatMenu(false); scheduleAutoSave(schema, name, c, description); }}
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-sm transition hover:bg-brand-50 ${c === category ? "font-semibold text-brand-700" : "text-brand-800"}`}>
                  {c}
                  {c === category && <svg className="h-3.5 w-3.5 text-brand-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="ml-3 flex rounded-lg border border-brand-100 bg-brand-50/50 p-0.5">
          {([["build", "Build"], ["access", "Manage Access"]] as const).map(([v, l]) => (
            <button key={v} onClick={() => setTab(v)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${tab === v ? "bg-white text-brand-900 shadow-sm" : "text-brand-500 hover:text-brand-700"}`}>
              {v === "access" ? (
                <><span className="sm:hidden">Access</span><span className="hidden sm:inline">Manage Access</span></>
              ) : l}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Undo / Redo */}
        <button onClick={undo} disabled={!history.length}
          className="hidden sm:flex rounded-lg p-2 text-brand-400 transition hover:bg-brand-50 hover:text-brand-700 disabled:opacity-30" title="Undo">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6M3 10l6-6" /></svg>
        </button>
        <button onClick={redo} disabled={!future.length}
          className="hidden sm:flex rounded-lg p-2 text-brand-400 transition hover:bg-brand-50 hover:text-brand-700 disabled:opacity-30" title="Redo">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 10H11a8 8 0 00-8 8v2M21 10l-6 6M21 10l-6-6" /></svg>
        </button>

        {/* Save status */}
        <span className={`hidden sm:block text-xs font-medium ${saveStatus === "saved" ? "text-green-600" : saveStatus === "saving" ? "text-brand-400" : "text-amber-600"}`}>
          {saveStatus === "saved" ? "● Saved" : saveStatus === "saving" ? "Saving…" : "● Unsaved"}
        </span>

        <button onClick={() => doSave(schema, name, category, description, true)} disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800 active:scale-95 disabled:opacity-60">
          Publish
        </button>
      </div>

      {/* ── Body ── */}
      <div className="relative flex flex-1 overflow-hidden">

        {/* ── Left Sidebar ── */}
        {tab === "build" && (
          <>
            {/* Mobile backdrop */}
            {sideOpen && (
              <div
                className="absolute inset-0 z-30 bg-black/40 md:hidden"
                onClick={() => setSideOpen(false)}
              />
            )}

            <div className={`
              absolute inset-y-0 left-0 z-40
              md:static md:inset-auto md:z-auto
              flex shrink-0 flex-col overflow-hidden border-r border-brand-100 bg-white transition-all duration-300
              ${sideOpen ? "w-56 translate-x-0" : "w-56 -translate-x-full md:translate-x-0 md:w-0"}
            `}>
              <div className="border-b border-brand-100 px-3 py-3">
                <button onClick={addSection}
                  className="mb-2 flex w-full items-center gap-2 rounded-lg bg-brand-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-800">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  Add Section
                </button>
              </div>
              <div className="flex-1 overflow-y-auto py-2">
                {schema.sections.map(s => (
                  <button key={s.id} onClick={() => { scrollToSection(s.id); if (window.innerWidth < 768) setSideOpen(false); }}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-brand-50 ${activeSectionId === s.id ? "bg-brand-50" : ""}`}>
                    <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${s.is_title_page ? "bg-brand-400" : s.is_completion ? "bg-green-400" : "bg-brand-300"}`} />
                    <span className="min-w-0 truncate text-xs font-medium text-brand-700">{s.title}</span>
                    <span className="ml-auto shrink-0 text-xs text-gray-400">{s.questions.length}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Center Canvas ── */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6" onClick={() => setGlobalPanel(null)}>
          {tab === "build" ? (
            <div className="mx-auto max-w-5xl" onClick={e => e.stopPropagation()}>
              {/* Template Header Card */}
              <TemplateHeaderCard
                name={name}
                description={description}
                headerImage={schema.header_image}
                onNameChange={n => { setName(n); setNameDraft(n); scheduleAutoSave(schema, n, category, description); }}
                onDescriptionChange={d => { setDescription(d); scheduleAutoSave(schema, name, category, d); }}
                onImageChange={url => { const next = { ...schema, header_image: url }; updateSchema(next); }} />

              {schema.sections.map((section, si) => (
                <SectionBlock key={section.id} section={section} sectionIdx={si}
                  totalSections={schema.sections.length} activePanelQ={panelQId}
                  sectionRef={el => { sectionRefs.current[section.id] = el; }}
                  onUpdate={s => updateSection(si, s)}
                  onDelete={() => deleteSection(si)}
                  onMoveSection={dir => moveSection(si, dir)}
                  onSetPanel={state => setGlobalPanel(state)} />
              ))}

              <button onClick={addSection}
                className="mx-auto mt-2 flex items-center gap-2 rounded-xl border border-dashed border-gray-300 px-6 py-3 text-sm font-medium text-gray-600 transition hover:border-brand-400 hover:bg-white hover:text-brand-700 hover:shadow-sm">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                Add Section
              </button>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl">
              <div className="rounded-2xl border border-brand-100 bg-white p-6 shadow-sm">
                <h2 className="font-display text-base font-semibold text-brand-900">Who can access this template?</h2>
                <p className="mt-1 text-sm text-gray-600">Configure which users and roles can view and use this template.</p>
                <div className="mt-5 rounded-xl border border-brand-100 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 font-display text-sm font-bold text-brand-700">A</div>
                    <div>
                      <p className="text-sm font-medium text-brand-900">All users</p>
                      <p className="text-xs text-gray-500">All authenticated users can start inspections.</p>
                    </div>
                    <span className="ml-auto rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">Active</span>
                  </div>
                </div>
                <div className="mt-5">
                  <label className="block text-sm font-medium text-brand-700">Template description</label>
                  <textarea value={description} rows={3}
                    onChange={e => { setDescription(e.target.value); scheduleAutoSave(schema, name, category, e.target.value); }}
                    placeholder="Describe the purpose of this template…"
                    className="mt-1.5 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 resize-none transition" />
                </div>
                <div className="mt-4 rounded-xl border border-dashed border-brand-200 p-4 text-center">
                  <p className="text-sm text-gray-500">Granular access controls coming soon.</p>
                  <button disabled className="mt-2 rounded-lg border border-brand-200 px-4 py-2 text-sm font-medium text-brand-400 opacity-50 cursor-not-allowed">
                    + New access rule
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Right Panel ── */}
        {globalPanel && panelQ && (
          <div className="w-80 shrink-0 overflow-hidden border-l border-brand-100 bg-white shadow-card animate-in slide-in-from-right duration-200">
            {globalPanel.panel?.type === "mc_library" ? (
              <MCLibraryPanel
                question={panelQ}
                onApplyAndEdit={meta => {
                  updatePanelQuestion(panelQ.id, syncOptionArrays({ ...panelQ, type: "multiple_choice", option_meta: meta }));
                  setGlobalPanel({ qId: panelQ.id, panel: { type: "mc" } });
                }}
                onEditCurrent={() => setGlobalPanel({ qId: panelQ.id, panel: { type: "mc" } })}
                onClose={() => setGlobalPanel(null)} />
            ) : globalPanel.panel?.type === "mc" ? (
              <MCOptionsPanel
                meta={panelQ.option_meta ?? defaultOptionMeta()}
                onChange={meta => {
                  updatePanelQuestion(panelQ.id, { ...panelQ, option_meta: meta,
                    options: meta.map(m => m.label),
                    flagged_responses: meta.filter(m => m.is_flagged).map(m => m.label),
                    score_map: Object.fromEntries(meta.map(m => [m.label, m.score])),
                  });
                }}
                onBack={() => setGlobalPanel({ qId: panelQ.id, panel: { type: "mc_library" } })}
                onClose={() => setGlobalPanel(null)} />
            ) : globalPanel.panel?.type === "table" ? (
              <TableColumnsPanel
                columns={panelQ.table_columns ?? defaultTableColumns()}
                onChange={cols => updatePanelQuestion(panelQ.id, { ...panelQ, table_columns: cols })}
                onClose={() => setGlobalPanel(null)} />
            ) : globalPanel.panel?.type === "logic_config" ? (
              <LogicConfigPanel
                rule={panelQ.logic_rules?.find(r => r.id === (globalPanel.panel as { type: "logic_config"; ruleId: string }).ruleId) ?? { id: "", op: "is", value: "", trigger: "require_evidence" }}
                onUpdate={updated => {
                  const rules = panelQ.logic_rules?.map(r => r.id === updated.id ? updated : r) ?? [];
                  updatePanelQuestion(panelQ.id, { ...panelQ, logic_rules: rules });
                }}
                onClose={() => setGlobalPanel(null)} />
            ) : globalPanel.panel?.type === "slider_range" ? (
              <SliderRangePanel
                question={panelQ}
                onSave={(min, max, step) => updatePanelQuestion(panelQ.id, { ...panelQ, min, max, step })}
                onClose={() => setGlobalPanel(null)} />
            ) : globalPanel.panel?.type === "doc_number_format" ? (
              <DocNumberFormatPanel
                question={panelQ}
                onSave={fmt => updatePanelQuestion(panelQ.id, { ...panelQ, doc_number_format: fmt })}
                onClose={() => setGlobalPanel(null)} />
            ) : globalPanel.panel?.type === "text_format" ? (
              <TextFormatPanel
                question={panelQ}
                onSave={fmt => updatePanelQuestion(panelQ.id, { ...panelQ, text_format: fmt })}
                onClose={() => setGlobalPanel(null)} />
            ) : globalPanel.panel?.type === "number_format" ? (
              <NumberFormatPanel
                question={panelQ}
                onSave={(fmt, unit) => updatePanelQuestion(panelQ.id, { ...panelQ, number_format: fmt, number_unit: unit })}
                onClose={() => setGlobalPanel(null)} />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
