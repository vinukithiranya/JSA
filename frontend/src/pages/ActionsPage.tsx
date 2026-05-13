import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { api } from "../api";
import type { Action, ActionComment, ActionStatus, Priority, User } from "../types";

type Props = { user: User | null; onLogout: () => void };

const STATUS_LABELS: Record<ActionStatus, string> = {
  to_do: "To Do",
  in_progress: "In Progress",
  complete: "Complete",
  cant_do: "Can't Do",
};

const STATUS_COLORS: Record<ActionStatus, string> = {
  to_do: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-800",
  complete: "bg-green-100 text-green-800",
  cant_do: "bg-red-100 text-red-700",
};

const PRIORITY_DOT: Record<Priority, string> = {
  high: "bg-red-500",
  medium: "bg-amber-400",
  low: "bg-green-500",
};

const PRIORITY_BADGE: Record<Priority, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-green-100 text-green-700",
};

const ACTION_TYPES = ["corrective", "preventive", "maintenance", "inspection", "other"];

const EMPTY_FORM = {
  title: "",
  description: "",
  assigned_to: "",
  priority: "medium" as Priority,
  due_date: "",
  labels: "",
  action_type: "corrective",
  linked_issue_id: "",
  linked_jsa_id: "",
};

function isOverdue(action: Action): boolean {
  if (!action.due_date) return false;
  if (action.status === "complete" || action.status === "cant_do") return false;
  return new Date(action.due_date) < new Date();
}

