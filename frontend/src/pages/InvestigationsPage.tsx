import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { api } from "../api";
import type { User } from "../types";

type Props = { user: User | null; onLogout: () => void };

interface InvolvedParty {
  name: string;
  role: string;
  statement: string;
}

interface RootCause {
  category: string;
  description: string;
}

interface CorrectiveAction {
  title: string;
  assigned_to: string;
  due_date: string;
  status: string;
}

interface Investigation {
  id: string;
  title: string;
  incident_date: string;
  incident_type: string;
  severity: string;
  site: string;
  description: string;
  involved_parties: InvolvedParty[];
  immediate_actions: string;
  root_causes: RootCause[];
  corrective_actions: CorrectiveAction[];
  linked_issue_id: string | null;
  status: string;
  created_by: string;
  created_at: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-700 border border-red-200",
  high: "bg-orange-100 text-orange-700 border border-orange-200",
  medium: "bg-amber-100 text-amber-700 border border-amber-200",
  low: "bg-green-100 text-green-700 border border-green-200",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  closed: "bg-gray-100 text-gray-700",
};

const TYPE_COLORS: Record<string, string> = {
  near_miss: "bg-orange-100 text-orange-700",
  injury: "bg-red-100 text-red-700",
  property_damage: "bg-purple-100 text-purple-700",
  environmental: "bg-brand-100 text-brand-700",
  other: "bg-gray-100 text-gray-600",
};

const fmt = (d: string) =>
  new Date(d).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });

const EMPTY_STEP1 = {
  title: "",
  incident_date: "",
  incident_type: "near_miss",
  severity: "medium",
  site: "",
  description: "",
};

const EMPTY_STEP3 = {
  immediate_actions: "",
};

