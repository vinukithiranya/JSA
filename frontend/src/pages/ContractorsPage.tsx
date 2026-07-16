import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { api } from "../api";
import type { User } from "../types";

type Props = { user: User | null; onLogout: () => void };

// ── Types ─────────────────────────────────────────────────────────────────────

interface ContractorDoc {
  id: string;
  name: string;
  expiry_date: string;
  file_url: string;
  status: string;
}

interface Contractor {
  id: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  abn: string;
  status: string;
  trade_type: string;
  site: string;
  documents: ContractorDoc[];
  notes: string;
  created_at: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TRADE_TYPES = ["Electrical", "Plumbing", "Civil", "Mechanical", "Cleaning", "Security", "Other"];
const STATUSES = ["active", "pending", "expired"];

const EMPTY_CONTRACTOR: Omit<Contractor, "id" | "documents" | "created_at"> = {
  company_name: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  abn: "",
  status: "active",
  trade_type: "Mechanical",
  site: "",
  notes: "",
};

const EMPTY_DOC = {
  name: "",
  expiry_date: "",
  file_url: "",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns the number of days from now until the given date string. */
function daysUntil(dateStr: string): number {
  if (!dateStr) return Infinity;
  return (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
}

/** Returns the expiry status of a contractor document based on its expiry date. */
function docStatus(doc: ContractorDoc): "expired" | "expiring" | "valid" {
  const days = daysUntil(doc.expiry_date);
  if (days < 0) return "expired";
  if (days <= 30) return "expiring";
  return "valid";
}

/** Returns the CSS class for a document table row based on its expiry status. */
function docRowClass(status: "expired" | "expiring" | "valid"): string {
  if (status === "expired") return "bg-red-50";
  if (status === "expiring") return "bg-amber-50";
  return "bg-brand-50/30";
}

/** Returns the CSS class for a document status badge based on its expiry status. */
function docBadgeClass(status: "expired" | "expiring" | "valid"): string {
  if (status === "expired") return "bg-red-100 text-red-700";
  if (status === "expiring") return "bg-amber-100 text-amber-700";
  return "bg-brand-100 text-brand-700";
}

/** Returns the display label for a document status badge. */
function docBadgeLabel(status: "expired" | "expiring" | "valid"): string {
  if (status === "expired") return "Expired";
  if (status === "expiring") return "Expiring Soon";
  return "Valid";
}

/** Returns the CSS class for a contractor status badge. */
function statusBadge(status: string): string {
  if (status === "active") return "bg-brand-100 text-brand-700";
  if (status === "pending") return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

/** Returns the display label for a contractor status value. */
function statusLabel(status: string): string {
  if (status === "active") return "Active";
  if (status === "pending") return "Pending";
  return "Expired";
}

/** Formats a date string into a human-readable Australian locale date. */
function fmt(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

/** Returns a summary expiry status for a contractor's full set of documents. */
function getDocsSummary(docs: ContractorDoc[]): "ok" | "expiring" | "expired" | "none" {
  if (!docs || docs.length === 0) return "none";
  const statuses = docs.map(docStatus);
  if (statuses.some((s) => s === "expired")) return "expired";
  if (statuses.some((s) => s === "expiring")) return "expiring";
  return "ok";
}

// ── Main Component ────────────────────────────────────────────────────────────

/** Renders the Contractors page with a filterable table, add/edit panel, detail view, and document management. */
export default function ContractorsPage({ user, onLogout }: Props) {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");

  // Add/Edit panel
  const [showForm, setShowForm] = useState(false);
  const [editContractor, setEditContractor] = useState<Contractor | null>(null);
  const [form, setForm] = useState({ ...EMPTY_CONTRACTOR });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Detail panel
  const [selected, setSelected] = useState<Contractor | null>(null);

  // Add document modal
  const [showDocModal, setShowDocModal] = useState(false);
  const [docForm, setDocForm] = useState({ ...EMPTY_DOC });
  const [docSaving, setDocSaving] = useState(false);
  const [docError, setDocError] = useState("");

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api<Contractor[]>("/api/contractors")
      .then(setContractors)
      .catch(() => setContractors([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = contractors.filter((c) => {
    return filterStatus === "all" || c.status === filterStatus;
  });

  // ── Stats ────────────────────────────────────────────────────────────────

  const totalCount = contractors.length;
  const activeCount = contractors.filter((c) => c.status === "active").length;
  const pendingCount = contractors.filter((c) => c.status === "pending").length;
  const expiringDocsCount = contractors.reduce((acc, c) => {
    const expiring = (c.documents ?? []).filter((d) => {
      const days = daysUntil(d.expiry_date);
      return days >= 0 && days <= 30;
    }).length;
    return acc + expiring;
  }, 0);

  // ── Form handlers ─────────────────────────────────────────────────────────

  const openAdd = () => {
    setEditContractor(null);
    setForm({ ...EMPTY_CONTRACTOR });
    setFormError("");
    setShowForm(true);
  };

  const openEdit = (c: Contractor) => {
    setEditContractor(c);
    setForm({
      company_name: c.company_name,
      contact_name: c.contact_name,
      contact_email: c.contact_email,
      contact_phone: c.contact_phone,
      abn: c.abn,
      status: c.status,
      trade_type: c.trade_type,
      site: c.site,
      notes: c.notes,
    });
    setFormError("");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.company_name.trim()) { setFormError("Company name is required"); return; }
    setSaving(true);
    setFormError("");
    try {
      if (editContractor) {
        const updated = await api<Contractor>(`/api/contractors/${editContractor.id}`, {
          method: "PUT",
          body: JSON.stringify(form),
        });
        setContractors((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        if (selected?.id === updated.id) setSelected(updated);
      } else {
        const created = await api<Contractor>("/api/contractors", {
          method: "POST",
          body: JSON.stringify(form),
        });
        setContractors((prev) => [created, ...prev]);
      }
      setShowForm(false);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Failed to save contractor");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api(`/api/contractors/${id}`, { method: "DELETE" });
      setContractors((prev) => prev.filter((c) => c.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch {
      // silently ignore
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddDocument = async () => {
    if (!selected) return;
    if (!docForm.name.trim()) { setDocError("Document name is required"); return; }
    setDocSaving(true);
    setDocError("");
    try {
      const newDoc: ContractorDoc = {
        id: `doc-${Date.now()}`,
        name: docForm.name,
        expiry_date: docForm.expiry_date,
        file_url: docForm.file_url,
        status: "valid",
      };
      const updatedDocs = [...(selected.documents ?? []), newDoc];
      const updated = await api<Contractor>(`/api/contractors/${selected.id}`, {
        method: "PUT",
        body: JSON.stringify({ ...selected, documents: updatedDocs }),
      });
      setContractors((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setSelected(updated);
      setShowDocModal(false);
      setDocForm({ ...EMPTY_DOC });
    } catch (e: unknown) {
      setDocError(e instanceof Error ? e.message : "Failed to add document");
    } finally {
      setDocSaving(false);
    }
  };

  return (
    <Layout user={user} title="Contractors" onLogout={onLogout}>

      {/* ── Stats Bar ───────────────────────────────────────────────────── */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Total Contractors",
            value: totalCount,
            color: "text-brand-700",
            bg: "bg-brand-50",
            icon: (
              <svg className="h-5 w-5 text-brand-400" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            ),
          },
          {
            label: "Active",
            value: activeCount,
            color: "text-brand-600",
            bg: "bg-brand-50",
            icon: (
              <svg className="h-5 w-5 text-brand-400" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
          },
          {
            label: "Pending",
            value: pendingCount,
            color: "text-amber-600",
            bg: "bg-amber-50",
            icon: (
              <svg className="h-5 w-5 text-amber-400" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
          },
          {
            label: "Docs Expiring Soon",
            value: expiringDocsCount,
            color: "text-red-600",
            bg: "bg-red-50",
            icon: (
              <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            ),
          },
        ].map((stat) => (
          <div key={stat.label} className={`flex items-center gap-3 rounded-xl border border-brand-100 ${stat.bg} px-4 py-3 shadow-sm`}>
            <div>{stat.icon}</div>
            <div>
              <p className={`font-display text-xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-brand-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Table Header ────────────────────────────────────────────────── */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        {/* Status filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm text-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-400"
        >
          <option value="all">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{statusLabel(s)}</option>
          ))}
        </select>

        <button
          onClick={openAdd}
          className="ml-auto flex items-center gap-1.5 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Contractor
        </button>
      </div>

      {/* ── Contractors Table ────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-brand-100 bg-white shadow-sm">
        {loading ? (
          <div className="space-y-px">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex animate-pulse items-center gap-4 border-b border-brand-50 px-4 py-4 last:border-0">
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-36 rounded bg-brand-100" />
                  <div className="h-3 w-24 rounded bg-brand-50" />
                </div>
                <div className="h-5 w-16 rounded-full bg-brand-100" />
                <div className="h-5 w-16 rounded-full bg-brand-50" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-400">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="font-semibold text-brand-700">No contractors found</p>
            <p className="mt-1 text-sm text-brand-400">
              {filterStatus !== "all" ? "Try changing the status filter." : "Add your first contractor to get started."}
            </p>
            {filterStatus === "all" && (
              <button
                onClick={openAdd}
                className="mt-4 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
              >
                + Add Contractor
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="border-b border-brand-100 bg-brand-50/50">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-brand-400">Company</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-brand-400">Contact</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-brand-400">Trade Type</th>
                  <th className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wide text-brand-400 md:table-cell">Site</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-brand-400">Documents</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-brand-400">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-brand-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const docSummary = getDocsSummary(c.documents);
                  return (
                    <tr
                      key={c.id}
                      className="border-b border-brand-50 last:border-0 transition hover:bg-brand-50/30"
                    >
                      <td className="px-4 py-3">
                        <p
                          className="cursor-pointer font-semibold text-brand-900 hover:text-brand-600 hover:underline"
                          onClick={() => setSelected(c)}
                        >
                          {c.company_name}
                        </p>
                        {c.abn && <p className="text-xs text-brand-400">ABN: {c.abn}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-brand-800">{c.contact_name || "—"}</p>
                        {c.contact_email && (
                          <p className="text-xs text-brand-400">{c.contact_email}</p>
                        )}
                        {c.contact_phone && (
                          <p className="text-xs text-brand-400">{c.contact_phone}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
                          {c.trade_type || "—"}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 text-sm text-brand-600 md:table-cell">
                        {c.site || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {docSummary === "none" ? (
                          <span className="text-xs text-brand-300">No docs</span>
                        ) : (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            docSummary === "expired"
                              ? "bg-red-100 text-red-700"
                              : docSummary === "expiring"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-brand-100 text-brand-700"
                          }`}>
                            {docSummary === "expired"
                              ? "Has Expired"
                              : docSummary === "expiring"
                              ? "Expiring Soon"
                              : `${c.documents.length} Valid`}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(c.status)}`}>
                          {statusLabel(c.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSelected(c)}
                            className="rounded p-1.5 text-brand-400 hover:bg-brand-50 hover:text-brand-700"
                            title="View details"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => openEdit(c)}
                            className="rounded p-1.5 text-brand-400 hover:bg-brand-50 hover:text-brand-700"
                            title="Edit"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeletingId(c.id)}
                            className="rounded p-1.5 text-brand-400 hover:bg-red-50 hover:text-red-600"
                            title="Delete"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add/Edit Contractor Panel ────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
          <div className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-brand-100 px-6 py-4">
              <h2 className="font-display text-lg font-bold text-brand-900">
                {editContractor ? "Edit Contractor" : "Add Contractor"}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg p-1.5 text-brand-400 hover:bg-brand-50 hover:text-brand-700"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {formError && (
                <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-brand-600">Company Name *</label>
                  <input
                    value={form.company_name}
                    onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
                    placeholder="e.g. Acme Electrical Pty Ltd"
                    className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-brand-600">Contact Name</label>
                    <input
                      value={form.contact_name}
                      onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))}
                      placeholder="Full name"
                      className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-brand-600">Contact Phone</label>
                    <input
                      value={form.contact_phone}
                      onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))}
                      placeholder="+61 4xx xxx xxx"
                      className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-brand-600">Contact Email</label>
                  <input
                    type="email"
                    value={form.contact_email}
                    onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))}
                    placeholder="email@company.com"
                    className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-brand-600">ABN</label>
                    <input
                      value={form.abn}
                      onChange={(e) => setForm((f) => ({ ...f, abn: e.target.value }))}
                      placeholder="xx xxx xxx xxx"
                      className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-brand-600">Trade Type</label>
                    <select
                      value={form.trade_type}
                      onChange={(e) => setForm((f) => ({ ...f, trade_type: e.target.value }))}
                      className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                    >
                      {TRADE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-brand-600">Site</label>
                    <input
                      value={form.site}
                      onChange={(e) => setForm((f) => ({ ...f, site: e.target.value }))}
                      placeholder="e.g. Rig Alpha"
                      className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-brand-600">Status</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                      className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{statusLabel(s)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-brand-600">Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    rows={3}
                    placeholder="Any additional notes…"
                    className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-brand-100 px-6 py-4">
              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-brand-200 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-brand-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
              >
                {saving ? "Saving…" : editContractor ? "Save Changes" : "Add Contractor"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Contractor Detail Panel ──────────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
          <div className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-brand-100 px-6 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-lg font-bold text-brand-900">{selected.company_name}</h2>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(selected.status)}`}>
                    {statusLabel(selected.status)}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-brand-500">{selected.trade_type}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="ml-3 rounded-lg p-1.5 text-brand-400 hover:bg-brand-50 hover:text-brand-700"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Info section */}
              <div className="rounded-xl border border-brand-100 bg-brand-50 p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-brand-400">Contractor Info</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  {[
                    ["Contact", selected.contact_name],
                    ["Email", selected.contact_email],
                    ["Phone", selected.contact_phone],
                    ["ABN", selected.abn],
                    ["Site", selected.site],
                    ["Added", selected.created_at ? fmt(selected.created_at) : "—"],
                  ].map(([label, value]) => value ? (
                    <div key={label}>
                      <span className="text-brand-400">{label}: </span>
                      <span className="font-medium text-brand-800">{value}</span>
                    </div>
                  ) : null)}
                </div>
                {selected.notes && (
                  <p className="mt-3 text-sm text-brand-600">{selected.notes}</p>
                )}
              </div>

              {/* Documents */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-brand-500">Documents</p>
                  <button
                    onClick={() => {
                      setDocForm({ ...EMPTY_DOC });
                      setDocError("");
                      setShowDocModal(true);
                    }}
                    className="flex items-center gap-1 rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-800"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Add Document
                  </button>
                </div>

                {(!selected.documents || selected.documents.length === 0) ? (
                  <div className="rounded-xl border border-dashed border-brand-200 bg-white py-8 text-center text-sm text-brand-400">
                    No documents added yet.
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-brand-100">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-brand-100 bg-brand-50/50">
                          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-brand-400">Document</th>
                          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-brand-400">Expiry Date</th>
                          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-brand-400">Status</th>
                          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-brand-400">File</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selected.documents.map((doc) => {
                          const ds = docStatus(doc);
                          return (
                            <tr key={doc.id} className={`border-b border-brand-50 last:border-0 ${docRowClass(ds)}`}>
                              <td className="px-4 py-2.5 font-medium text-brand-900">{doc.name}</td>
                              <td className="px-4 py-2.5 text-brand-600">{doc.expiry_date ? fmt(doc.expiry_date) : "—"}</td>
                              <td className="px-4 py-2.5">
                                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${docBadgeClass(ds)}`}>
                                  {docBadgeLabel(ds)}
                                </span>
                              </td>
                              <td className="px-4 py-2.5">
                                {doc.file_url ? (
                                  <a
                                    href={doc.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 hover:underline"
                                  >
                                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                    View
                                  </a>
                                ) : (
                                  <span className="text-xs text-brand-300">No file</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center gap-2 border-t border-brand-100 px-6 py-4">
              <button
                onClick={() => {
                  setSelected(null);
                  openEdit(selected);
                }}
                className="flex items-center gap-1.5 rounded-lg border border-brand-200 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
              <button
                onClick={() => setDeletingId(selected.id)}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
              <button
                onClick={() => setSelected(null)}
                className="ml-auto rounded-lg border border-brand-200 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Document Modal ───────────────────────────────────────────── */}
      {showDocModal && selected && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-1 font-display text-base font-bold text-brand-900">Add Document</h3>
            <p className="mb-4 text-xs text-brand-400">Adding to: {selected.company_name}</p>

            {docError && (
              <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{docError}</div>
            )}

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-brand-600">Document Name *</label>
                <input
                  value={docForm.name}
                  onChange={(e) => setDocForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Public Liability Insurance"
                  className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-brand-600">Expiry Date</label>
                <input
                  type="date"
                  value={docForm.expiry_date}
                  onChange={(e) => setDocForm((f) => ({ ...f, expiry_date: e.target.value }))}
                  className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-brand-600">File URL</label>
                <input
                  value={docForm.file_url}
                  onChange={(e) => setDocForm((f) => ({ ...f, file_url: e.target.value }))}
                  placeholder="https://…"
                  className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => { setShowDocModal(false); setDocError(""); }}
                className="rounded-lg border border-brand-200 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddDocument}
                disabled={docSaving}
                className="rounded-lg bg-brand-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
              >
                {docSaving ? "Saving…" : "Add Document"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ─────────────────────────────────────────── */}
      {deletingId && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="font-display text-base font-bold text-brand-900">Delete Contractor?</h3>
            <p className="mt-1 text-sm text-brand-500">
              This will permanently remove the contractor and all associated documents. This action cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setDeletingId(null)}
                className="rounded-lg border border-brand-200 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Delete Contractor
              </button>
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
}
