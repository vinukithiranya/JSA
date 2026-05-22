import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { api } from "../api";
import type { User } from "../types";

type Props = { user: User | null; onLogout: () => void };

interface Credential {
  id: string;
  user_id: string;
  user_name: string;
  credential_type: string;
  credential_number: string;
  issuing_authority: string;
  issued_date: string | null;
  expiry_date: string | null;
  file_url: string | null;
  notes: string;
  created_at: string;
}

const CREDENTIAL_TYPES = [
  "Forklift Licence",
  "First Aid",
  "Working at Heights",
  "Confined Space",
  "Electrical Licence",
  "Heavy Vehicle",
  "HR Licence",
  "Security Licence",
  "Other",
];

type CredStatus = "valid" | "expiring" | "expired" | "no-expiry";

function getCredStatus(expiry_date: string | null): CredStatus {
  if (!expiry_date) return "no-expiry";
  const exp = new Date(expiry_date);
  const now = new Date();
  if (exp < now) return "expired";
  const thirtyDays = new Date();
  thirtyDays.setDate(thirtyDays.getDate() + 30);
  if (exp <= thirtyDays) return "expiring";
  return "valid";
}

const STATUS_BADGE: Record<CredStatus, string> = {
  valid: "bg-green-100 text-green-700",
  expiring: "bg-amber-100 text-amber-700",
  expired: "bg-red-100 text-red-700",
  "no-expiry": "bg-gray-100 text-gray-600",
};

const STATUS_LABEL: Record<CredStatus, string> = {
  valid: "Valid",
  expiring: "Expiring Soon",
  expired: "Expired",
  "no-expiry": "No Expiry",
};

const ROW_BG: Record<CredStatus, string> = {
  valid: "",
  expiring: "bg-amber-50",
  expired: "bg-red-50",
  "no-expiry": "",
};

const fmt = (d: string | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
};

const EMPTY_FORM = {
  user_name: "",
  credential_type: "Forklift Licence",
  credential_number: "",
  issuing_authority: "",
  issued_date: "",
  expiry_date: "",
  notes: "",
};

