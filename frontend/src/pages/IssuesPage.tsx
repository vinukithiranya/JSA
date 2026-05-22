import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { api } from "../api";
import type { Issue, IssueComment, IssueType, IssueStatus, Priority, User } from "../types";

type Props = { user: User | null; onLogout: () => void };

const TYPE_LABELS: Record<IssueType, string> = {
  hazard: "Hazard",
  near_miss: "Near Miss",
  observation: "Observation",
  incident: "Incident",
  positive: "Positive",
  maintenance: "Maintenance",
};

const TYPE_COLORS: Record<IssueType, string> = {
  hazard: "bg-red-100 text-red-700",
  near_miss: "bg-orange-100 text-orange-700",
  observation: "bg-blue-100 text-blue-700",
  incident: "bg-purple-100 text-purple-700",
  positive: "bg-green-100 text-green-700",
  maintenance: "bg-gray-100 text-gray-700",
};

const PRIORITY_COLORS: Record<Priority, string> = {
  high: "bg-red-500 text-white",
  medium: "bg-amber-400 text-white",
  low: "bg-green-500 text-white",
};

const STATUS_COLORS: Record<IssueStatus, string> = {
  open: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
};

const EMPTY_FORM = {
  title: "",
  description: "",
  issue_type: "hazard" as IssueType,
  category: "General",
  site: "",
  priority: "medium" as Priority,
  assigned_to: "",
};

const EMPTY_ACTION_FORM = {
  title: "",
  assigned_to: "",
  due_date: "",
  priority: "medium" as Priority,
};

