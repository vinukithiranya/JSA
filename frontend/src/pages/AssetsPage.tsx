import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { api } from "../api";
import type { User } from "../types";

type Props = { user: User | null; onLogout: () => void };

// ── Types ─────────────────────────────────────────────────────────────────────

interface Reading {
  id: string;
  reading_type: string;
  value: number;
  unit: string;
  date: string;
  recorded_at: string;
}

interface Asset {
  id: string;
  name: string;
  asset_number: string;
  asset_type: string;
  make: string;
  model_name: string;
  serial_number: string;
  site: string;
  status: string;
  description: string;
  readings: Reading[];
  created_at: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ASSET_TYPES = ["Equipment", "Vehicle", "Tool", "Machinery", "Electrical"];
const READING_TYPES = ["Odometer", "Runtime Hours", "Temperature", "Pressure", "Fuel Level", "Other"];
const STATUSES = ["active", "maintenance", "inactive"];

const EMPTY_ASSET: Omit<Asset, "id" | "readings" | "created_at"> = {
  name: "",
  asset_number: "",
  asset_type: "Equipment",
  make: "",
  model_name: "",
  serial_number: "",
  site: "",
  status: "active",
  description: "",
};

const EMPTY_READING = {
  reading_type: "Odometer",
  value: 0,
  unit: "",
  date: new Date().toISOString().split("T")[0],
};

/** Returns the Tailwind CSS class string for the given asset status badge. */
function statusBadge(status: string): string {
  if (status === "active") return "bg-brand-100 text-brand-700";
  if (status === "maintenance") return "bg-amber-100 text-amber-700";
  return "bg-gray-100 text-gray-600";
}

/** Returns a human-readable label for the given asset status value. */
function statusLabel(status: string): string {
  if (status === "active") return "Active";
  if (status === "maintenance") return "Maintenance";
  return "Inactive";
}

/** Formats a date string as a localised "DD Mon YYYY" string for display. */
function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

/** Renders an animated placeholder card shown while assets are loading. */
function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-brand-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between">
        <div className="h-4 w-28 rounded bg-brand-100" />
        <div className="h-5 w-16 rounded-full bg-brand-100" />
      </div>
      <div className="mb-2 h-3 w-20 rounded bg-brand-50" />
      <div className="mb-1 h-3 w-32 rounded bg-brand-50" />
      <div className="h-3 w-24 rounded bg-brand-50" />
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

/** Renders the Assets page with a filterable grid of asset cards, add/edit and detail slide-in panels, and reading/delete modals. */
export default function AssetsPage({ user, onLogout }: Props) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");

  // Add/Edit asset panel
  const [showForm, setShowForm] = useState(false);
  const [editAsset, setEditAsset] = useState<Asset | null>(null);
  const [form, setForm] = useState({ ...EMPTY_ASSET });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Detail panel
  const [selected, setSelected] = useState<Asset | null>(null);

