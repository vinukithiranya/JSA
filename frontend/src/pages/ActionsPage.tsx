import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import CreateActionModal from "../components/CreateActionModal";
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

/** Returns true if the action is past its due date and not yet complete or cancelled. */
function isOverdue(action: Action): boolean {
  if (!action.due_date) return false;
  if (action.status === "complete" || action.status === "cant_do") return false;
  return new Date(action.due_date) < new Date();
}

/** Renders the Actions page with a filterable list of actions, a creation modal, and a detail drawer with status controls and comments. */
export default function ActionsPage({ user, onLogout }: Props) {
  const [actions, setActions] = useState<Action[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Action | null>(null);
  const [comments, setComments] = useState<ActionComment[]>([]);
  const [commentMsg, setCommentMsg] = useState("");

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
        <CreateActionModal
          createdBy={user?.id ?? "u-tech"}
          onClose={() => setShowForm(false)}
          onCreated={() => load()}
        />
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
                {selected.linked_issue_id && (
                  <div className="flex items-center gap-2">
                    <span className="text-brand-500">Raised from Issue:</span>
                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
                      {selected.linked_issue_id}
                    </span>
                  </div>
                )}
                {selected.linked_jsa_id && (
                  <div className="flex items-center gap-2">
                    <span className="text-brand-500">Linked JSA:</span>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                      {selected.linked_jsa_id}
                    </span>
                  </div>
                )}
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
