import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { api, type DashboardSummary, type IssuesSummary, type ActionsSummary } from "../api";
import type { User } from "../types";

type InspectionSummary = {
  total: number;
  by_status: Record<string, number>;
  avg_score: number | null;
};

type Props = { user: User | null; onLogout: () => void };

const STATUS_COLORS: Record<string, string> = {
  draft:            "#9fd78a",
  pending_approval: "#f59e0b",
  approved:         "#22c55e",
};

export default function DashboardPage({ user, onLogout }: Props) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [inspSummary, setInspSummary] = useState<InspectionSummary | null>(null);
  const [issuesSummary, setIssuesSummary] = useState<IssuesSummary | null>(null);
  const [actionsSummary, setActionsSummary] = useState<ActionsSummary | null>(null);
  const isSup = user?.role === "supervisor" || user?.role === "admin";

  useEffect(() => {
    api<DashboardSummary>("/api/dashboard/summary").then(setSummary).catch(() => null);
    api<InspectionSummary>("/api/inspections/stats/summary").then(setInspSummary).catch(() => null);
    api<IssuesSummary>("/api/issues/stats/summary").then(setIssuesSummary).catch(() => null);
    api<ActionsSummary>("/api/actions/stats/summary").then(setActionsSummary).catch(() => null);
  }, []);

  return (
    <Layout user={user} title="Operations Dashboard" onLogout={onLogout}>

      {/* ── Inspections KPIs ──────────────────────────────────────────── */}
      <div className="mb-2">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-brand-400">Inspections</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl bg-white p-4 shadow-sm" style={{ borderLeft: "4px solid #377133" }}>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-400">Total</p>
            <p className="mt-1 font-display text-2xl font-bold text-brand-700">{inspSummary?.total ?? 0}</p>
            <Link to="/inspections" className="mt-1 block text-xs text-brand-400 hover:text-brand-700">View all →</Link>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm" style={{ borderLeft: "4px solid #f59e0b" }}>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-400">In Progress</p>
            <p className="mt-1 font-display text-2xl font-bold text-amber-600">
              {inspSummary?.by_status?.["in_progress"] ?? 0}
            </p>
            <Link to="/inspections?status=in_progress" className="mt-1 block text-xs text-brand-400 hover:text-brand-700">Resume →</Link>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm" style={{ borderLeft: "4px solid #22c55e" }}>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-400">Completed</p>
            <p className="mt-1 font-display text-2xl font-bold text-green-600">
              {inspSummary?.by_status?.["completed"] ?? 0}
            </p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm" style={{ borderLeft: "4px solid #0284c7" }}>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-400">Avg Score</p>
            <p className="mt-1 font-display text-2xl font-bold text-sky-600">
              {inspSummary?.avg_score !== null && inspSummary?.avg_score !== undefined
                ? `${inspSummary.avg_score}%`
                : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Issues + Actions KPIs ─────────────────────────────────────── */}
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl bg-white p-4 shadow-sm" style={{ borderLeft: "4px solid #ef4444" }}>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-400">Open Issues</p>
          <p className="mt-1 font-display text-2xl font-bold text-red-500">
            {issuesSummary?.by_status?.["open"] ?? 0}
          </p>
          <Link to="/issues" className="mt-1 block text-xs text-brand-400 hover:text-brand-700">View all →</Link>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm" style={{ borderLeft: "4px solid #f97316" }}>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-400">High Priority</p>
          <p className="mt-1 font-display text-2xl font-bold text-orange-500">
            {issuesSummary?.by_priority?.["high"] ?? 0}
          </p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm" style={{ borderLeft: "4px solid #3b82f6" }}>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-400">Open Actions</p>
          <p className="mt-1 font-display text-2xl font-bold text-blue-500">
            {(actionsSummary?.by_status?.["to_do"] ?? 0) + (actionsSummary?.by_status?.["in_progress"] ?? 0)}
          </p>
          <Link to="/actions" className="mt-1 block text-xs text-brand-400 hover:text-brand-700">View all →</Link>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm" style={{ borderLeft: "4px solid #dc2626" }}>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-400">Overdue Actions</p>
          <p className="mt-1 font-display text-2xl font-bold text-red-600">
            {actionsSummary?.overdue ?? 0}
          </p>
          <Link to="/actions" className="mt-1 block text-xs text-brand-400 hover:text-brand-700">Review →</Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Quick Actions */}
        <div className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-brand-500">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-2">
            <Link
              to="/inspections"
              className="flex items-center gap-1.5 rounded-lg bg-brand-700 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
            >
              📋 Inspections
            </Link>
            <Link
              to="/issues"
              className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-800 transition-colors hover:bg-red-100"
            >
              ⚠ Report Issue
            </Link>
            <Link
              to="/actions"
              className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm font-semibold text-blue-800 transition-colors hover:bg-blue-100"
            >
              ✓ Actions
            </Link>
            <Link
              to="/assets"
              className="flex items-center gap-1.5 rounded-lg border border-brand-200 bg-white px-3 py-2.5 text-sm font-semibold text-brand-800 transition-colors hover:bg-brand-50"
            >
              📦 Assets
            </Link>
            <Link
              to="/analytics"
              className="flex items-center gap-1.5 rounded-lg border border-brand-200 bg-white px-3 py-2.5 text-sm font-semibold text-brand-800 transition-colors hover:bg-brand-50"
            >
              📊 Analytics
            </Link>
            <Link
              to="/documents"
              className="flex items-center gap-1.5 rounded-lg border border-brand-200 bg-white px-3 py-2.5 text-sm font-semibold text-brand-800 transition-colors hover:bg-brand-50"
            >
              ≡ Documents
            </Link>
            <Link
              to="/sync"
              className="flex items-center gap-1.5 rounded-lg border border-brand-200 bg-white px-3 py-2.5 text-sm font-semibold text-brand-800 transition-colors hover:bg-brand-50"
            >
              ↻ Offline Sync
            </Link>
            {isSup && (
              <Link
                to="/supervisor"
                className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-100"
              >
                ⊙ Approvals
              </Link>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {/* Inspection status breakdown */}
          {inspSummary && inspSummary.total > 0 && (
            <div className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-brand-500">Inspection Status</h2>
              <div className="space-y-3">
                {Object.entries(inspSummary.by_status).map(([status, count]) => {
                  const pct = Math.round((count / inspSummary.total) * 100);
                  const color = status === "approved" ? "#22c55e" : status === "completed" ? "#3b82f6" : "#f59e0b";
                  return (
                    <div key={status}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="font-medium capitalize text-brand-700">{status.replace("_", " ")}</span>
                        <span className="font-bold text-brand-900">{count}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-brand-100">
                        <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Issues by type */}
          {issuesSummary && issuesSummary.total > 0 && (
            <div className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-brand-500">Issues by Type</h2>
              <div className="space-y-1.5">
                {Object.entries(issuesSummary.by_type).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between text-sm">
                    <span className="capitalize text-brand-700">{type.replace("_", " ")}</span>
                    <span className="font-bold text-brand-900">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Legacy JSA status (kept for existing data) */}
          {summary && summary.kpi.total_jsa > 0 && (
            <div className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-brand-500">Legacy JSA Records</h2>
              <div className="space-y-2">
                {summary.status_breakdown.map((item) => {
                  const total = summary.kpi.total_jsa || 1;
                  const pct = Math.round((item.count / total) * 100);
                  return (
                    <div key={item.status}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="font-medium capitalize text-brand-700">{item.status.replace(/_/g, " ")}</span>
                        <span className="font-bold text-brand-900">{item.count}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-brand-100">
                        <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: STATUS_COLORS[item.status] ?? "#9fd78a" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