export default function InvestigationsPage({ user, onLogout }: Props) {
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [showPanel, setShowPanel] = useState(false);
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState<Investigation | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Multi-step form state
  const [step1, setStep1] = useState({ ...EMPTY_STEP1 });
  const [parties, setParties] = useState<InvolvedParty[]>([]);
  const [step3, setStep3] = useState({ ...EMPTY_STEP3 });
  const [rootCauses, setRootCauses] = useState<RootCause[]>([]);
  const [correctiveActions, setCorrectiveActions] = useState<CorrectiveAction[]>([]);

  const load = () => {
    const params = new URLSearchParams();
    if (filterStatus !== "all") params.set("status", filterStatus);
    if (filterSeverity !== "all") params.set("severity", filterSeverity);
    api<Investigation[]>(`/api/investigations?${params}`).then(setInvestigations).catch(() => null);
  };

  useEffect(load, [filterStatus, filterSeverity]);

  const stats = {
    total: investigations.length,
    open: investigations.filter((i) => i.status === "open").length,
    in_progress: investigations.filter((i) => i.status === "in_progress").length,
    closed: investigations.filter((i) => i.status === "closed").length,
  };

  const resetPanel = () => {
    setStep(1);
    setStep1({ ...EMPTY_STEP1 });
    setParties([]);
    setStep3({ ...EMPTY_STEP3 });
    setRootCauses([]);
    setCorrectiveActions([]);
    setError("");
  };

  const openPanel = () => { resetPanel(); setShowPanel(true); };
  const closePanel = () => { setShowPanel(false); resetPanel(); };

  // Parties helpers
  const addParty = () => setParties((p) => [...p, { name: "", role: "", statement: "" }]);
  const removeParty = (i: number) => setParties((p) => p.filter((_, idx) => idx !== i));
  const updateParty = (i: number, field: keyof InvolvedParty, val: string) =>
    setParties((p) => p.map((party, idx) => idx === i ? { ...party, [field]: val } : party));

  // Root cause helpers
  const addRootCause = () => setRootCauses((r) => [...r, { category: "Human", description: "" }]);
  const removeRootCause = (i: number) => setRootCauses((r) => r.filter((_, idx) => idx !== i));
  const updateRootCause = (i: number, field: keyof RootCause, val: string) =>
    setRootCauses((r) => r.map((rc, idx) => idx === i ? { ...rc, [field]: val } : rc));

  // Corrective action helpers
  const addCA = () => setCorrectiveActions((c) => [...c, { title: "", assigned_to: "", due_date: "", status: "open" }]);
  const removeCA = (i: number) => setCorrectiveActions((c) => c.filter((_, idx) => idx !== i));
  const updateCA = (i: number, field: keyof CorrectiveAction, val: string) =>
    setCorrectiveActions((c) => c.map((ca, idx) => idx === i ? { ...ca, [field]: val } : ca));

  const handleNext = () => {
    setError("");
    if (step === 1) {
      if (!step1.title.trim()) { setError("Title is required"); return; }
      if (!step1.incident_date) { setError("Incident date is required"); return; }
      if (!step1.description.trim()) { setError("Description is required"); return; }
    }
    setStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError("");
    try {
      await api<Investigation>("/api/investigations", {
        method: "POST",
        body: JSON.stringify({
          ...step1,
          involved_parties: parties,
          immediate_actions: step3.immediate_actions,
          root_causes: rootCauses,
          corrective_actions: correctiveActions,
          created_by: user?.id ?? "u-tech",
        }),
      });
      closePanel();
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to submit investigation");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout user={user} title="Investigations" onLogout={onLogout}>
      {/* Stats bar */}
      <div className="mb-5 grid grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-brand-900", bg: "bg-white" },
          { label: "Open", value: stats.open, color: "text-yellow-700", bg: "bg-yellow-50" },
          { label: "In Progress", value: stats.in_progress, color: "text-blue-700", bg: "bg-blue-50" },
          { label: "Closed", value: stats.closed, color: "text-gray-600", bg: "bg-gray-50" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border border-brand-100 ${s.bg} px-4 py-3`}>
            <p className="text-xs font-medium text-brand-500">{s.label}</p>
            <p className={`mt-0.5 text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters + button */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-sm text-brand-800"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="closed">Closed</option>
          </select>
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-sm text-brand-800"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <button
          onClick={openPanel}
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
        >
          + New Investigation
        </button>
      </div>

      {/* Investigation cards */}
      <div className="space-y-2">
        {investigations.length === 0 && (
          <div className="rounded-xl border border-brand-100 bg-white p-8 text-center text-brand-400">
            No investigations found.
          </div>
        )}
        {investigations.map((inv) => (
          <div
            key={inv.id}
            onClick={() => setSelected(inv)}
            className="cursor-pointer rounded-xl border border-brand-100 bg-white p-4 shadow-sm transition-colors hover:border-brand-300"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-brand-900">{inv.title}</span>
                  <span className={`rounded px-1.5 py-0.5 text-xs font-semibold capitalize ${TYPE_COLORS[inv.incident_type] ?? "bg-gray-100 text-gray-600"}`}>
                    {inv.incident_type.replace(/_/g, " ")}
                  </span>
                  <span className={`rounded px-1.5 py-0.5 text-xs font-semibold capitalize ${SEVERITY_COLORS[inv.severity] ?? "bg-gray-100 text-gray-600"}`}>
                    {inv.severity}
                  </span>
                  <span className={`rounded px-1.5 py-0.5 text-xs font-semibold capitalize ${STATUS_COLORS[inv.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {inv.status.replace(/_/g, " ")}
                  </span>
                  {inv.linked_issue_id && (
                    <span className="rounded bg-brand-100 px-1.5 py-0.5 text-xs font-medium text-brand-700">
                      Issue: {inv.linked_issue_id}
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-brand-400">
                  {inv.site && <span>Site: {inv.site}</span>}
                  <span>Date: {fmt(inv.incident_date)}</span>
                  <span>Created: {fmt(inv.created_at)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── New Investigation Panel ─────────────────────────────────────── */}
      {showPanel && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
          <div className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
            {/* Panel header */}
            <div className="flex items-center justify-between border-b border-brand-100 px-6 py-4">
              <div>
                <h2 className="font-display text-lg font-bold text-brand-900">New Investigation</h2>
                <div className="mt-1 flex items-center gap-1">
                  {[1, 2, 3, 4].map((s) => (
                    <div key={s} className="flex items-center gap-1">
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                          s === step
                            ? "bg-brand-700 text-white"
                            : s < step
                            ? "bg-brand-200 text-brand-700"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {s < step ? (
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : s}
                      </div>
                      {s < 4 && <div className={`h-px w-4 ${s < step ? "bg-brand-400" : "bg-gray-200"}`} />}
                    </div>
                  ))}
                  <span className="ml-2 text-xs text-brand-500">
                    {step === 1 && "Incident Details"}
                    {step === 2 && "Involved Parties"}
                    {step === 3 && "Root Cause & Actions"}
                    {step === 4 && "Review & Submit"}
                  </span>
                </div>
              </div>
              <button onClick={closePanel} className="text-xl text-brand-400 hover:text-brand-700">✕</button>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {error && <p className="mb-4 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}

              {/* Step 1 */}
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-brand-600">Title *</label>
                    <input
                      value={step1.title}
                      onChange={(e) => setStep1((s) => ({ ...s, title: e.target.value }))}
                      placeholder="Brief description of the incident"
                      className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-brand-600">Incident Date *</label>
                      <input
                        type="date"
                        value={step1.incident_date}
                        onChange={(e) => setStep1((s) => ({ ...s, incident_date: e.target.value }))}
                        className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-brand-600">Site / Location</label>
                      <input
                        value={step1.site}
                        onChange={(e) => setStep1((s) => ({ ...s, site: e.target.value }))}
                        placeholder="e.g. Rig Floor A"
                        className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-brand-600">Incident Type</label>
                      <select
                        value={step1.incident_type}
                        onChange={(e) => setStep1((s) => ({ ...s, incident_type: e.target.value }))}
                        className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
                      >
                        <option value="near_miss">Near Miss</option>
                        <option value="injury">Injury</option>
                        <option value="property_damage">Property Damage</option>
                        <option value="environmental">Environmental</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-brand-600">Severity</label>
                      <select
                        value={step1.severity}
                        onChange={(e) => setStep1((s) => ({ ...s, severity: e.target.value }))}
                        className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
                      >
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-brand-600">Description *</label>
                    <textarea
                      value={step1.description}
                      onChange={(e) => setStep1((s) => ({ ...s, description: e.target.value }))}
                      rows={4}
                      placeholder="Describe what happened in detail…"
                      className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                  </div>
                </div>
              )}

              {/* Step 2 */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-brand-700">Involved Parties</p>
                    <button
                      onClick={addParty}
                      className="rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100"
                    >
                      + Add Party
                    </button>
                  </div>
                  {parties.length === 0 && (
                    <p className="rounded-xl border border-dashed border-brand-200 p-6 text-center text-sm text-brand-400">
                      No involved parties added. Click "+ Add Party" to add one.
                    </p>
                  )}
                  {parties.map((party, i) => (
                    <div key={i} className="rounded-xl border border-brand-100 bg-brand-50 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">Party {i + 1}</span>
                        <button
                          onClick={() => removeParty(i)}
                          className="text-xs text-red-400 hover:text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-brand-600">Name</label>
                          <input
                            value={party.name}
                            onChange={(e) => updateParty(i, "name", e.target.value)}
                            placeholder="Full name"
                            className="w-full rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-brand-600">Role</label>
                          <input
                            value={party.role}
                            onChange={(e) => updateParty(i, "role", e.target.value)}
                            placeholder="e.g. Operator, Witness"
                            className="w-full rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-brand-600">Statement</label>
                        <textarea
                          value={party.statement}
                          onChange={(e) => updateParty(i, "statement", e.target.value)}
                          rows={2}
                          placeholder="Their account of the incident…"
                          className="w-full rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Step 3 */}
              {step === 3 && (
                <div className="space-y-5">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-brand-600">Immediate Actions Taken</label>
                    <textarea
                      value={step3.immediate_actions}
                      onChange={(e) => setStep3((s) => ({ ...s, immediate_actions: e.target.value }))}
                      rows={3}
                      placeholder="What was done immediately after the incident…"
                      className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                  </div>

                  {/* Root causes */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-brand-700">Root Causes</p>
                      <button
                        onClick={addRootCause}
                        className="rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100"
                      >
                        + Add Root Cause
                      </button>
                    </div>
                    {rootCauses.length === 0 && (
                      <p className="rounded-xl border border-dashed border-brand-200 p-4 text-center text-sm text-brand-400">
                        No root causes added yet.
                      </p>
                    )}
                    {rootCauses.map((rc, i) => (
                      <div key={i} className="mb-3 rounded-xl border border-brand-100 bg-brand-50 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-brand-500">Root Cause {i + 1}</span>
                          <button onClick={() => removeRootCause(i)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-brand-600">Category</label>
                            <select
                              value={rc.category}
                              onChange={(e) => updateRootCause(i, "category", e.target.value)}
                              className="w-full rounded-lg border border-brand-200 bg-white px-2 py-1.5 text-sm"
                            >
                              {["Human", "Equipment", "Environment", "Process", "Management"].map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>
                          <div className="col-span-2">
                            <label className="mb-1 block text-xs font-semibold text-brand-600">Description</label>
                            <input
                              value={rc.description}
                              onChange={(e) => updateRootCause(i, "description", e.target.value)}
                              placeholder="Describe the root cause…"
                              className="w-full rounded-lg border border-brand-200 bg-white px-2 py-1.5 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Corrective actions */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-brand-700">Corrective Actions</p>
                      <button
                        onClick={addCA}
                        className="rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100"
                      >
                        + Add Action
                      </button>
                    </div>
                    {correctiveActions.length === 0 && (
                      <p className="rounded-xl border border-dashed border-brand-200 p-4 text-center text-sm text-brand-400">
                        No corrective actions added yet.
                      </p>
                    )}
                    {correctiveActions.map((ca, i) => (
                      <div key={i} className="mb-3 rounded-xl border border-brand-100 bg-brand-50 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-brand-500">Action {i + 1}</span>
                          <button onClick={() => removeCA(i)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-brand-600">Title</label>
                          <input
                            value={ca.title}
                            onChange={(e) => updateCA(i, "title", e.target.value)}
                            placeholder="Action title"
                            className="w-full rounded-lg border border-brand-200 bg-white px-2 py-1.5 text-sm"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-brand-600">Assigned To</label>
                            <input
                              value={ca.assigned_to}
                              onChange={(e) => updateCA(i, "assigned_to", e.target.value)}
                              placeholder="Name"
                              className="w-full rounded-lg border border-brand-200 bg-white px-2 py-1.5 text-sm"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-brand-600">Due Date</label>
                            <input
                              type="date"
                              value={ca.due_date}
                              onChange={(e) => updateCA(i, "due_date", e.target.value)}
                              className="w-full rounded-lg border border-brand-200 bg-white px-2 py-1.5 text-sm"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-brand-600">Status</label>
                            <select
                              value={ca.status}
                              onChange={(e) => updateCA(i, "status", e.target.value)}
                              className="w-full rounded-lg border border-brand-200 bg-white px-2 py-1.5 text-sm"
                            >
                              <option value="open">Open</option>
                              <option value="complete">Complete</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 4 - Review */}
              {step === 4 && (
                <div className="space-y-4">
                  <p className="text-sm font-semibold text-brand-700">Review your investigation before submitting.</p>
                  <div className="rounded-xl border border-brand-100 bg-brand-50 p-4 space-y-2 text-sm">
                    <p className="font-bold text-brand-900">{step1.title}</p>
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded px-2 py-0.5 text-xs font-semibold capitalize ${SEVERITY_COLORS[step1.severity]}`}>{step1.severity}</span>
                      <span className={`rounded px-2 py-0.5 text-xs font-semibold capitalize ${TYPE_COLORS[step1.incident_type] ?? "bg-gray-100 text-gray-600"}`}>{step1.incident_type.replace(/_/g, " ")}</span>
                    </div>
                    <p className="text-brand-600">Date: <span className="font-medium text-brand-900">{step1.incident_date}</span></p>
                    {step1.site && <p className="text-brand-600">Site: <span className="font-medium text-brand-900">{step1.site}</span></p>}
                    <p className="text-brand-600">Description: <span className="text-brand-800">{step1.description}</span></p>
                  </div>
                  {parties.length > 0 && (
                    <div className="rounded-xl border border-brand-100 p-4">
                      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-brand-500">Involved Parties ({parties.length})</p>
                      {parties.map((p, i) => (
                        <p key={i} className="text-sm text-brand-700">{p.name} — {p.role}</p>
                      ))}
                    </div>
                  )}
                  {step3.immediate_actions && (
                    <div className="rounded-xl border border-brand-100 p-4">
                      <p className="mb-1 text-xs font-bold uppercase tracking-wider text-brand-500">Immediate Actions</p>
                      <p className="text-sm text-brand-700">{step3.immediate_actions}</p>
                    </div>
                  )}
                  {rootCauses.length > 0 && (
                    <div className="rounded-xl border border-brand-100 p-4">
                      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-brand-500">Root Causes ({rootCauses.length})</p>
                      {rootCauses.map((rc, i) => (
                        <p key={i} className="text-sm text-brand-700">{rc.category}: {rc.description}</p>
                      ))}
                    </div>
                  )}
                  {correctiveActions.length > 0 && (
                    <div className="rounded-xl border border-brand-100 p-4">
                      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-brand-500">Corrective Actions ({correctiveActions.length})</p>
                      {correctiveActions.map((ca, i) => (
                        <p key={i} className="text-sm text-brand-700">{ca.title} — {ca.assigned_to} — {ca.due_date}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Panel footer */}
            <div className="flex items-center justify-between border-t border-brand-100 px-6 py-4">
              <button
                onClick={() => step > 1 ? setStep((s) => s - 1) : closePanel()}
                className="rounded-lg border border-brand-200 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
              >
                {step > 1 ? "Back" : "Cancel"}
              </button>
              {step < 4 ? (
                <button
                  onClick={handleNext}
                  className="rounded-lg bg-brand-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-800"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="rounded-lg bg-brand-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
                >
                  {saving ? "Submitting…" : "Submit Investigation"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Detail View Panel ─────────────────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
          <div className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-brand-100 px-6 py-4">
              <div>
                <h2 className="font-display text-lg font-bold text-brand-900">{selected.title}</h2>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <span className={`rounded px-1.5 py-0.5 text-xs font-semibold capitalize ${TYPE_COLORS[selected.incident_type] ?? "bg-gray-100 text-gray-600"}`}>
                    {selected.incident_type.replace(/_/g, " ")}
                  </span>
                  <span className={`rounded px-1.5 py-0.5 text-xs font-semibold capitalize ${SEVERITY_COLORS[selected.severity] ?? "bg-gray-100 text-gray-600"}`}>
                    {selected.severity}
                  </span>
                  <span className={`rounded px-1.5 py-0.5 text-xs font-semibold capitalize ${STATUS_COLORS[selected.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {selected.status.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-xl text-brand-400 hover:text-brand-700">✕</button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              {/* Details */}
              <div className="rounded-xl border border-brand-100 bg-brand-50 p-4 text-sm space-y-1.5">
                {selected.site && <p className="text-brand-500">Site: <span className="font-medium text-brand-900">{selected.site}</span></p>}
                <p className="text-brand-500">Incident Date: <span className="font-medium text-brand-900">{fmt(selected.incident_date)}</span></p>
                <p className="text-brand-500">Created: <span className="font-medium text-brand-900">{fmt(selected.created_at)}</span></p>
                {selected.linked_issue_id && (
                  <p className="text-brand-500">Linked Issue: <span className="font-medium text-brand-700">{selected.linked_issue_id}</span></p>
                )}
                {selected.description && (
                  <p className="mt-2 text-brand-800">{selected.description}</p>
                )}
              </div>

              {/* Immediate actions */}
              {selected.immediate_actions && (
                <div>
                  <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-brand-500">Immediate Actions</p>
                  <p className="rounded-xl border border-brand-100 bg-white p-3 text-sm text-brand-700">{selected.immediate_actions}</p>
                </div>
              )}

              {/* Involved parties */}
              {selected.involved_parties && selected.involved_parties.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-brand-500">Involved Parties</p>
                  <div className="space-y-2">
                    {selected.involved_parties.map((p, i) => (
                      <div key={i} className="rounded-xl border border-brand-100 bg-white p-3 text-sm">
                        <p className="font-semibold text-brand-800">{p.name} <span className="font-normal text-brand-500">— {p.role}</span></p>
                        {p.statement && <p className="mt-0.5 text-brand-600 italic">"{p.statement}"</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Root causes */}
              {selected.root_causes && selected.root_causes.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-brand-500">Root Causes</p>
                  <div className="space-y-2">
                    {selected.root_causes.map((rc, i) => (
                      <div key={i} className="flex gap-2 rounded-xl border border-brand-100 bg-white p-3 text-sm">
                        <span className="rounded bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700 self-start">{rc.category}</span>
                        <p className="text-brand-700">{rc.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Corrective actions */}
              {selected.corrective_actions && selected.corrective_actions.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-brand-500">Corrective Actions</p>
                  <div className="space-y-2">
                    {selected.corrective_actions.map((ca, i) => (
                      <div key={i} className="rounded-xl border border-brand-100 bg-white p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-brand-800">{ca.title}</span>
                          <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${ca.status === "complete" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                            {ca.status}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-brand-400">
                          {ca.assigned_to && <span>Assigned: {ca.assigned_to}</span>}
                          {ca.due_date && <span>Due: {ca.due_date}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
}