export default function CredentialsPage({ user, onLogout }: Props) {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editCred, setEditCred] = useState<Credential | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isSup = user?.role === "supervisor" || user?.role === "admin";

  const load = () => {
    api<Credential[]>("/api/credentials").then(setCredentials).catch(() => null);
  };

  useEffect(load, []);

  // Derived stats
  const stats = credentials.reduce(
    (acc, c) => {
      const s = getCredStatus(c.expiry_date);
      acc.total += 1;
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    },
    { total: 0, valid: 0, expiring: 0, expired: 0, "no-expiry": 0 } as Record<string, number>
  );

  // Filtered list
  const filtered = credentials.filter((c) => {
    if (filterStatus !== "all" && getCredStatus(c.expiry_date) !== filterStatus) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (
        !c.user_name.toLowerCase().includes(q) &&
        !c.credential_type.toLowerCase().includes(q) &&
        !c.credential_number.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  const openAdd = () => {
    setEditCred(null);
    setForm({ ...EMPTY_FORM });
    setError("");
    setShowModal(true);
  };

  const openEdit = (cred: Credential) => {
    setEditCred(cred);
    setForm({
      user_name: cred.user_name,
      credential_type: cred.credential_type,
      credential_number: cred.credential_number,
      issuing_authority: cred.issuing_authority,
      issued_date: cred.issued_date ?? "",
      expiry_date: cred.expiry_date ?? "",
      notes: cred.notes,
    });
    setError("");
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this credential?")) return;
    try {
      await api(`/api/credentials/${id}`, { method: "DELETE" });
      setCredentials((prev) => prev.filter((c) => c.id !== id));
    } catch {
      // ignore
    }
  };

  const handleSave = async () => {
    if (!form.user_name.trim()) { setError("Staff member name is required"); return; }
    setSaving(true);
    setError("");
    try {
      const body = {
        user_name: form.user_name,
        credential_type: form.credential_type,
        credential_number: form.credential_number,
        issuing_authority: form.issuing_authority,
        issued_date: form.issued_date || null,
        expiry_date: form.expiry_date || null,
        notes: form.notes,
        user_id: user?.id ?? "u-tech",
      };
      if (editCred) {
        await api<Credential>(`/api/credentials/${editCred.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
      } else {
        await api<Credential>("/api/credentials", {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      setShowModal(false);
      setForm({ ...EMPTY_FORM });
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save credential");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout user={user} title="Credentials" onLogout={onLogout}>
      {/* Page subtitle */}
      <p className="mb-5 text-sm text-brand-500">Staff licenses and certifications tracker.</p>

      {/* Stats bar */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-brand-100 bg-white px-4 py-3">
          <p className="text-xs font-medium text-brand-500">Total</p>
          <p className="mt-0.5 text-2xl font-bold text-brand-900">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3">
          <p className="text-xs font-medium text-green-600">Valid</p>
          <p className="mt-0.5 text-2xl font-bold text-green-700">{stats.valid ?? 0}</p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
          <p className="text-xs font-medium text-amber-600">Expiring (30d)</p>
          <p className="mt-0.5 text-2xl font-bold text-amber-700">{stats.expiring ?? 0}</p>
        </div>
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
          <p className="text-xs font-medium text-red-600">Expired</p>
          <p className="mt-0.5 text-2xl font-bold text-red-700">{stats.expired ?? 0}</p>
        </div>
      </div>

      {/* Filters + search + add */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or type…"
            className="rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-sm text-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-400 w-52"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-sm text-brand-800"
          >
            <option value="all">All Statuses</option>
            <option value="valid">Valid</option>
            <option value="expiring">Expiring</option>
            <option value="expired">Expired</option>
            <option value="no-expiry">No Expiry</option>
          </select>
        </div>
        {isSup && (
          <button
            onClick={openAdd}
            className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
          >
            + Add Credential
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-brand-100 bg-white shadow-sm">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-brand-100 bg-brand-50 text-left text-xs font-bold uppercase tracking-wider text-brand-500">
              <th className="px-4 py-3">Staff Member</th>
              <th className="px-4 py-3">Credential Type</th>
              <th className="px-4 py-3">Number</th>
              <th className="px-4 py-3">Issued By</th>
              <th className="px-4 py-3">Issue Date</th>
              <th className="px-4 py-3">Expiry Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-brand-400">
                  No credentials found.
                </td>
              </tr>
            )}
            {filtered.map((cred) => {
              const status = getCredStatus(cred.expiry_date);
              return (
                <tr
                  key={cred.id}
                  className={`border-b border-brand-50 last:border-0 ${ROW_BG[status]}`}
                >
                  <td className="px-4 py-3 font-medium text-brand-900">{cred.user_name}</td>
                  <td className="px-4 py-3 text-brand-700">{cred.credential_type}</td>
                  <td className="px-4 py-3 font-mono text-brand-600">{cred.credential_number || "—"}</td>
                  <td className="px-4 py-3 text-brand-600">{cred.issuing_authority || "—"}</td>
                  <td className="px-4 py-3 text-brand-600">{fmt(cred.issued_date)}</td>
                  <td className={`px-4 py-3 font-medium ${status === "expired" ? "text-red-600" : status === "expiring" ? "text-amber-600" : "text-brand-600"}`}>
                    {fmt(cred.expiry_date)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[status]}`}>
                      {STATUS_LABEL[status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {isSup ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(cred)}
                          className="rounded-lg border border-brand-200 px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(cred.id)}
                          className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-brand-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Add / Edit Modal ───────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 font-display text-lg font-bold text-brand-900">
              {editCred ? "Edit Credential" : "Add Credential"}
            </h2>
            {error && <p className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-brand-600">Staff Member *</label>
                <input
                  value={form.user_name}
                  onChange={(e) => setForm((f) => ({ ...f, user_name: e.target.value }))}
                  placeholder="Full name"
                  className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-brand-600">Credential Type</label>
                <select
                  value={form.credential_type}
                  onChange={(e) => setForm((f) => ({ ...f, credential_type: e.target.value }))}
                  className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
                >
                  {CREDENTIAL_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-brand-600">Credential Number</label>
                  <input
                    value={form.credential_number}
                    onChange={(e) => setForm((f) => ({ ...f, credential_number: e.target.value }))}
                    placeholder="Licence/cert number"
                    className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-brand-600">Issuing Authority</label>
                  <input
                    value={form.issuing_authority}
                    onChange={(e) => setForm((f) => ({ ...f, issuing_authority: e.target.value }))}
                    placeholder="e.g. WorkSafe QLD"
                    className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-brand-600">Issue Date</label>
                  <input
                    type="date"
                    value={form.issued_date}
                    onChange={(e) => setForm((f) => ({ ...f, issued_date: e.target.value }))}
                    className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-brand-600">Expiry Date</label>
                  <input
                    type="date"
                    value={form.expiry_date}
                    onChange={(e) => setForm((f) => ({ ...f, expiry_date: e.target.value }))}
                    className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-brand-600">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Additional notes (optional)"
                  className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => { setShowModal(false); setError(""); setForm({ ...EMPTY_FORM }); }}
                className="rounded-lg border border-brand-200 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
              >
                {saving ? "Saving…" : editCred ? "Save Changes" : "Add Credential"}
              </button>
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
}
