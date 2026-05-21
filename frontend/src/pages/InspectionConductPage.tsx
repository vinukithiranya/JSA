import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import type { User } from "../types";

// ── Types ─────────────────────────────────────────────────────────────────────

type AnyResponseType =
  | "site" | "inspection_date" | "person" | "inspection_location"
  | "document_number" | "asset" | "company"
  | "multiple_choice" | "text" | "number" | "checkbox" | "datetime"
  | "media" | "slider" | "annotation" | "signature" | "location"
  | "instruction" | "table";

type LogicOp = "is" | "is_not" | "is_selected" | "is_not_selected" | "is_one_of" | "is_not_one_of"
  | "lt" | "lte" | "eq" | "neq" | "gte" | "gt" | "between"
  | "checked" | "not_checked" | "exists" | "not_exists";
type LogicTrigger = "ask_questions" | "require_action" | "require_evidence" | "notify" | "skip_to_complete";

interface LogicRule {
  id: string; op: LogicOp; value: string; value2?: string;
  trigger: LogicTrigger;
  evidence_notes?: boolean; evidence_media?: boolean;
  notify_msg?: string;
}

interface OptionMeta { id: string; label: string; color: string; is_flagged: boolean; score: number | null }
interface TableColumn { id: string; label: string; type: string; options?: string[] }

interface TQuestion {
  id: string; text: string; type: AnyResponseType; required?: boolean;
  options?: string[]; option_meta?: OptionMeta[];
  flagged_responses?: string[]; score_map?: Record<string, number | null>;
  min?: number; max?: number; step?: number;
  table_columns?: TableColumn[];
  text_format?: "short" | "long";
  number_unit?: string;
  number_format?: "number" | "percentage" | "cost";
  include_date?: boolean; include_time?: boolean;
  doc_number_format?: string;
  logic_rules?: LogicRule[];
  nested_questions?: TQuestion[];
}

interface TSection {
  id: string; title: string; description?: string;
  is_title_page?: boolean; is_completion?: boolean;
  questions: TQuestion[];
  score_enabled?: boolean;
}

interface FormSchema { sections: TSection[]; header_image?: string }

interface AnswerState {
  value: string | number | boolean | string[] | null;
  note: string; is_flagged: boolean; media_urls: string[];
}

interface InspectionRecord {
  id: string; template_id: string; template_name: string;
  title: string; site: string; conducted_by: string; status: string;
  answers: Record<string, AnswerState>;
  flagged_items: FlaggedItem[];
  total_questions: number; answered_questions: number;
  score: number | null; started_at: string;
}

interface FlaggedItem {
  question_id: string; question_text: string; answer_value: string;
  note: string; action_created: boolean; skipped: boolean;
}

type Props = { user: User | null; onLogout: () => void };

// ── Helpers ───────────────────────────────────────────────────────────────────

function isFlagged(q: TQuestion, value: AnswerState["value"]): boolean {
  if (!q.flagged_responses?.length || value === null || value === undefined) return false;
  const s = Array.isArray(value) ? value.join(", ") : String(value);
  return q.flagged_responses.includes(s);
}

function evalRule(rule: LogicRule, value: AnswerState["value"]): boolean {
  const v = value === null || value === undefined ? "" : String(value);
  const num = parseFloat(v);
  switch (rule.op) {
    case "is": return v === rule.value;
    case "is_not": return v !== rule.value;
    case "is_selected": return v !== "" && value !== null;
    case "is_not_selected": return v === "" || value === null;
    case "is_one_of": return rule.value.split(",").map(s => s.trim()).includes(v);
    case "is_not_one_of": return !rule.value.split(",").map(s => s.trim()).includes(v);
    case "lt": return !isNaN(num) && num < parseFloat(rule.value);
    case "lte": return !isNaN(num) && num <= parseFloat(rule.value);
    case "eq": return !isNaN(num) && num === parseFloat(rule.value);
    case "neq": return !isNaN(num) && num !== parseFloat(rule.value);
    case "gte": return !isNaN(num) && num >= parseFloat(rule.value);
    case "gt": return !isNaN(num) && num > parseFloat(rule.value);
    case "between": return !isNaN(num) && num >= parseFloat(rule.value) && num <= parseFloat(rule.value2 ?? rule.value);
    case "checked": return value === true || v === "true" || v === "checked";
    case "not_checked": return value !== true && v !== "true" && v !== "checked";
    case "exists": return v !== "" && value !== null;
    case "not_exists": return v === "" || value === null;
    default: return false;
  }
}

