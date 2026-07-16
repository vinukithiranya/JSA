import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { api } from "../api";
import type { User } from "../types";

type Props = { user: User | null; onLogout: () => void };

interface HeadsUp {
  id: string;
  title: string;
  body: string;
  author_id: string;
  author_name: string;
  sites: string[];
  attachments: { name: string; url: string }[];
  acknowledgments: string[];
  is_active: boolean;
  created_at: string;
}

const SITE_OPTIONS = ["All Sites", "Site A", "Site B", "Site C", "Site D"];

/** Returns a human-readable relative time string (e.g. "5m ago") for a given ISO date string. */
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-AU", { day: "2-digit", month: "short" });
}

const EMPTY_FORM = { title: "", body: "", sites: [] as string[] };

/** Renders the Heads Up page displaying workplace announcements with acknowledge and delete controls. */
export default function HeadsUpPage({ user, onLogout }: Props) {
  const [announcements, setAnnouncements] = useState<HeadsUp[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const isSup = user?.role === "supervisor" || user?.role === "admin";

  const load = () => {
    setLoading(true);
    api<HeadsUp[]>("/api/headsup")
      .then(setAnnouncements)
      .catch(() => null)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleAcknowledge = async (id: string) => {
    if (!user) return;
    try {
      await api(`/api/headsup/${id}/acknowledge`, {
        method: "POST",
        body: JSON.stringify({ user_id: user.id }),
      });
      setAnnouncements((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, acknowledgments: a.acknowledgments.includes(user.id) ? a.acknowledgments.filter((uid) => uid !== user.id) : [...a.acknowledgments, user.id] }
            : a
        )
      );
    } catch {
      // ignore
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api(`/api/headsup/${id}`, { method: "DELETE" });
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch {
      // ignore
    }
  };

  const toggleSite = (site: string) => {
    setForm((f) => ({
      ...f,
      sites: f.sites.includes(site) ? f.sites.filter((s) => s !== site) : [...f.sites, site],
    }));
  };

  const handlePost = async () => {
    if (!form.title.trim()) { setError("Title is required"); return; }
    if (!form.body.trim()) { setError("Body is required"); return; }
    setSaving(true);
    setError("");
    try {
      await api<HeadsUp>("/api/headsup", {
        method: "POST",
        body: JSON.stringify({
          title: form.title,
          body: form.body,
          sites: form.sites.length === 0 ? ["All Sites"] : form.sites,
          author_id: user?.id ?? "u-sup",
          author_name: user?.full_name ?? "Supervisor",
        }),
      });
      setShowModal(false);
      setForm({ ...EMPTY_FORM });
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to post announcement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout user={user} title="Heads Up" onLogout={onLogout}>
      {/* Page header */}
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-brand-500">Workplace announcements and notices for your team.</p>
        {isSup && (
          <button
            onClick={() => setShowModal(true)}
            className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
          >
            + Post Announcement
          </button>
        )}
      </div>

      {/* Announcement feed */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="rounded-xl border border-dashed border-brand-200 bg-white p-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50">
            <svg className="h-6 w-6 text-brand-400" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
          </div>
          <p className="font-semibold text-brand-700">No announcements yet</p>
          <p className="mt-1 text-sm text-brand-400">
            {isSup ? "Post the first announcement to your team." : "Check back later for updates from your supervisors."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((ann) => {
            const isAcked = user ? ann.acknowledgments.includes(user.id) : false;
            return (
              <div
                key={ann.id}
                className="rounded-xl border border-brand-100 bg-white p-5 shadow-sm"
              >
                {/* Card top */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {/* Author avatar */}
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white">
                      {ann.author_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-brand-500">
                        <span className="font-semibold text-brand-800">{ann.author_name}</span>
                        {" · "}
                        {timeAgo(ann.created_at)}
                      </p>
                      <h3 className="mt-0.5 text-base font-bold text-brand-900">{ann.title}</h3>
                    </div>
                  </div>
                  {/* Delete (supervisors) */}
                  {isSup && (
                    <button
                      onClick={() => handleDelete(ann.id)}
                      className="shrink-0 rounded-lg p-1.5 text-brand-300 hover:bg-red-50 hover:text-red-500"
                      title="Delete announcement"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Body */}
                <p className="mt-3 text-sm leading-relaxed text-brand-700">{ann.body}</p>

                {/* Sites */}
                {ann.sites.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {ann.sites.map((site) => (
                      <span key={site} className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                        {site}
                      </span>
                    ))}
                  </div>
                )}

                {/* Attachments */}
                {ann.attachments && ann.attachments.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {ann.attachments.map((att) => (
                      <a
                        key={att.name}
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 rounded-lg border border-brand-200 px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50"
                      >
                        <svg className="h-3.5 w-3.5 text-brand-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        {att.name}
                      </a>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div className="mt-4 flex items-center gap-3 border-t border-brand-50 pt-3">
                  <button
                    onClick={() => handleAcknowledge(ann.id)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      isAcked
                        ? "bg-brand-700 text-white hover:bg-brand-800"
                        : "border border-brand-200 text-brand-600 hover:bg-brand-50"
                    }`}
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {isAcked ? "Acknowledged" : "Acknowledge"}
                  </button>
                  <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-600">
                    {ann.acknowledgments.length} acknowledged
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Post Announcement Modal ─────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 font-display text-lg font-bold text-brand-900">Post Announcement</h2>
            {error && <p className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-brand-600">Title *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Announcement title"
                  className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-brand-600">Body *</label>
                <textarea
                  value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  rows={5}
                  placeholder="Write your announcement here…"
                  className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-brand-600">Sites</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {SITE_OPTIONS.map((site) => (
                    <label key={site} className="flex cursor-pointer items-center gap-2 rounded-lg border border-brand-100 px-3 py-2 text-sm hover:bg-brand-50">
                      <input
                        type="checkbox"
                        checked={form.sites.includes(site)}
                        onChange={() => toggleSite(site)}
                        className="h-4 w-4 rounded border-brand-300 accent-brand-700"
                      />
                      <span className="text-brand-700">{site}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => { setShowModal(false); setForm({ ...EMPTY_FORM }); setError(""); }}
                className="rounded-lg border border-brand-200 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePost}
                disabled={saving}
                className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
              >
                {saving ? "Posting…" : "Post Announcement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
