import { useState } from "react";
import { api } from "../api";
import type { Action, Priority } from "../types";

const ACTION_TYPES = ["corrective", "preventive", "maintenance", "inspection", "other"];

type FormState = {
  title: string; description: string; assigned_to: string; priority: Priority;
  due_date: string; labels: string; action_type: string;
  linked_issue_id: string; linked_jsa_id: string;
};

const EMPTY_FORM: FormState = {
  title: "", description: "", assigned_to: "", priority: "medium",
  due_date: "", labels: "", action_type: "corrective",
  linked_issue_id: "", linked_jsa_id: "",
};

type Props = {
  initial?: Partial<FormState>;
  createdBy: string;
  onClose: () => void;
  onCreated: (action: Action) => void;
};

/** Renders a modal form for creating an action. Reused by the Actions page and by inline "Create action" triggers (e.g. a flagged inspection question) that need to stay on their current page after creating. */
export default function CreateActionModal({ initial, createdBy, onClose, onCreated }: Props) {
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM, ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    if (!form.title.trim()) { setError("Title is required"); return; }
    if (!form.assigned_to.trim()) { setError("Assignee is required"); return; }
    setSaving(true); setError("");
    try {
      const action = await api<Action>("/api/actions", {
        method: "POST",
        body: JSON.stringify({
          title: form.title,
          description: form.description || null,
          assigned_to: form.assigned_to,
          priority: form.priority,
          due_date: form.due_date || null,
          labels: form.labels ? form.labels.split(",").map(l => l.trim()).filter(Boolean) : [],
          action_type: form.action_type,
          linked_issue_id: form.linked_issue_id || null,
          linked_jsa_id: form.linked_jsa_id || null,
          created_by: createdBy,
        }),
      });
      onCreated(action);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create action");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
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
              <label className="mb-1 block text-xs font-semibold text-brand-600">Linked Inspection ID</label>
              <input
                value={form.linked_jsa_id}
                onChange={(e) => setForm((f) => ({ ...f, linked_jsa_id: e.target.value }))}
                placeholder="insp-xxxxx (optional)"
                className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
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
  );
}