function activeTriggers(q: TQuestion, value: AnswerState["value"]): Set<LogicTrigger> {
  const active = new Set<LogicTrigger>();
  for (const rule of q.logic_rules ?? []) {
    if (evalRule(rule, value)) active.add(rule.trigger);
  }
  return active;
}

function isAnswered(a: AnswerState | undefined): boolean {
  if (!a) return false;
  const v = a.value;
  return v !== null && v !== "" && !(Array.isArray(v) && v.length === 0);
}

function collectQids(questions: TQuestion[]): string[] {
  return questions.flatMap(q => [q.id, ...(q.nested_questions ? collectQids(q.nested_questions) : [])]);
}

function allQids(schema: FormSchema): string[] {
  return schema.sections.flatMap(s => collectQids(s.questions));
}

function scoreQuestions(questions: TQuestion[], answers: Record<string, AnswerState>): { earned: number; max: number } {
  let earned = 0; let max = 0;
  for (const q of questions) {
    if (q.type === "multiple_choice" && q.score_map) {
      const vals = Object.values(q.score_map).filter(v => v !== null) as number[];
      const qMax = vals.length ? Math.max(...vals) : 0;
      max += qMax;
      const ans = answers[q.id];
      if (ans?.value && q.score_map[ans.value as string] != null) {
        earned += q.score_map[ans.value as string] ?? 0;
      }
    }
    if (q.nested_questions?.length) {
      const sub = scoreQuestions(q.nested_questions, answers);
      earned += sub.earned; max += sub.max;
    }
  }
  return { earned, max };
}

function sectionScore(section: TSection, answers: Record<string, AnswerState>): { earned: number; max: number } {
  return scoreQuestions(section.questions, answers);
}

// ── Response Renderers ────────────────────────────────────────────────────────

function SiteInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <select value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full appearance-none rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100">
        <option value="">Select</option>
        <option>Site A</option><option>Site B</option><option>Site C</option>
      </select>
      <svg className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
}

function InspDateInput({ value, onChange, includeDate = true, includeTime = true }:
  { value: string; onChange: (v: string) => void; includeDate?: boolean; includeTime?: boolean }) {
  return (
    <input type={includeDate && includeTime ? "datetime-local" : includeDate ? "date" : "time"}
      value={value} onChange={e => onChange(e.target.value)}
      placeholder="Enter date and time"
      className="rounded-lg border border-brand-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100" />
  );
}

function DocNumberInput({ value, onChange, format }: { value: string; onChange: (v: string) => void; format?: string }) {
  const placeholder = format ? format.replace("[number]", "000001") : "000001";
  return (
    <input type="text" value={value || placeholder} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-64 rounded-lg border border-brand-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100" />
  );
}

function PersonInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input type="text" value={value} onChange={e => onChange(e.target.value)}
      className="w-64 rounded-lg border border-brand-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100" />
  );
}

function AssetInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full appearance-none rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100">
        <option value="">Select</option>
        <option>Asset 001</option><option>Asset 002</option>
      </select>
      <svg className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
}

function CompanyInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <div className="relative">
        <select value={value} onChange={e => onChange(e.target.value)}
          className="w-full appearance-none rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100">
          <option value="">Select company</option>
          <option>Company A</option><option>Company B</option>
        </select>
        <svg className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      <p className="flex items-center gap-1 text-xs text-gray-500">
        <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        Companies shown are limited to the type(s) specified in the template.
      </p>
    </div>
  );
}

function InspLocationInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2">
      <textarea value={value} onChange={e => onChange(e.target.value)}
        placeholder="Location" rows={2}
        className="flex-1 resize-none rounded-lg border border-brand-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100" />
      <button className="flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        Map
      </button>
    </div>
  );
}