  // Add reading modal
  const [showReadingModal, setShowReadingModal] = useState(false);
  const [readingForm, setReadingForm] = useState({ ...EMPTY_READING });
  const [readingSaving, setReadingSaving] = useState(false);
  const [readingError, setReadingError] = useState("");

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api<Asset[]>("/api/assets")
      .then(setAssets)
      .catch(() => setAssets([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = assets.filter((a) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      a.name.toLowerCase().includes(q) ||
      a.asset_number.toLowerCase().includes(q);
    const matchStatus = filterStatus === "all" || a.status === filterStatus;
    const matchType = filterType === "all" || a.asset_type === filterType;
    return matchSearch && matchStatus && matchType;
  });

  const openAdd = () => {
    setEditAsset(null);
    setForm({ ...EMPTY_ASSET });
    setFormError("");
    setShowForm(true);
  };

  const openEdit = (a: Asset) => {
    setEditAsset(a);
    setForm({
      name: a.name,
      asset_number: a.asset_number,
      asset_type: a.asset_type,
      make: a.make,
      model_name: a.model_name,
      serial_number: a.serial_number,
      site: a.site,
      status: a.status,
      description: a.description,
    });
    setFormError("");
    setShowForm(true);
  };

  const handleSaveAsset = async () => {
    if (!form.name.trim()) { setFormError("Asset name is required"); return; }
    setSaving(true);
    setFormError("");
    try {
      if (editAsset) {
        const updated = await api<Asset>(`/api/assets/${editAsset.id}`, {
          method: "PUT",
          body: JSON.stringify(form),
        });
        setAssets((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
        if (selected?.id === updated.id) setSelected(updated);
      } else {
        const created = await api<Asset>("/api/assets", {
          method: "POST",
          body: JSON.stringify(form),
        });
        setAssets((prev) => [created, ...prev]);
      }
      setShowForm(false);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Failed to save asset");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAsset = async (id: string) => {
    try {
      await api(`/api/assets/${id}`, { method: "DELETE" });
      setAssets((prev) => prev.filter((a) => a.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch {
      // silently ignore
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddReading = async () => {
    if (!selected) return;
    if (!readingForm.unit.trim()) { setReadingError("Unit is required"); return; }
    setReadingSaving(true);
    setReadingError("");
    try {
      const updated = await api<Asset>(`/api/assets/${selected.id}/readings`, {
        method: "POST",
        body: JSON.stringify(readingForm),
      });
      setAssets((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      setSelected(updated);
      setShowReadingModal(false);
      setReadingForm({ ...EMPTY_READING });
    } catch (e: unknown) {
      setReadingError(e instanceof Error ? e.message : "Failed to add reading");
    } finally {
      setReadingSaving(false);
    }
  };

  const uniqueTypes = Array.from(new Set(assets.map((a) => a.asset_type))).filter(Boolean);

  return (
    <Layout user={user} title="Assets" onLogout={onLogout}>

      {/* ── Filter Bar ──────────────────────────────────────────────────── */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-brand-300">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or number…"
            className="w-full rounded-lg border border-brand-200 bg-white py-2 pl-9 pr-3 text-sm text-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>

        {/* Status filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm text-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-400"
        >
          <option value="all">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s} className="capitalize">{statusLabel(s)}</option>
          ))}
        </select>

        {/* Type filter */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm text-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-400"
        >
          <option value="all">All Types</option>
          {(uniqueTypes.length ? uniqueTypes : ASSET_TYPES).map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <button
          onClick={openAdd}
          className="ml-auto flex items-center gap-1.5 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Asset
        </button>
      </div>

      {/* ── Card Grid ───────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-brand-200 bg-white py-16 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-400">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <p className="font-semibold text-brand-700">No assets found</p>
          <p className="mt-1 text-sm text-brand-400">
            {search || filterStatus !== "all" || filterType !== "all"
              ? "Try adjusting your filters."
              : "Add your first asset to get started."}
          </p>
          {!search && filterStatus === "all" && filterType === "all" && (
            <button
              onClick={openAdd}
              className="mt-4 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
            >
              + Add Asset
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((asset) => {
            const lastReading = asset.readings?.[asset.readings.length - 1];
            return (
              <div
                key={asset.id}
                onClick={() => setSelected(asset)}
                className="cursor-pointer rounded-xl border border-brand-100 bg-white p-4 shadow-sm transition-all hover:border-brand-300 hover:shadow-md"
              >
                {/* Header row */}
                <div className="mb-3 flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-brand-900 leading-snug">{asset.name}</h3>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(asset.status)}`}>
                    {statusLabel(asset.status)}
                  </span>
                </div>

                {/* Asset number badge */}
                {asset.asset_number && (
                  <span className="mb-2 inline-block rounded bg-brand-50 px-2 py-0.5 font-mono text-xs text-brand-600">
                    #{asset.asset_number}
                  </span>
                )}

                {/* Meta */}
                <div className="mt-1 space-y-1 text-xs text-brand-500">
                  <div className="flex items-center gap-1.5">
                    <svg className="h-3.5 w-3.5 text-brand-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h10M7 12h6" />
                    </svg>
                    <span>{asset.asset_type}</span>
                    {(asset.make || asset.model_name) && (
                      <span className="text-brand-400">— {[asset.make, asset.model_name].filter(Boolean).join(" ")}</span>
                    )}
                  </div>
                  {asset.site && (
                    <div className="flex items-center gap-1.5">
                      <svg className="h-3.5 w-3.5 text-brand-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>{asset.site}</span>
                    </div>
                  )}
                  {lastReading && (
                    <div className="flex items-center gap-1.5">
                      <svg className="h-3.5 w-3.5 text-brand-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <span>Last: {lastReading.reading_type} — {lastReading.value} {lastReading.unit}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add/Edit Asset Slide-in Panel ────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
          <div className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-brand-100 px-6 py-4">
              <h2 className="font-display text-lg font-bold text-brand-900">
                {editAsset ? "Edit Asset" : "Add Asset"}
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

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {formError && (
                <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-brand-600">Asset Name *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Drilling Rig Unit 4"
                    className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-brand-600">Asset Number</label>
                    <input
                      value={form.asset_number}
                      onChange={(e) => setForm((f) => ({ ...f, asset_number: e.target.value }))}
                      placeholder="e.g. A-1042"
                      className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-brand-600">Asset Type</label>
                    <select
                      value={form.asset_type}
                      onChange={(e) => setForm((f) => ({ ...f, asset_type: e.target.value }))}
                      className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                    >
                      {ASSET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-brand-600">Make</label>
                    <input
                      value={form.make}
                      onChange={(e) => setForm((f) => ({ ...f, make: e.target.value }))}
                      placeholder="e.g. Caterpillar"
                      className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-brand-600">Model</label>
                    <input
                      value={form.model_name}
                      onChange={(e) => setForm((f) => ({ ...f, model_name: e.target.value }))}
                      placeholder="e.g. 320D"
                      className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-brand-600">Serial Number</label>
                    <input
                      value={form.serial_number}
                      onChange={(e) => setForm((f) => ({ ...f, serial_number: e.target.value }))}
                      placeholder="e.g. SN-000123"
                      className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-brand-600">Site</label>
                    <input
                      value={form.site}
                      onChange={(e) => setForm((f) => ({ ...f, site: e.target.value }))}
                      placeholder="e.g. Rig Alpha"
                      className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                  </div>
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

                <div>
                  <label className="mb-1 block text-xs font-semibold text-brand-600">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={3}
                    placeholder="Optional notes about this asset…"
                    className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-brand-100 px-6 py-4">
              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-brand-200 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAsset}
                disabled={saving}
                className="rounded-lg bg-brand-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
              >
                {saving ? "Saving…" : editAsset ? "Save Changes" : "Add Asset"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Asset Detail Panel ───────────────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
          <div className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-brand-100 px-6 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-lg font-bold text-brand-900">{selected.name}</h2>
                  {selected.asset_number && (
                    <span className="rounded bg-brand-50 px-2 py-0.5 font-mono text-xs text-brand-600">
                      #{selected.asset_number}
                    </span>
                  )}
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(selected.status)}`}>
                    {statusLabel(selected.status)}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-brand-500">
                  {selected.asset_type}
                  {(selected.make || selected.model_name) && (
                    <span className="text-brand-400"> — {[selected.make, selected.model_name].filter(Boolean).join(" ")}</span>
                  )}
                </p>
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
              {/* Details */}
              <div className="rounded-xl border border-brand-100 bg-brand-50 p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-brand-400">Asset Details</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  {[
                    ["Serial Number", selected.serial_number],
                    ["Site", selected.site],
                    ["Make", selected.make],
                    ["Model", selected.model_name],
                    ["Type", selected.asset_type],
                    ["Added", selected.created_at ? fmt(selected.created_at) : "—"],
                  ].map(([label, value]) => value ? (
                    <div key={label}>
                      <span className="text-brand-400">{label}: </span>
                      <span className="font-medium text-brand-800">{value}</span>
                    </div>
                  ) : null)}
                </div>
                {selected.description && (
                  <p className="mt-3 text-sm text-brand-600">{selected.description}</p>
                )}
              </div>

              {/* Readings */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-brand-500">Readings History</p>
                  <button
                    onClick={() => {
                      setReadingForm({ ...EMPTY_READING });
                      setReadingError("");
                      setShowReadingModal(true);
                    }}
                    className="flex items-center gap-1 rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-800"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Add Reading
                  </button>
                </div>

                {(!selected.readings || selected.readings.length === 0) ? (
                  <div className="rounded-xl border border-dashed border-brand-200 bg-white py-8 text-center text-sm text-brand-400">
                    No readings recorded yet.
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-brand-100 bg-white">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-brand-100 bg-brand-50/50">
                          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-brand-400">Date</th>
                          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-brand-400">Type</th>
                          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-brand-400">Value</th>
                          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-brand-400">Unit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...selected.readings].reverse().map((r) => (
                          <tr key={r.id} className="border-b border-brand-50 last:border-0 hover:bg-brand-50/30">
                            <td className="px-4 py-2.5 text-brand-600">{fmt(r.date)}</td>
                            <td className="px-4 py-2.5 text-brand-800 font-medium">{r.reading_type}</td>
                            <td className="px-4 py-2.5 font-mono text-brand-700">{r.value}</td>
                            <td className="px-4 py-2.5 text-brand-500">{r.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Footer actions */}
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

      {/* ── Add Reading Modal ────────────────────────────────────────────── */}
      {showReadingModal && selected && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 font-display text-base font-bold text-brand-900">Add Reading</h3>

            {readingError && (
              <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{readingError}</div>
            )}

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-brand-600">Reading Type</label>
                  <select
                    value={readingForm.reading_type}
                    onChange={(e) => setReadingForm((f) => ({ ...f, reading_type: e.target.value }))}
                    className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  >
                    {READING_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-brand-600">Date</label>
                  <input
                    type="date"
                    value={readingForm.date}
                    onChange={(e) => setReadingForm((f) => ({ ...f, date: e.target.value }))}
                    className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-brand-600">Value</label>
                  <input
                    type="number"
                    value={readingForm.value}
                    onChange={(e) => setReadingForm((f) => ({ ...f, value: parseFloat(e.target.value) || 0 }))}
                    className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-brand-600">Unit *</label>
                  <input
                    value={readingForm.unit}
                    onChange={(e) => setReadingForm((f) => ({ ...f, unit: e.target.value }))}
                    placeholder="e.g. km, hrs, °C"
                    className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => { setShowReadingModal(false); setReadingError(""); }}
                className="rounded-lg border border-brand-200 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddReading}
                disabled={readingSaving}
                className="rounded-lg bg-brand-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
              >
                {readingSaving ? "Saving…" : "Save Reading"}
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
            <h3 className="font-display text-base font-bold text-brand-900">Delete Asset?</h3>
            <p className="mt-1 text-sm text-brand-500">
              This will permanently delete the asset and all its readings. This action cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setDeletingId(null)}
                className="rounded-lg border border-brand-200 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteAsset(deletingId)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Delete Asset
              </button>
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
}