export default function ActionsPage({ user, onLogout }: Props) {
  const [actions, setActions] = useState<Action[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Action | null>(null);
  const [comments, setComments] = useState<ActionComment[]>([]);
  const [commentMsg, setCommentMsg] = useState("");
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    const params = new URLSearchParams();
    if (filterStatus !== "all") params.set("status", filterStatus);
    if (filterPriority !== "all") params.set("priority", filterPriority);
    api<Action[]>(`/api/actions?${params}`).then(setActions).catch(() => null);
  };

  useEffect(load, [filterStatus, filterPriority]);

  const openDetail = (action: Action) => {
    setSelected(action);
    api<ActionComment[]>(`/api/actions/${action.id}/comments`).then(setComments).catch(() => null);
  };

  const handleCreate = async () => {
    if (!form.title.trim()) { setError("Title is required"); return; }
    if (!form.assigned_to.trim()) { setError("Assignee is required"); return; }
    setSaving(true); setError("");
    try {
      await api<Action>("/api/actions", {
        method: "POST",
        body: JSON.stringify({
          title: form.title,
          description: form.description || null,
          assigned_to: form.assigned_to,
          priority: form.priority,
          due_date: form.due_date || null,
          labels: form.labels ? form.labels.split(",").map((l) => l.trim()).filter(Boolean) : [],
          action_type: form.action_type,
          linked_issue_id: form.linked_issue_id || null,
          linked_jsa_id: form.linked_jsa_id || null,
          created_by: user?.id ?? "u-tech",
        }),
      });
      setShowForm(false);
      setForm({ ...EMPTY_FORM });
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create action");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (action: Action, status: ActionStatus) => {
    await api(`/api/actions/${action.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (selected?.id === action.id) setSelected({ ...action, status });
    load();
  };

  const handleComment = async () => {
    if (!commentMsg.trim() || !selected) return;
    const c = await api<ActionComment>(`/api/actions/${selected.id}/comments`, {
      method: "POST",
      body: JSON.stringify({ user_id: user?.id ?? "u-tech", message: commentMsg }),
    });
    setComments((prev) => [...prev, c]);
    setCommentMsg("");
  };

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });

  const overdueCount = actions.filter(isOverdue).length;

  return (
    <Layout user={user} title="Actions" onLogout={onLogout}>
      {/* Stats bar */}
      {overdueCount > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
          <span className="text-base">⚠</span>
          {overdueCount} overdue action{overdueCount > 1 ? "s" : ""} — needs attention
        </div>
      )}

      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-sm text-brand-800"
          >
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
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
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
        >
          + Create Action
        </button>
      </div>

      {/* Actions list */}
      <div className="space-y-2">
        {actions.length === 0 && (
          <div className="rounded-xl border border-brand-100 bg-white p-8 text-center text-brand-400">
            No actions found. Create one above.
          </div>
        )}
        {actions.map((action) => {
          const overdue = isOverdue(action);
          return (
            <div
              key={action.id}
              onClick={() => openDetail(action)}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border bg-white p-4 shadow-sm transition-colors hover:border-brand-300 ${
                overdue ? "border-red-200" : "border-brand-100"
              }`}
            >
              <div
                className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${PRIORITY_DOT[action.priority as Priority]}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-brand-900">{action.title}</span>
                  <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[action.status as ActionStatus]}`}>
                    {STATUS_LABELS[action.status as ActionStatus]}
                  </span>
                  <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${PRIORITY_BADGE[action.priority as Priority]}`}>
                    {action.priority}
                  </span>
                  {overdue && (
                    <span className="rounded bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white">OVERDUE</span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-brand-400">
                  <span>Assigned: {action.assigned_to}</span>
                  {action.due_date && (
                    <span className={overdue ? "text-red-600 font-semibold" : ""}>
                      Due: {fmt(action.due_date)}
                    </span>
                  )}
                  <span>Type: {action.action_type}</span>
                </div>
                {action.labels.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {action.labels.map((l) => (
                      <span key={l} className="rounded bg-brand-100 px-1.5 py-0.5 text-xs text-brand-700">{l}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Create Action Modal ─────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 font-display text-lg font-bold text-brand-900">Create Action</h2>
            {error && <p className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-brand-600">Title *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="What needs to be done?"
                  className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-brand-600">Assignee *</label>
                  <input
                    value={form.assigned_to}
                    onChange={(e) => setForm((f) => ({ ...f, assigned_to: e.target.value }))}
                    placeholder="User ID or name"
                    className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
                  />
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
                  <label className="mb-1 block text-xs font-semibold text-brand-600">Due Date</label>
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                    className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-brand-600">Type</label>
                  <select
                    value={form.action_type}
                    onChange={(e) => setForm((f) => ({ ...f, action_type: e.target.value }))}
                    className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
                  >
                    {ACTION_TYPES.map((t) => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-brand-600">Labels (comma-separated)</label>
                <input
                  value={form.labels}
                  onChange={(e) => setForm((f) => ({ ...f, labels: e.target.value }))}
                  placeholder="e.g. Safety, Electrical, Urgent"
                  className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-brand-600">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  placeholder="Additional details…"
                  className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-brand-600">Linked Issue ID</label>
                  <input
                    value={form.linked_issue_id}
                    onChange={(e) => setForm((f) => ({ ...f, linked_issue_id: e.target.value }))}
                    placeholder="iss-xxxxx (optional)"
                    className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-brand-600">Linked JSA ID</label>
                  <input
                    value={form.linked_jsa_id}
                    onChange={(e) => setForm((f) => ({ ...f, linked_jsa_id: e.target.value }))}
                    placeholder="jsa-xxxxx (optional)"
                    className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
                  />
                </div>
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
                {saving ? "Creating…" : "Create Action"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Action Detail Drawer ────────────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
          <div className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-brand-100 px-6 py-4">
              <div>
                <h2 className="font-display text-lg font-bold text-brand-900">{selected.title}</h2>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[selected.status as ActionStatus]}`}>
                    {STATUS_LABELS[selected.status as ActionStatus]}
                  </span>
                  <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${PRIORITY_BADGE[selected.priority as Priority]}`}>
                    {selected.priority}
                  </span>
                  {isOverdue(selected) && (
                    <span className="rounded bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white">OVERDUE</span>
                  )}
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-xl text-brand-400 hover:text-brand-700">✕</button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
              {/* Details */}
              <div className="rounded-xl border border-brand-100 bg-brand-50 p-4 text-sm space-y-1">
                {selected.description && <p className="text-brand-700">{selected.description}</p>}
                <p className="text-brand-500">Assigned to: <span className="font-medium text-brand-800">{selected.assigned_to}</span></p>
                <p className="text-brand-500">Type: <span className="font-medium text-brand-800">{selected.action_type}</span></p>
                {selected.due_date && (
                  <p className={`text-brand-500 ${isOverdue(selected) ? "text-red-600" : ""}`}>
                    Due: <span className="font-medium">{new Date(selected.due_date).toLocaleDateString()}</span>
                  </p>
                )}
                {selected.linked_issue_id && <p className="text-brand-500">Issue: <span className="font-medium text-brand-800">{selected.linked_issue_id}</span></p>}
                {selected.linked_jsa_id && <p className="text-brand-500">JSA: <span className="font-medium text-brand-800">{selected.linked_jsa_id}</span></p>}
                {selected.labels.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {selected.labels.map((l) => (
                      <span key={l} className="rounded bg-brand-200 px-1.5 py-0.5 text-xs text-brand-700">{l}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Status transitions */}
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-brand-500">Update Status</p>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(STATUS_LABELS) as ActionStatus[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(selected, s)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                        selected.status === s
                          ? STATUS_COLORS[s] + " ring-2 ring-offset-1 ring-brand-400"
                          : "border border-brand-200 bg-white text-brand-700 hover:bg-brand-50"
                      }`}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comments */}
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-brand-500">Activity</p>
                <div className="space-y-2">
                  {comments.length === 0 && (
                    <p className="text-sm italic text-brand-400">No comments yet.</p>
                  )}
                  {comments.map((c) => (
                    <div key={c.id} className="rounded-lg bg-brand-50 px-3 py-2 text-sm">
                      <p className="font-semibold text-brand-700">{c.user_id}</p>
                      <p className="text-brand-800">{c.message}</p>
                      <p className="mt-0.5 text-xs text-brand-400">{new Date(c.created_at).toLocaleString()}</p>
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