export default function IssuesPage({ user, onLogout }: Props) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Issue | null>(null);
  const [comments, setComments] = useState<IssueComment[]>([]);
  const [commentMsg, setCommentMsg] = useState("");
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Create action from issue
  const [showActionForm, setShowActionForm] = useState(false);
  const [actionForm, setActionForm] = useState({ ...EMPTY_ACTION_FORM });
  const [actionSaving, setActionSaving] = useState(false);
  const [actionError, setActionError] = useState("");

  const load = () => {
    const params = new URLSearchParams();
    if (filterStatus !== "all") params.set("status", filterStatus);
    if (filterPriority !== "all") params.set("priority", filterPriority);
    if (filterType !== "all") params.set("issue_type", filterType);
    api<Issue[]>(`/api/issues?${params}`).then(setIssues).catch(() => null);
  };

  useEffect(load, [filterStatus, filterPriority, filterType]);

  const openDetail = (issue: Issue) => {
    setSelected(issue);
    api<IssueComment[]>(`/api/issues/${issue.id}/comments`).then(setComments).catch(() => null);
  };

  const handleCreate = async () => {
    if (!form.title.trim()) { setError("Title is required"); return; }
    setSaving(true); setError("");
    try {
      await api<Issue>("/api/issues", {
        method: "POST",
        body: JSON.stringify({ ...form, reported_by: user?.id ?? "u-tech" }),
      });
      setShowForm(false);
      setForm({ ...EMPTY_FORM });
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create issue");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAction = async () => {
    if (!selected) return;
    if (!actionForm.title.trim()) { setActionError("Title is required"); return; }
    if (!actionForm.assigned_to.trim()) { setActionError("Assignee is required"); return; }
    setActionSaving(true); setActionError("");
    try {
      await api("/api/actions", {
        method: "POST",
        body: JSON.stringify({
          title: actionForm.title,
          assigned_to: actionForm.assigned_to,
          priority: actionForm.priority,
          due_date: actionForm.due_date || null,
          action_type: "corrective",
          linked_issue_id: selected.id,
          created_by: user?.id ?? "u-tech",
        }),
      });
      setShowActionForm(false);
      setActionForm({ ...EMPTY_ACTION_FORM });
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Failed to create action");
    } finally {
      setActionSaving(false);
    }
  };

  const handleStatusChange = async (issue: Issue, status: IssueStatus) => {
    await api(`/api/issues/${issue.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (selected?.id === issue.id) setSelected({ ...issue, status });
    load();
  };

  const handleComment = async () => {
    if (!commentMsg.trim() || !selected) return;
    const c = await api<IssueComment>(`/api/issues/${selected.id}/comments`, {
      method: "POST",
      body: JSON.stringify({ user_id: user?.id ?? "u-tech", message: commentMsg }),
    });
    setComments((prev) => [...prev, c]);
    setCommentMsg("");
  };

  const fmt = (d: string) => new Date(d).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <Layout user={user} title="Issues & Observations" onLogout={onLogout}>
      {/* Header row */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-sm text-brand-800"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>

          {/* Priority filter */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-sm text-brand-800"
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Type filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-sm text-brand-800"
          >
            <option value="all">All Types</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
        >
          + Report Issue
        </button>
      </div>

      {/* Issues list */}
      <div className="space-y-2">
        {issues.length === 0 && (
          <div className="rounded-xl border border-brand-100 bg-white p-8 text-center text-brand-400">
            No issues found. Report one above.
          </div>
        )}
        {issues.map((issue) => (
          <div
            key={issue.id}
            onClick={() => openDetail(issue)}
            className="flex cursor-pointer items-start gap-3 rounded-xl border border-brand-100 bg-white p-4 shadow-sm transition-colors hover:border-brand-300"
          >
            {/* Priority dot */}
            <div
              className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                issue.priority === "high" ? "bg-red-500" : issue.priority === "medium" ? "bg-amber-400" : "bg-green-500"
              }`}
            />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-brand-900">{issue.title}</span>
                <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${TYPE_COLORS[issue.issue_type as IssueType]}`}>
                  {TYPE_LABELS[issue.issue_type as IssueType]}
                </span>
                <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[issue.status as IssueStatus]}`}>
                  {issue.status.replace("_", " ")}
                </span>
                <span className={`rounded px-1.5 py-0.5 text-xs font-semibold uppercase ${PRIORITY_COLORS[issue.priority as Priority]}`}>
                  {issue.priority}
                </span>
              </div>
              {issue.description && (
                <p className="mt-0.5 truncate text-sm text-brand-500">{issue.description}</p>
              )}
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-brand-400">
                {issue.site && <span>Site: {issue.site}</span>}
                {issue.category && <span>Category: {issue.category}</span>}
                <span>Reported: {fmt(issue.created_at)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Report Issue Modal ──────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 font-display text-lg font-bold text-brand-900">Report Issue</h2>

            {error && <p className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-brand-600">Title *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Short description of the issue"
                  className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-brand-600">Type</label>
                  <select
                    value={form.issue_type}
                    onChange={(e) => setForm((f) => ({ ...f, issue_type: e.target.value as IssueType }))}
                    className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
                  >
                    {Object.entries(TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-brand-600">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as Priority }))}
                    className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-brand-600">Category</label>
                  <input
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    placeholder="e.g. Fire Safety"
                    className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-brand-600">Site / Location</label>
                  <input
                    value={form.site}
                    onChange={(e) => setForm((f) => ({ ...f, site: e.target.value }))}
                    placeholder="e.g. Deck 3"
                    className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-brand-600">Assign To</label>
                <input
                  value={form.assigned_to}
                  onChange={(e) => setForm((f) => ({ ...f, assigned_to: e.target.value }))}
                  placeholder="Name of person responsible"
                  className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-brand-600">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="Describe what you observed..."
                  className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => { setShowForm(false); setError(""); setForm({ ...EMPTY_FORM }); }}
                className="rounded-lg border border-brand-200 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
              >
                {saving ? "Submitting…" : "Submit Issue"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Issue Detail Drawer ─────────────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
          <div className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-brand-100 px-6 py-4">
              <div>
                <h2 className="font-display text-lg font-bold text-brand-900">{selected.title}</h2>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${TYPE_COLORS[selected.issue_type as IssueType]}`}>
                    {TYPE_LABELS[selected.issue_type as IssueType]}
                  </span>
                  <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${PRIORITY_COLORS[selected.priority as Priority]}`}>
                    {selected.priority.toUpperCase()}
                  </span>
                  <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[selected.status as IssueStatus]}`}>
                    {selected.status.replace("_", " ")}
                  </span>
                </div>
              </div>
              <button onClick={() => { setSelected(null); setShowActionForm(false); }} className="text-brand-400 hover:text-brand-700 text-xl">✕</button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* Details */}
              <div className="rounded-xl border border-brand-100 bg-brand-50 p-4 text-sm space-y-1">
                {selected.description && <p className="text-brand-700">{selected.description}</p>}
                {selected.site && <p className="text-brand-500">Site: <span className="text-brand-800 font-medium">{selected.site}</span></p>}
                {selected.category && <p className="text-brand-500">Category: <span className="text-brand-800 font-medium">{selected.category}</span></p>}
                <p className="text-brand-500">Reported by: <span className="text-brand-800 font-medium">{selected.reported_by}</span></p>
                <p className="text-brand-500">Date: <span className="text-brand-800 font-medium">{fmt(selected.created_at)}</span></p>
                {selected.assigned_to && <p className="text-brand-500">Assigned to: <span className="text-brand-800 font-medium">{selected.assigned_to}</span></p>}
              </div>

              {/* Status change */}
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-brand-500">Update Status</p>
                <div className="flex gap-2">
                  {(["open", "in_progress", "resolved"] as IssueStatus[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(selected, s)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                        selected.status === s
                          ? STATUS_COLORS[s] + " ring-2 ring-offset-1 ring-brand-400"
                          : "border border-brand-200 bg-white text-brand-700 hover:bg-brand-50"
                      }`}
                    >
                      {s.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Create Action from Issue */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-brand-500">Actions</p>
                  {!showActionForm && (
                    <button
                      onClick={() => {
                        setActionForm({ title: `Fix: ${selected.title}`, assigned_to: selected.assigned_to ?? "", due_date: "", priority: selected.priority as Priority });
                        setShowActionForm(true);
                      }}
                      className="flex items-center gap-1 rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-800"
                    >
                      + Create Action
                    </button>
                  )}
                </div>

                {showActionForm && (
                  <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 space-y-3">
                    <p className="text-xs font-semibold text-brand-700">New action linked to this issue</p>
                    {actionError && <p className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">{actionError}</p>}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-brand-600">What needs to be done? *</label>
                      <input
                        value={actionForm.title}
                        onChange={(e) => setActionForm((f) => ({ ...f, title: e.target.value }))}
                        className="w-full rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-brand-600">Assign To *</label>
                        <input
                          value={actionForm.assigned_to}
                          onChange={(e) => setActionForm((f) => ({ ...f, assigned_to: e.target.value }))}
                          placeholder="Name or user"
                          className="w-full rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-brand-600">Due Date</label>
                        <input
                          type="date"
                          value={actionForm.due_date}
                          onChange={(e) => setActionForm((f) => ({ ...f, due_date: e.target.value }))}
                          className="w-full rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-brand-600">Priority</label>
                      <select
                        value={actionForm.priority}
                        onChange={(e) => setActionForm((f) => ({ ...f, priority: e.target.value as Priority }))}
                        className="w-full rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm"
                      >
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => { setShowActionForm(false); setActionError(""); }}
                        className="rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-white"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreateAction}
                        disabled={actionSaving}
                        className="rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
                      >
                        {actionSaving ? "Creating…" : "Create Action"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Comments */}
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-brand-500">Activity</p>
                <div className="space-y-2">
                  {comments.length === 0 && (
                    <p className="text-sm text-brand-400 italic">No comments yet.</p>
                  )}
                  {comments.map((c) => (
                    <div key={c.id} className="rounded-lg bg-brand-50 px-3 py-2 text-sm">
                      <p className="font-semibold text-brand-700">{c.user_id}</p>
                      <p className="text-brand-800">{c.message}</p>
                      <p className="mt-0.5 text-xs text-brand-400">{fmt(c.created_at)}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <input
                    value={commentMsg}
                    onChange={(e) => setCommentMsg(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleComment()}
                    placeholder="Add a comment…"
                    className="flex-1 rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                  <button
                    onClick={handleComment}
                    className="rounded-lg bg-brand-700 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-800"
                  >
                    Post
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
