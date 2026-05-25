import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { api } from "../api";
import type { FormTemplate, User } from "../types";

type Props = { user: User | null; onLogout: () => void };

type ViewMode = "grid" | "list";

const CATEGORY_COLORS: Record<string, string> = {
  safety: "bg-red-100 text-red-700",
  quality: "bg-blue-100 text-blue-700",
  environmental: "bg-green-100 text-green-700",
  maintenance: "bg-orange-100 text-orange-700",
  operations: "bg-purple-100 text-purple-700",
  training: "bg-yellow-100 text-yellow-700",
};

function categoryColor(cat: string): string {
  return CATEGORY_COLORS[cat?.toLowerCase()] ?? "bg-brand-100 text-brand-700";
}

function countFields(t: FormTemplate): number {
  return (
    t.form_schema?.sections?.reduce(
      (sum, s) => sum + (s.questions?.length ?? 0),
      0
    ) ?? 0
  );
}

function countSections(t: FormTemplate): number {
  return t.form_schema?.sections?.length ?? 0;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const GridIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);

const ListIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
  </svg>
);

const SearchIcon = () => (
  <svg className="h-4 w-4 text-brand-400" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const TemplateIcon = () => (
  <svg className="h-10 w-10 text-brand-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
  </svg>
);

const PlayIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const DotsIcon = () => (
  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 7a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 7a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
  </svg>
);

// ── Start Inspection Modal ────────────────────────────────────────────────────

interface StartModalProps {
  template: FormTemplate;
  onClose: () => void;
  onStart: (site: string) => void;
  loading: boolean;
}

function StartModal({ template, onClose, onStart, loading }: StartModalProps) {
  const [site, setSite] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-card">
        <div className="border-b border-brand-100 px-6 py-4">
          <h2 className="font-display text-base font-semibold text-brand-900">Start Inspection</h2>
          <p className="mt-0.5 text-sm text-brand-500">Using: <span className="font-medium text-brand-700">{template.name}</span></p>
        </div>
        <div className="px-6 py-4">
          <label className="block text-sm font-medium text-brand-700">Site / Location</label>
          <input
            className="mt-1.5 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-200"
            placeholder="e.g. Rig Alpha — Deck 2"
            value={site}
            onChange={(e) => setSite(e.target.value)}
            autoFocus
          />
          <p className="mt-1 text-xs text-brand-400">Leave blank to fill in during the inspection</p>
        </div>
        <div className="flex justify-end gap-3 border-t border-brand-100 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-brand-200 px-4 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onStart(site)}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:opacity-60"
          >
            {loading ? (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <PlayIcon />
            )}
            Start Inspection
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Template Card (Grid view) ─────────────────────────────────────────────────

function TemplateCard({
  template,
  onStart,
  onEdit,
  onDuplicate,
  onArchive,
}: {
  template: FormTemplate;
  onStart: (t: FormTemplate) => void;
  onEdit: (t: FormTemplate) => void;
  onDuplicate: (t: FormTemplate) => void;
  onArchive: (t: FormTemplate) => void;
}) {
  const sections = countSections(template);
  const questions = countFields(template);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="group relative flex flex-col rounded-xl border border-brand-100 bg-white p-4 shadow-sm transition hover:shadow-card">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50">
          <svg className="h-5 w-5 text-brand-600" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${categoryColor(template.category)}`}>
          {template.category || "General"}
        </span>
      </div>

      {/* Name & description */}
      <h3 className="mt-3 font-display text-sm font-semibold leading-snug text-brand-900 line-clamp-2">
        {template.name}
      </h3>
      {template.description && (
        <p className="mt-1 text-xs leading-relaxed text-brand-500 line-clamp-2">
          {template.description}
        </p>
      )}

      {/* Meta */}
      <div className="mt-3 flex items-center gap-3 text-xs text-brand-400">
        <span>{sections} section{sections !== 1 ? "s" : ""}</span>
        <span className="text-brand-200">•</span>
        <span>{questions} question{questions !== 1 ? "s" : ""}</span>
      </div>

      {/* Action */}
      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={() => onStart(template)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-800"
        >
          <PlayIcon />
          Start Inspection
        </button>
        <div className="relative">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="rounded-lg border border-brand-100 p-2 text-brand-400 transition hover:bg-brand-50 hover:text-brand-600"
          >
            <DotsIcon />
          </button>
          {menuOpen && (
            <div className="absolute right-0 z-50 mt-1 w-44 overflow-hidden rounded-xl border border-brand-100 bg-white shadow-card">
              <button onClick={() => { setMenuOpen(false); onEdit(template); }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-brand-800 hover:bg-brand-50">
                Edit template
              </button>
              <button onClick={() => { setMenuOpen(false); onDuplicate(template); }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-brand-800 hover:bg-brand-50">
                Duplicate
              </button>
              <button onClick={() => { setMenuOpen(false); onArchive(template); }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                Archive
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Template Row (List view) ──────────────────────────────────────────────────

function TemplateRow({
  template,
  onStart,
  onEdit,
  onDuplicate,
  onArchive,
}: {
  template: FormTemplate;
  onStart: (t: FormTemplate) => void;
  onEdit: (t: FormTemplate) => void;
  onDuplicate: (t: FormTemplate) => void;
  onArchive: (t: FormTemplate) => void;
}) {
  const sections = countSections(template);
  const questions = countFields(template);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <tr className="group border-b border-brand-50 transition hover:bg-brand-50/50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50">
            <svg className="h-4 w-4 text-brand-600" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-brand-900">{template.name}</p>
            {template.description && (
              <p className="text-xs text-brand-400 line-clamp-1">{template.description}</p>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${categoryColor(template.category)}`}>
          {template.category || "General"}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-brand-600">{sections}</td>
      <td className="px-4 py-3 text-sm text-brand-600">{questions}</td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => onStart(template)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-800"
          >
            <PlayIcon />
            Start
          </button>
          <div className="relative">
            <button onClick={() => setMenuOpen(v => !v)}
              className="rounded-lg border border-brand-100 p-1.5 text-brand-400 transition hover:bg-brand-50 hover:text-brand-600">
              <DotsIcon />
            </button>
            {menuOpen && (
              <div className="absolute right-0 z-50 mt-1 w-44 overflow-hidden rounded-xl border border-brand-100 bg-white shadow-card">
                <button onClick={() => { setMenuOpen(false); onEdit(template); }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-brand-800 hover:bg-brand-50">
                  Edit template
                </button>
                <button onClick={() => { setMenuOpen(false); onDuplicate(template); }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-brand-800 hover:bg-brand-50">
                  Duplicate
                </button>
                <button onClick={() => { setMenuOpen(false); onArchive(template); }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                  Archive
                </button>
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TemplatesPage({ user, onLogout }: Props) {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [startTarget, setStartTarget] = useState<FormTemplate | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    api<FormTemplate[]>("/api/templates")
      .then(setTemplates)
      .catch(() => setError("Failed to load templates"))
      .finally(() => setLoading(false));
  }, []);

  async function handleDuplicate(t: FormTemplate) {
    try {
      const copy = await api<FormTemplate>(`/api/templates/${t.id}/duplicate`, { method: "POST" });
      setTemplates(prev => [copy, ...prev]);
    } catch {
      alert("Failed to duplicate template.");
    }
  }

  async function handleArchive(t: FormTemplate) {
    if (!confirm(`Archive "${t.name}"? It will no longer be available for inspections.`)) return;
    try {
      await api(`/api/templates/${t.id}`, { method: "DELETE" });
      setTemplates(prev => prev.filter(x => x.id !== t.id));
    } catch {
      alert("Failed to archive template.");
    }
  }

  const categories = useMemo(() => {
    const cats = Array.from(new Set(templates.map((t) => t.category).filter(Boolean)));
    return cats.sort();
  }, [templates]);

  const filtered = useMemo(() => {
    return templates.filter((t) => {
      const matchSearch =
        !search ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.description?.toLowerCase().includes(search.toLowerCase()) ||
        t.category?.toLowerCase().includes(search.toLowerCase());
      const matchCat = filterCategory === "all" || t.category === filterCategory;
      return matchSearch && matchCat;
    });
  }, [templates, search, filterCategory]);

  async function handleStart(site: string) {
    if (!startTarget || !user) return;
    setStarting(true);
    try {
      const res = await api<{ id: string }>("/api/inspections", {
        method: "POST",
        body: JSON.stringify({
          template_id: startTarget.id,
          title: startTarget.name,
          site: site || "",
          conducted_by: user.full_name,
        }),
      });
      navigate(`/inspections/conduct/${res.id}`);
    } catch {
      alert("Failed to start inspection. Please try again.");
    } finally {
      setStarting(false);
    }
  }

  return (
    <Layout user={user} title="Templates" onLogout={onLogout}>
      {/* ── Toolbar ── */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <button
          onClick={() => navigate("/templates/new")}
          className="flex items-center gap-1.5 rounded-lg bg-brand-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-800"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          New Template
        </button>
        {/* Search */}
        <div className="relative flex-1" style={{ minWidth: 220 }}>
          <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
            <SearchIcon />
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates…"
            className="w-full rounded-lg border border-brand-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-200"
          />
        </div>

        {/* Category filter */}
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm text-brand-700 outline-none focus:border-brand-500"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c} className="capitalize">
              {c}
            </option>
          ))}
        </select>

        {/* View toggle */}
        <div className="flex rounded-lg border border-brand-200 bg-white p-0.5">
          <button
            onClick={() => setViewMode("grid")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
              viewMode === "grid" ? "bg-brand-700 text-white shadow-sm" : "text-brand-500 hover:text-brand-700"
            }`}
          >
            <GridIcon />
            Grid
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
              viewMode === "list" ? "bg-brand-700 text-white shadow-sm" : "text-brand-500 hover:text-brand-700"
            }`}
          >
            <ListIcon />
            List
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <svg className="h-6 w-6 animate-spin text-brand-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
      ) : error ? (
        <div className="flex h-48 flex-col items-center justify-center gap-2 text-center">
          <p className="text-sm font-medium text-red-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-brand-600 underline"
          >
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
          <TemplateIcon />
          <p className="font-display text-sm font-semibold text-brand-700">
            {templates.length === 0 ? "No templates yet" : "No templates match your search"}
          </p>
          <p className="text-xs text-brand-400">
            {templates.length === 0
              ? "Templates are created in the Form Builder and appear here once published."
              : "Try adjusting your search or category filter."}
          </p>
          {search || filterCategory !== "all" ? (
            <button
              onClick={() => { setSearch(""); setFilterCategory("all"); }}
              className="text-xs text-brand-600 underline"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((t) => (
            <TemplateCard key={t.id} template={t} onStart={setStartTarget}
              onEdit={tmpl => navigate(`/templates/edit/${tmpl.id}`)}
              onDuplicate={handleDuplicate}
              onArchive={handleArchive} />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-brand-100 bg-white shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-brand-100 bg-brand-50/50">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-brand-400">Template</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-brand-400">Category</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-brand-400">Sections</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-brand-400">Questions</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <TemplateRow key={t.id} template={t} onStart={setStartTarget}
                  onEdit={tmpl => navigate(`/templates/edit/${tmpl.id}`)}
                  onDuplicate={handleDuplicate}
                  onArchive={handleArchive} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Template count */}
      {!loading && !error && filtered.length > 0 && (
        <p className="mt-4 text-xs text-brand-400">
          {filtered.length} template{filtered.length !== 1 ? "s" : ""}
          {templates.length !== filtered.length ? ` (filtered from ${templates.length})` : ""}
        </p>
      )}

      {/* Start modal */}
      {startTarget && (
        <StartModal
          template={startTarget}
          loading={starting}
          onClose={() => setStartTarget(null)}
          onStart={handleStart}
        />
      )}
    </Layout>
  );
}