function MultipleChoiceInput({ q, value, onChange }: { q: TQuestion; value: string | null; onChange: (v: string) => void }) {
  const opts = q.option_meta?.map(m => m.label) ?? q.options ?? ["Yes", "No", "N/A"];
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(opts.length, 4)}, 1fr)` }}>
      {opts.map(opt => {
        const active = value === opt;
        const meta = q.option_meta?.find(m => m.label === opt);
        const colorActive = meta?.color === "green" ? "border-green-500 bg-green-50 text-green-800"
          : meta?.color === "red" ? "border-red-400 bg-red-50 text-red-800"
          : meta?.color === "orange" ? "border-orange-400 bg-orange-50 text-orange-800"
          : meta?.color === "yellow" ? "border-yellow-400 bg-yellow-50 text-yellow-800"
          : "border-brand-500 bg-brand-50 text-brand-800";
        return (
          <button key={opt} onClick={() => onChange(active ? "" : opt)}
            className={`rounded-lg border-2 py-2.5 text-center text-sm font-semibold transition-all ${active ? colorActive : "border-brand-200 bg-white text-brand-700 hover:border-brand-300 hover:bg-brand-50"}`}>
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function TextAnswerInput({ value, onChange, format }: { value: string; onChange: (v: string) => void; format?: "short" | "long" }) {
  if (format === "long") {
    return (
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={4}
        placeholder="Type your answer here…"
        className="w-full resize-none rounded-lg border border-brand-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100" />
    );
  }
  return (
    <input type="text" value={value} onChange={e => onChange(e.target.value)}
      className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100" />
  );
}

function NumberAnswerInput({ value, onChange, unit }: { value: string; onChange: (v: string) => void; unit?: string }) {
  return (
    <div className="flex items-center gap-0">
      <input type="number" value={value} onChange={e => onChange(e.target.value)}
        className={`w-48 rounded-l-lg border border-brand-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 ${unit ? "" : "rounded-r-lg"}`} />
      {unit && (
        <span className="flex items-center rounded-r-lg border border-l-0 border-brand-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
          {unit}
        </span>
      )}
    </div>
  );
}

function CheckboxAnswerInput({ q, value, onChange }: { q: TQuestion; value: string | boolean; onChange: (v: boolean) => void }) {
  const checked = value === true || value === "checked" || value === "true";
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        className="h-5 w-5 rounded border-brand-300 accent-brand-600" />
      <span className="text-sm text-gray-700">{q.text}</span>
    </label>
  );
}

function DateTimeAnswerInput({ value, onChange, includeDate = true, includeTime = true }:
  { value: string; onChange: (v: string) => void; includeDate?: boolean; includeTime?: boolean }) {
  return (
    <input type={includeDate && includeTime ? "datetime-local" : includeDate ? "date" : "time"}
      value={value} onChange={e => onChange(e.target.value)}
      placeholder="Enter date and time"
      className="rounded-lg border border-brand-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100" />
  );
}

function MediaAnswerInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div>
      <button onClick={() => { const url = prompt("Enter file URL (demo):"); if (url) onChange([...value, url]); }}
        className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Add media
      </button>
      {value.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
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

function SliderAnswerInput({ q, value, onChange }: { q: TQuestion; value: string; onChange: (v: string) => void }) {
  const min = q.min ?? 1; const max = q.max ?? 10; const step = q.step ?? 1;
  const num = value !== "" ? Number(value) : min;
  return (
    <div className="max-w-sm space-y-1">
      <input type="range" min={min} max={max} step={step} value={num}
        onChange={e => onChange(e.target.value)}
        className="w-full accent-brand-600" />
      <div className="flex justify-between text-sm text-gray-500">
        <span>{min}</span>
        <span className="text-xl font-bold text-gray-800">{num}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

function AnnotationInput() {
  return (
    <div className="flex justify-end">
      <button className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
        Annotate
      </button>
    </div>
  );
}

function SignatureAnswerInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2">
      <input type="text" value={value} onChange={e => onChange(e.target.value)}
        placeholder="Name"
        className="flex-1 rounded-l-lg border border-brand-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100" />
      <button className="flex shrink-0 items-center gap-2 rounded-r-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
        Add signature
      </button>
    </div>
  );
}

function LocationAnswerInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2">
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={2}
        className="flex-1 resize-none rounded-lg border border-brand-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100" />
      <button onClick={() => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(pos => onChange(`${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`));
      }} className="flex shrink-0 items-center gap-1.5 self-start rounded-lg bg-brand-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        Map
      </button>
    </div>
  );
}

function TableAnswerInput({ q, value, onChange }: {
  q: TQuestion; value: Record<number, Record<string, string>>;
  onChange: (v: Record<number, Record<string, string>>) => void;
}) {
  const cols = q.table_columns ?? [];
  const rows = Math.max(Object.keys(value).length, 1);

  function setCell(row: number, colId: string, v: string) {
    const next = { ...value, [row]: { ...(value[row] ?? {}), [colId]: v } };
    onChange(next);
  }
  function addRow() {
    onChange({ ...value, [rows]: {} });
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            {cols.map(c => (
              <th key={c.id} className="border border-gray-200 bg-gray-50 px-3 py-2.5 text-left text-sm font-semibold text-gray-600">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, ri) => (
            <tr key={ri}>
              {cols.map(c => (
                <td key={c.id} className="border border-gray-100 px-2 py-1">
                  {c.type === "multiple_choice" && c.options ? (
                    <select value={value[ri]?.[c.id] ?? ""}
                      onChange={e => setCell(ri, c.id, e.target.value)}
                      className="w-full rounded border border-brand-200 px-2 py-1 text-xs outline-none focus:border-brand-400">
                      <option value="" />
                      {c.options.map(o => <option key={o}>{o}</option>)}
                    </select>
                  ) : c.type === "checkbox" ? (
                    <input type="checkbox"
                      checked={value[ri]?.[c.id] === "true"}
                      onChange={e => setCell(ri, c.id, String(e.target.checked))}
                      className="accent-brand-600" />
                  ) : c.type === "number" ? (
                    <input type="number" value={value[ri]?.[c.id] ?? ""}
                      onChange={e => setCell(ri, c.id, e.target.value)}
                      className="w-full rounded border border-brand-200 px-2 py-1 text-xs outline-none focus:border-brand-400" />
                  ) : (
                    <input type="text" value={value[ri]?.[c.id] ?? ""}
                      onChange={e => setCell(ri, c.id, e.target.value)}
                      className="w-full rounded border border-brand-200 px-2 py-1 text-xs outline-none focus:border-brand-400" />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={addRow}
        className="mt-2 flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-800">
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
        Add row
      </button>
    </div>
  );
}

// ── Question Card ─────────────────────────────────────────────────────────────

function QuestionCard({ q, ans, noteOpen, onAnswer, onNote, onMedia, onToggleNote, onCreateAction, requireAction, requireEvidence }:
  {
    q: TQuestion; ans: AnswerState; noteOpen: boolean;
    requireAction?: boolean; requireEvidence?: boolean;
    onAnswer: (v: AnswerState["value"]) => void; onNote: (v: string) => void;
    onMedia: (v: string[]) => void; onToggleNote: () => void; onCreateAction: () => void;
  }) {
  const answered = isAnswered(ans);
  const flagged = ans.is_flagged;
  const requiredUnfilled = (q.required ?? false) && !answered;

  const renderInput = () => {
    const v = (ans.value ?? "") as string;
    switch (q.type) {
      case "site": return <SiteInput value={v} onChange={onAnswer} />;
      case "inspection_date": return <InspDateInput value={v} onChange={onAnswer} includeDate={q.include_date ?? true} includeTime={q.include_time ?? true} />;
      case "document_number": return <DocNumberInput value={v} onChange={onAnswer} format={q.doc_number_format} />;
      case "person": return <PersonInput value={v} onChange={onAnswer} />;
      case "asset": return <AssetInput value={v} onChange={onAnswer} />;
      case "company": return <CompanyInput value={v} onChange={onAnswer} />;
      case "inspection_location": return <InspLocationInput value={v} onChange={onAnswer} />;
      case "multiple_choice": return <MultipleChoiceInput q={q} value={v || null} onChange={onAnswer} />;
      case "text": return <TextAnswerInput value={v} onChange={onAnswer} format={q.text_format} />;
      case "number": return <NumberAnswerInput value={v} onChange={onAnswer} unit={q.number_unit} />;
      case "checkbox": return <CheckboxAnswerInput q={q} value={ans.value as boolean} onChange={onAnswer} />;
      case "datetime": return <DateTimeAnswerInput value={v} onChange={onAnswer} includeDate={q.include_date ?? true} includeTime={q.include_time ?? true} />;
      case "media": return <MediaAnswerInput value={ans.media_urls ?? []} onChange={onMedia} />;
      case "slider": return <SliderAnswerInput q={q} value={v} onChange={onAnswer} />;
      case "annotation": return <AnnotationInput />;
      case "signature": return <SignatureAnswerInput value={v} onChange={onAnswer} />;
      case "location": return <LocationAnswerInput value={v} onChange={onAnswer} />;
      case "instruction": return null;
      case "table": return (
        <TableAnswerInput q={q}
          value={(ans.value as unknown as Record<number, Record<string, string>>) ?? {}}
          onChange={v => onAnswer(v as unknown as AnswerState["value"])} />
      );
      default: return null;
    }
  };

  return (
    <div className={`overflow-hidden rounded-xl border bg-white shadow-sm transition-all ${
      flagged ? "border-red-200" : requiredUnfilled ? "border-l-4 border-l-red-400 border-brand-100" : answered ? "border-brand-200" : "border-brand-100"
    }`}>
      <div className="p-4">
        {/* Question label — for checkbox, label is shown in the input itself */}
        {q.type !== "checkbox" && (
          <p className={`mb-3 font-medium text-sm ${flagged ? "text-red-800" : "text-gray-800"}`}>
            {q.required && <span className="mr-0.5 text-red-500">*</span>}
            {q.text}
          </p>
        )}
        {flagged && (
          <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-red-600">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 21l1.9-5.7a8.5 8.5 0 113.8 3.8z" /></svg>
            This response has been flagged
          </p>
        )}
        {requireAction && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            <span className="flex-1">An action is required for this response</span>
            <button onClick={onCreateAction} className="shrink-0 rounded bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-700">Create action</button>
          </div>
        )}
        {requireEvidence && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700">
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            Evidence required — add a note or attach media
          </div>
        )}
        {renderInput()}
      </div>

      {/* Note */}
      {noteOpen && (
        <div className="border-t border-brand-50 px-4 py-3">
          <textarea value={ans.note} onChange={e => onNote(e.target.value)} rows={2} autoFocus
            placeholder="Add a note or observation…"
            className="w-full resize-none rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200" />
        </div>
      )}

      {/* Footer */}
      <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 px-5 py-3">
        <button onClick={onToggleNote}
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${ans.note ? "bg-amber-100 text-amber-700" : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"}`}>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          {ans.note ? "Edit note" : "Add note"}
        </button>
        {q.type !== "media" && (
          <button onClick={() => { const u = prompt("Enter media URL (demo):"); if (u) onMedia([...(ans.media_urls ?? []), u]); }}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-400 transition hover:bg-gray-50 hover:text-gray-600">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            Attach media
          </button>
        )}
        <button onClick={onCreateAction}
          className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium text-gray-400 transition hover:bg-gray-50 hover:text-gray-600">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          Create action
        </button>
        {(ans.media_urls?.length ?? 0) > 0 && (
          <span className="ml-auto text-xs text-gray-500">{ans.media_urls.length} file{ans.media_urls.length > 1 ? "s" : ""}</span>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function InspectionConductPage({ user, onLogout: _onLogout }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [inspection, setInspection] = useState<InspectionRecord | null>(null);
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [page, setPage] = useState(0);
  const [noteOpen, setNoteOpen] = useState<string | null>(null);
  const [showFlagged, setShowFlagged] = useState(false);
  const [showStartModal, setShowStartModal] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!id) return;
    api<InspectionRecord>(`/api/inspections/${id}`).then(insp => {
      setInspection(insp);
      const existing: Record<string, AnswerState> = {};
      for (const [k, v] of Object.entries(insp.answers ?? {})) existing[k] = v as AnswerState;
      setAnswers(existing);
    });
    api<{ template: FormSchema; name: string; description: string }>(`/api/inspections/${id}/template`).then(res => {
      setSchema(res.template);
      setTemplateName(res.name);
      setTemplateDescription(res.description ?? "");
    });
  }, [id]);

  const saveAnswers = useCallback((current: Record<string, AnswerState>) => {
    if (!id) return;
    api(`/api/inspections/${id}/answers`, {
      method: "PATCH",
      body: JSON.stringify({ answers: Object.fromEntries(Object.entries(current).map(([k, v]) => [k, { value: v.value, note: v.note, is_flagged: v.is_flagged, media_urls: v.media_urls }])) }),
    }).then(() => setLastSaved(new Date())).catch(() => null);
  }, [id]);

  function setAnswer(qid: string, value: AnswerState["value"], q: TQuestion) {
    const flagged = isFlagged(q, value);
    setAnswers(prev => {
      const next = { ...prev, [qid]: { ...prev[qid], value, is_flagged: flagged, note: prev[qid]?.note ?? "", media_urls: prev[qid]?.media_urls ?? [] } };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => saveAnswers(next), 800);
      return next;
    });
  }

  function setNote(qid: string, note: string) {
    setAnswers(prev => {
      const next = { ...prev, [qid]: { ...prev[qid], note } };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => saveAnswers(next), 800);
      return next;
    });
  }

  function setMediaUrls(qid: string, media_urls: string[]) {
    setAnswers(prev => { const next = { ...prev, [qid]: { ...prev[qid], media_urls } }; saveAnswers(next); return next; });
  }

  function collectFlagged(questions: TQuestion[], flaggedItems: FlaggedItem[]) {
    for (const q of questions) {
      const ans = answers[q.id];
      if (ans?.is_flagged) flaggedItems.push({ question_id: q.id, question_text: q.text, answer_value: String(ans.value), note: ans.note ?? "", action_created: false, skipped: false });
      if (q.nested_questions?.length) {
        const triggers = activeTriggers(q, ans?.value ?? null);
        if (triggers.has("ask_questions")) collectFlagged(q.nested_questions, flaggedItems);
      }
    }
  }

  function handleComplete() {
    if (!schema) return;
    const flaggedItems: FlaggedItem[] = [];
    for (const section of schema.sections) collectFlagged(section.questions, flaggedItems);
    setInspection(prev => prev ? { ...prev, flagged_items: flaggedItems } : prev);
    setShowFlagged(true);
  }

  async function confirmComplete(finalFlagged: FlaggedItem[]) {
    if (!id) return;
    setCompleting(true);
    try {
      await api(`/api/inspections/${id}/complete`, { method: "POST", body: JSON.stringify({ flagged_items: finalFlagged }) });
      navigate(`/inspections/report/${id}`);
    } catch { setCompleting(false); }
  }

  if (!inspection || !schema) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
          <p className="text-sm text-gray-500">Loading inspection…</p>
        </div>
      </div>
    );
  }

  const sections = schema.sections;
  const totalPages = sections.length;
  const currentSection = sections[page] ?? sections[0];
  const totalQ = allQids(schema).length;
  const answeredQ = Object.values(answers).filter(a => isAnswered(a)).length;
  const pct = totalQ > 0 ? Math.round((answeredQ / totalQ) * 100) : 0;
  const flaggedCount = Object.values(answers).filter(a => a?.is_flagged).length;
  const { earned: secEarned, max: secMax } = sectionScore(currentSection, answers);
  const saveLabelText = lastSaved ? `Saved ${lastSaved.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}` : "Auto-saves as you go";
  const isLastPage = page === totalPages - 1;
  const isFirstPage = page === 0;
  const headerImage = schema.header_image;
  const nonFixedSections = sections.filter(s => !s.is_title_page && !s.is_completion).length;

  // ── Start modal ──────────────────────────────────────────────────────────────
  if (showStartModal) {
    return (
      <div className="flex h-screen flex-col bg-gray-50">
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-6 shadow-sm">
          <button onClick={() => navigate("/inspections")}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            Back
          </button>
        </header>

        {/* Centered card */}
        <div className="flex flex-1 items-center justify-center overflow-y-auto p-6">
          <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-[0_24px_64px_rgba(0,0,0,0.12)]">

            {/* Image area */}
            <div className="relative flex h-56 w-full items-center justify-center overflow-hidden bg-gradient-to-br from-brand-50 to-brand-100">
              {headerImage ? (
                <img src={headerImage} alt={templateName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white/70 shadow-sm">
                    <svg className="h-12 w-12 text-brand-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                    </svg>
                  </div>
                </div>
              )}
              {/* Gradient overlay at bottom for blending into card */}
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white/40 to-transparent" />
            </div>

            {/* Content */}
            <div className="px-8 pb-8 pt-6">
              <h1 className="font-display text-2xl font-bold leading-tight text-brand-900">{templateName}</h1>
              {templateDescription && (
                <p className="mt-3 text-sm leading-relaxed text-gray-600">{templateDescription}</p>
              )}

              {/* Stats */}
              <div className="mt-5 flex items-center gap-4 border-t border-gray-100 pt-5">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h10" /></svg>
                  </span>
                  <span><strong className="font-semibold text-gray-800">{nonFixedSections}</strong> section{nonFixedSections !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </span>
                  <span><strong className="font-semibold text-gray-800">{totalQ}</strong> question{totalQ !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </span>
                  <span>{inspection.site || <span className="italic text-gray-400">No site set</span>}</span>
                </div>
              </div>

              {/* Start button */}
              <button
                onClick={() => setShowStartModal(false)}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800 active:scale-[0.98]">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" /></svg>
                Start Inspection
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-brand-100 bg-white px-4 shadow-sm">
        <button onClick={() => navigate("/inspections")}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-brand-600 hover:bg-brand-50">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Back
        </button>
        <div className="flex flex-1 min-w-0 items-center gap-2">
          <span className="truncate font-display text-base font-semibold text-brand-900">{templateName || inspection.title}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2">
            <div className="h-1.5 w-28 rounded-full bg-brand-100">
              <div className="h-1.5 rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-medium text-gray-600">{pct}%</span>
          </div>
          <span className="hidden text-xs text-gray-500 sm:block">{saveLabelText}</span>
          {flaggedCount > 0 && (
            <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">{flaggedCount} flagged</span>
          )}
          <button onClick={handleComplete}
            className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800">
            Complete
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Left sidebar — section nav */}
        <aside className="hidden w-56 shrink-0 flex-col border-r border-brand-100 bg-white md:flex">
          <div className="flex-1 overflow-y-auto py-2">
            {sections.map((s, idx) => {
              const sAns = s.questions.filter(q => isAnswered(answers[q.id])).length;
              const done = sAns === s.questions.length && s.questions.length > 0;
              const active = page === idx;
              return (
                <button key={s.id} onClick={() => setPage(idx)}
                  className={`mb-0.5 flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm transition ${active ? "bg-brand-700 text-white" : "text-gray-700 hover:bg-brand-50"}`}>
                  <span className={`mt-0.5 shrink-0 text-xs font-bold ${active ? "text-white" : done ? "text-green-500" : "text-gray-400"}`}>
                    {done ? "✓" : `${sAns}/${s.questions.length}`}
                  </span>
                  <span className="min-w-0 truncate leading-snug">{s.title}</span>
                </button>
              );
            })}
          </div>
          <div className="border-t border-brand-100 px-3 py-3">
            <div className="mb-1.5 flex justify-between text-xs text-gray-500">
              <span>{answeredQ} of {totalQ}</span><span>{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-brand-100">
              <div className="h-1.5 rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-5 py-5 md:px-8">

            {/* Page header */}
            <div className="mb-6 flex items-start justify-between">
              <div>
                <button onClick={() => { }} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
                  <svg className={`h-3.5 w-3.5 transition-transform ${true ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                  Page {page + 1} of {totalPages}
                </button>
                <h2 className="mt-1 font-display text-lg font-bold text-brand-900">{currentSection.title}</h2>
                {currentSection.description && (
                  <p className="mt-1 text-sm text-gray-500">{currentSection.description}</p>
                )}
              </div>
              {secMax > 0 && (
                <div className="text-right">
                  <p className="text-sm text-gray-500">Score</p>
                  <p className="text-base font-bold text-gray-800">
                    {secEarned} / {secMax} ({secMax > 0 ? Math.round((secEarned / secMax) * 100) : 0}%)
                  </p>
                </div>
              )}
            </div>

            {/* Questions */}
            <div className="space-y-4">
              {currentSection.questions.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-200 py-12 text-center text-gray-400">
                  <p className="font-medium">No questions in this section</p>
                </div>
              )}
              {(function renderQList(questions: TQuestion[], depth: number): React.ReactNode {
                return questions.map(q => {
                  const ans = answers[q.id] ?? { value: null, note: "", is_flagged: false, media_urls: [] };
                  const triggers = activeTriggers(q, ans.value);
                  const showNested = triggers.has("ask_questions") && (q.nested_questions?.length ?? 0) > 0;
                  return (
                    <React.Fragment key={q.id}>
                      <QuestionCard
                        q={q} ans={ans} noteOpen={noteOpen === q.id}
                        requireAction={triggers.has("require_action")}
                        requireEvidence={triggers.has("require_evidence")}
                        onAnswer={v => setAnswer(q.id, v, q)}
                        onNote={v => setNote(q.id, v)}
                        onMedia={v => setMediaUrls(q.id, v)}
                        onToggleNote={() => setNoteOpen(noteOpen === q.id ? null : q.id)}
                        onCreateAction={() => navigate(`/actions?prefill=${encodeURIComponent(`${q.text} — ${ans.value ?? ""}`)}`)}
                      />
                      {showNested && (
                        <div className={`space-y-3 ${depth === 0 ? "ml-6 border-l-2 border-brand-300 pl-4" : "ml-4 border-l border-brand-200 pl-3"}`}>
                          {renderQList(q.nested_questions!, depth + 1)}
                        </div>
                      )}
                    </React.Fragment>
                  );
                });
              })(currentSection.questions, 0)}
            </div>

            {/* Page navigation */}
            <div className="mt-8 flex items-center justify-between">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={isFirstPage}
                className="flex items-center gap-2 rounded-lg border border-brand-200 px-4 py-2.5 text-sm font-medium text-brand-700 transition hover:bg-brand-50 disabled:opacity-30">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                Previous Page
              </button>
              {!isLastPage ? (
                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  className="flex items-center gap-2 rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800">
                  Next Page
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </button>
              ) : (
                <button onClick={handleComplete}
                  className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700">
                  Complete inspection ✓
                </button>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Flagged review panel */}
      {showFlagged && inspection && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className={`rounded-t-2xl px-6 py-4 ${(inspection.flagged_items?.length ?? 0) > 0 ? "bg-red-600" : "bg-green-600"}`}>
              <h2 className="font-display text-xl font-bold text-white">
                {(inspection.flagged_items?.length ?? 0) > 0 ? "⚑ Flagged Items Review" : "✓ Inspection Ready"}
              </h2>
              <p className="mt-0.5 text-sm text-white/80">
                {(inspection.flagged_items?.length ?? 0) > 0 ? `${inspection.flagged_items.length} item${inspection.flagged_items.length !== 1 ? "s" : ""} need attention` : "No flagged items — all responses within acceptable range"}
              </p>
            </div>
            <div className="max-h-80 overflow-y-auto px-6 py-4">
              {(inspection.flagged_items?.length ?? 0) === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-3xl mb-2">✅</p>
                  <p className="font-semibold text-gray-700">No issues found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {inspection.flagged_items.map((item, idx) => (
                    <div key={item.question_id} className={`rounded-xl border p-4 ${item.skipped ? "border-gray-200 bg-gray-50" : "border-red-200 bg-red-50"}`}>
                      <div className="flex items-start gap-3">
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${item.skipped ? "bg-gray-200 text-gray-500" : "bg-red-200 text-red-700"}`}>{idx + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-brand-900">{item.question_text}</p>
                          <p className="mt-0.5 text-sm text-gray-600">Answer: <span className="font-semibold text-red-700">"{item.answer_value}"</span></p>
                          {item.note && <p className="mt-0.5 text-xs text-gray-500">Note: {item.note}</p>}
                        </div>
                        {!item.skipped ? (
                          <div className="flex shrink-0 flex-col gap-1.5">
                            <button onClick={() => navigate(`/actions?prefill=${encodeURIComponent(`${item.question_text} — ${item.answer_value}`)}`)}
                              className="whitespace-nowrap rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-800">Create action</button>
                            <button onClick={() => setInspection(prev => prev ? { ...prev, flagged_items: prev.flagged_items.map((f, i) => i === idx ? { ...f, skipped: true } : f) } : prev)}
                              className="whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">Skip</button>
                          </div>
                        ) : (
                          <span className="shrink-0 rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-500">Skipped</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-brand-100 px-6 py-4">
              <button onClick={() => setShowFlagged(false)} className="text-sm text-gray-600 hover:text-gray-800">← Back</button>
              <div className="flex gap-2">
                {(inspection.flagged_items?.length ?? 0) > 0 && (
                  <button onClick={() => setInspection(prev => prev ? { ...prev, flagged_items: prev.flagged_items.map(f => ({ ...f, skipped: true })) } : prev)}
                    className="rounded-lg border border-brand-200 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50">Skip all</button>
                )}
                <button onClick={() => confirmComplete(inspection.flagged_items ?? [])} disabled={completing}
                  className="rounded-lg bg-brand-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50">
                  {completing ? "Completing…" : "Complete inspection →"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
