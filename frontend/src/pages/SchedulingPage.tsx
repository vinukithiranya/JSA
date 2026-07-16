import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { api } from "../api";
import type { Schedule, ScheduleFrequency, ScheduleOccurrence, OccurrenceStatus, User } from "../types";

type Props = { user: User | null; onLogout: () => void };

const FREQ_LABELS: Record<ScheduleFrequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

const OCC_COLORS: Record<OccurrenceStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  missed: "bg-gray-100 text-gray-600",
  overdue: "bg-red-100 text-red-700",
};

const EMPTY_FORM = {
  title: "",
  template_id: "",
  template_name: "",
  frequency: "weekly" as ScheduleFrequency,
  frequency_value: 1,
  start_date: new Date().toISOString().split("T")[0],
  end_date: "",
  site: "",
  assigned_users: "",
};

/** Renders the scheduling management page with tabs for schedules and upcoming occurrences. */
export default function SchedulingPage({ user, onLogout }: Props) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [occurrences, setOccurrences] = useState<ScheduleOccurrence[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Schedule | null>(null);
  const [selectedOccs, setSelectedOccs] = useState<ScheduleOccurrence[]>([]);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"schedules" | "upcoming">("schedules");

  /** Fetches all schedules from the API and updates state. */
  const loadSchedules = () =>
    api<Schedule[]>("/api/schedules").then(setSchedules).catch(() => null);

  /** Fetches all schedule occurrences from the API and updates state. */
  const loadAllOccs = () =>
    api<ScheduleOccurrence[]>("/api/schedules/occurrences/all").then(setOccurrences).catch(() => null);

  useEffect(() => { loadSchedules(); loadAllOccs(); }, []);

  /** Selects a schedule and loads its occurrences from the API. */
  const openSchedule = (s: Schedule) => {
    setSelected(s);
    api<ScheduleOccurrence[]>(`/api/schedules/${s.id}/occurrences`)
      .then(setSelectedOccs)
      .catch(() => null);
  };

  /** Validates and submits the create schedule form, then refreshes schedule data. */
  const handleCreate = async () => {
    if (!form.title.trim()) { setError("Title is required"); return; }
    if (!form.template_id.trim()) { setError("Template ID is required"); return; }
    setSaving(true); setError("");
    try {
      await api<Schedule>("/api/schedules", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          frequency_value: Number(form.frequency_value),
          end_date: form.end_date || null,
          assigned_users: form.assigned_users
            ? form.assigned_users.split(",").map((u) => u.trim()).filter(Boolean)
            : [],
          created_by: user?.id ?? "u-admin",
        }),
      });
      setShowForm(false);
      setForm({ ...EMPTY_FORM });
      loadSchedules();
      loadAllOccs();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create schedule");
    } finally {
      setSaving(false);
    }
  };

  /** Toggles the active/paused state of a schedule. */
  const toggleSchedule = async (s: Schedule) => {
    await api(`/api/schedules/${s.id}/toggle`, { method: "PATCH" });
    loadSchedules();
  };

  /** Marks a schedule occurrence as completed and refreshes occurrence data. */
  const completeOcc = async (occ: ScheduleOccurrence) => {
    await api(`/api/schedules/occurrences/${occ.id}/complete`, {
      method: "PATCH",
      body: JSON.stringify({ completed_by: user?.id ?? "u-tech" }),
    });
    if (selected) openSchedule(selected);
    loadAllOccs();
  };

  /** Marks a schedule occurrence as missed and refreshes occurrence data. */
  const missOcc = async (occ: ScheduleOccurrence) => {
    await api(`/api/schedules/occurrences/${occ.id}/miss`, { method: "PATCH" });
    if (selected) openSchedule(selected);
    loadAllOccs();
  };

  /** Formats an ISO date string into a human-readable day/month/year string. */
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });

  const upcomingOccs = occurrences
    .filter((o) => o.status === "pending" || o.status === "overdue")
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

  const isSup = user?.role === "supervisor" || user?.role === "admin";

  return (
    <Layout user={user} title="Scheduling" onLogout={onLogout}>
      {/* Tab bar */}
      <div className="mb-4 flex gap-1 rounded-xl bg-brand-100 p-1 w-fit">
        {(["schedules", "upcoming"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold capitalize transition-colors ${
              activeTab === tab ? "bg-white text-brand-900 shadow-sm" : "text-brand-600 hover:text-brand-800"
            }`}
          >
            {tab === "schedules" ? "Schedules" : `Upcoming (${upcomingOccs.length})`}
          </button>
        ))}
      </div>

      {/* ── Schedules Tab ─────────────────────────────────────────────── */}
      {activeTab === "schedules" && (
        <>
          <div className="mb-4 flex justify-end">
            {isSup && (
              <button
                onClick={() => setShowForm(true)}
                className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
              >
                + Create Schedule
              </button>
            )}
          </div>

          <div className="space-y-2">
            {schedules.length === 0 && (
              <div className="rounded-xl border border-brand-100 bg-white p-8 text-center text-brand-400">
                No schedules yet.{isSup ? " Create one above." : ""}
              </div>
            )}
            {schedules.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-4 rounded-xl border border-brand-100 bg-white p-4 shadow-sm"
              >
                <div
                  className={`h-3 w-3 shrink-0 rounded-full ${s.is_active ? "bg-green-500" : "bg-gray-300"}`}
                />
                <div className="min-w-0 flex-1 cursor-pointer" onClick={() => openSchedule(s)}>
                  <p className="font-semibold text-brand-900">{s.title}</p>
                  <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-brand-400">
                    <span>{FREQ_LABELS[s.frequency as ScheduleFrequency]} × {s.frequency_value}</span>
                    {s.site && <span>Site: {s.site}</span>}
                    <span>Starts: {fmt(s.start_date)}</span>
                    {s.end_date && <span>Ends: {fmt(s.end_date)}</span>}
                    <span>{s.assigned_users.length} assignee{s.assigned_users.length !== 1 ? "s" : ""}</span>
                  </div>
                </div>
                {isSup && (
                  <button
                    onClick={() => toggleSchedule(s)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      s.is_active
                        ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                        : "border border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                    }`}
                  >
                    {s.is_active ? "Pause" : "Activate"}
                  </button>
                )}
                <button
                  onClick={() => openSchedule(s)}
                  className="text-xs text-brand-400 hover:text-brand-700"
                >
                  View →
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Upcoming Tab ──────────────────────────────────────────────── */}
      {activeTab === "upcoming" && (
        <div className="space-y-2">
          {upcomingOccs.length === 0 && (
            <div className="rounded-xl border border-brand-100 bg-white p-8 text-center text-brand-400">
              No upcoming occurrences.
            </div>
          )}
          {upcomingOccs.map((occ) => (
            <div
              key={occ.id}
              className={`flex items-center gap-4 rounded-xl border bg-white p-4 shadow-sm ${
                occ.status === "overdue" ? "border-red-200" : "border-brand-100"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-brand-900">{occ.schedule_title}</p>
                <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-brand-400">
                  <span className={`rounded px-1.5 py-0.5 font-semibold ${OCC_COLORS[occ.status as OccurrenceStatus]}`}>
                    {occ.status}
                  </span>
                  <span className={occ.status === "overdue" ? "text-red-600 font-semibold" : ""}>
                    Due: {fmt(occ.due_date)}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => completeOcc(occ)}
                  className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
                >
                  Complete
                </button>
                <button
                  onClick={() => missOcc(occ)}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Miss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create Schedule Modal ──────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 font-display text-lg font-bold text-brand-900">Create Schedule</h2>
            {error && <p className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-brand-600">Schedule Title *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Weekly Deck Safety Check"
                  className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-brand-600">Template ID *</label>
                  <input
                    value={form.template_id}
                    onChange={(e) => setForm((f) => ({ ...f, template_id: e.target.value }))}
                    placeholder="tpl-xxxxx"
                    className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-brand-600">Template Name</label>
                  <input
                    value={form.template_name}
                    onChange={(e) => setForm((f) => ({ ...f, template_name: e.target.value }))}
                    placeholder="Display name"
                    className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-brand-600">Frequency</label>
                  <select
                    value={form.frequency}
                    onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value as ScheduleFrequency }))}
                    className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-brand-600">Every N units</label>
                  <input
                    type="number"
                    min={1}
                    value={form.frequency_value}
                    onChange={(e) => setForm((f) => ({ ...f, frequency_value: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-brand-600">Start Date *</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                    className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-brand-600">End Date (optional)</label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                    className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-brand-600">Site</label>
                <input
                  value={form.site}
                  onChange={(e) => setForm((f) => ({ ...f, site: e.target.value }))}
                  placeholder="e.g. Offshore Platform A"
                  className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-brand-600">Assigned Users (comma-separated IDs)</label>
                <input
                  value={form.assigned_users}
                  onChange={(e) => setForm((f) => ({ ...f, assigned_users: e.target.value }))}
                  placeholder="u-tech, u-sup"
                  className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
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
                {saving ? "Creating…" : "Create Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Schedule Occurrences Drawer ────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
          <div className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-brand-100 px-6 py-4">
              <div>
                <h2 className="font-display text-lg font-bold text-brand-900">{selected.title}</h2>
                <p className="text-sm text-brand-500">
                  {FREQ_LABELS[selected.frequency as ScheduleFrequency]} · {selected.site || "All sites"}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="text-xl text-brand-400 hover:text-brand-700">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-brand-500">Occurrences</p>
              <div className="space-y-2">
                {selectedOccs.length === 0 && (
                  <p className="text-sm italic text-brand-400">No occurrences generated.</p>
                )}
                {selectedOccs.map((occ) => (
                  <div
                    key={occ.id}
                    className={`flex items-center gap-3 rounded-xl border p-3 ${
                      occ.status === "overdue" ? "border-red-200 bg-red-50" : "border-brand-100 bg-white"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${OCC_COLORS[occ.status as OccurrenceStatus]}`}>
                          {occ.status}
                        </span>
                        <span className={`text-sm font-medium ${occ.status === "overdue" ? "text-red-700" : "text-brand-800"}`}>
                          {fmt(occ.due_date)}
                        </span>
                      </div>
                      {occ.completed_by && (
                        <p className="mt-0.5 text-xs text-brand-400">Completed by: {occ.completed_by}</p>
                      )}
                    </div>
                    {(occ.status === "pending" || occ.status === "overdue") && (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => completeOcc(occ)}
                          className="rounded-lg bg-green-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-green-700"
                        >
                          Done
                        </button>
                        <button
                          onClick={() => missOcc(occ)}
                          className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-500 hover:bg-gray-50"
                        >
                          Miss
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
