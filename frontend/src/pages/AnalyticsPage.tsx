import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { api } from "../api";
import type { User } from "../types";

type Props = { user: User | null; onLogout: () => void };

interface Summary {
  total_inspections: number;
  completed_inspections: number;
  inspection_completion_rate: number;
  total_issues: number;
  open_issues: number;
  total_actions: number;
  overdue_actions: number;
  completed_actions: number;
}

interface InspectionStats {
  total: number;
  by_status: Record<string, number>;
  by_template: { name: string; count: number }[];
  average_score: number;
  flagged_rate: number;
}

interface IssueStats {
  total: number;
  by_status: Record<string, number>;
  by_priority: Record<string, number>;
  by_type: Record<string, number>;
}

interface ActionStats {
  total: number;
  by_status: Record<string, number>;
  by_priority: Record<string, number>;
  overdue: number;
}

type Tab = "overview" | "inspections" | "issues" | "actions";

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-36 shrink-0 truncate text-xs text-brand-600">{label}</span>
      <div className="flex-1 overflow-hidden rounded-full bg-brand-100 h-4">
        <div
          className={`h-4 rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right text-xs font-semibold text-brand-700">{value}</span>
    </div>
  );
}

function ProgressBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-brand-600">{label}</span>
        <span className="font-semibold text-brand-800">{value.toFixed(1)}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-brand-100">
        <div className={`h-3 rounded-full ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl border border-brand-100 bg-white px-5 py-4 shadow-sm">
      <p className="text-xs font-medium text-brand-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${color ?? "text-brand-900"}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-brand-400">{sub}</p>}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
    </div>
  );
}

export default function AnalyticsPage({ user, onLogout }: Props) {
  const [tab, setTab] = useState<Tab>("overview");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [inspStats, setInspStats] = useState<InspectionStats | null>(null);
  const [issueStats, setIssueStats] = useState<IssueStats | null>(null);
  const [actionStats, setActionStats] = useState<ActionStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api<Summary>("/api/analytics/summary"),
      api<InspectionStats>("/api/analytics/inspections"),
      api<IssueStats>("/api/analytics/issues"),
      api<ActionStats>("/api/analytics/actions"),
    ])
      .then(([s, insp, iss, act]) => {
        setSummary(s);
        setInspStats(insp);
        setIssueStats(iss);
        setActionStats(act);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "inspections", label: "Inspections" },
    { key: "issues", label: "Issues" },
    { key: "actions", label: "Actions" },
  ];

  return (
    <Layout user={user} title="Analytics" onLogout={onLogout}>
      {/* Tab bar */}
      <div className="mb-5 flex gap-1 rounded-xl bg-brand-100 p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${
              tab === t.key
                ? "bg-white text-brand-900 shadow-sm"
                : "text-brand-600 hover:text-brand-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <>
          {/* ── Overview ─────────────────────────────────────────────── */}
          {tab === "overview" && summary && (
            <div className="space-y-6">
              {/* KPI cards */}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <KpiCard
                  label="Inspection Completion"
                  value={`${(summary.inspection_completion_rate ?? 0).toFixed(0)}%`}
                  sub={`${summary.completed_inspections} / ${summary.total_inspections} completed`}
                  color="text-brand-700"
                />
                <KpiCard
                  label="Open Issues"
                  value={summary.open_issues}
                  sub={`of ${summary.total_issues} total`}
                  color={summary.open_issues > 10 ? "text-red-600" : "text-amber-600"}
                />
                <KpiCard
                  label="Overdue Actions"
                  value={summary.overdue_actions}
                  sub={`of ${summary.total_actions} total`}
                  color={summary.overdue_actions > 0 ? "text-red-600" : "text-brand-700"}
                />
                <KpiCard
                  label="Actions Completed"
                  value={summary.completed_actions}
                  sub={`of ${summary.total_actions} total`}
                  color="text-brand-700"
                />
              </div>

              {/* Summary bars */}
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-brand-100 bg-white p-5">
                  <p className="mb-3 text-sm font-bold text-brand-800">Inspections Overview</p>
                  <ProgressBar label="Completion Rate" value={summary.inspection_completion_rate ?? 0} color="bg-brand-600" />
                </div>
                <div className="rounded-xl border border-brand-100 bg-white p-5">
                  <p className="mb-3 text-sm font-bold text-brand-800">Actions Overview</p>
                  <ProgressBar
                    label="Actions Overdue"
                    value={summary.total_actions > 0 ? (summary.overdue_actions / summary.total_actions) * 100 : 0}
                    color="bg-red-400"
                  />
                  <div className="mt-3">
                    <ProgressBar
                      label="Actions Completed"
                      value={summary.total_actions > 0 ? (summary.completed_actions / summary.total_actions) * 100 : 0}
                      color="bg-brand-600"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Inspections ───────────────────────────────────────────── */}
          {tab === "inspections" && inspStats && (
            <div className="space-y-5">
              {/* Top stats */}
              <div className="grid grid-cols-3 gap-4">
                <KpiCard label="Total Inspections" value={inspStats.total} />
                <KpiCard
                  label="Average Score"
                  value={inspStats.average_score != null ? `${inspStats.average_score.toFixed(1)}%` : "—"}
                  color="text-brand-700"
                />
                <KpiCard
                  label="Flagged Rate"
                  value={`${(inspStats.flagged_rate ?? 0).toFixed(1)}%`}
                  color={(inspStats.flagged_rate ?? 0) > 20 ? "text-red-600" : "text-amber-600"}
                />
              </div>

              {/* By template chart */}
              <div className="rounded-xl border border-brand-100 bg-white p-5">
                <p className="mb-4 text-sm font-bold text-brand-800">Top Templates by Usage</p>
                <div className="space-y-3">
                  {(inspStats.by_template ?? []).slice(0, 5).map((t) => {
                    const max = Math.max(...(inspStats.by_template ?? []).map((x) => x.count), 1);
                    return (
                      <BarRow key={t.name} label={t.name} value={t.count} max={max} color="bg-brand-600" />
                    );
                  })}
                  {(!inspStats.by_template || inspStats.by_template.length === 0) && (
                    <p className="text-sm text-brand-400 italic">No template data available.</p>
                  )}
                </div>
              </div>

              {/* Progress bars */}
              <div className="rounded-xl border border-brand-100 bg-white p-5 space-y-4">
                <p className="text-sm font-bold text-brand-800">Rates</p>
                <ProgressBar label="Completion Rate" value={inspStats.total > 0 ? ((inspStats.by_status?.completed ?? 0) / inspStats.total * 100) : 0} color="bg-brand-600" />
                <ProgressBar label="Flagged Rate" value={inspStats.flagged_rate ?? 0} color="bg-red-400" />
              </div>

              {/* By status */}
              <div className="rounded-xl border border-brand-100 bg-white p-5">
                <p className="mb-4 text-sm font-bold text-brand-800">By Status</p>
                <div className="space-y-3">
                  {Object.entries(inspStats.by_status ?? {}).map(([status, count]) => {
                    const maxVal = Math.max(...Object.values(inspStats.by_status ?? {}), 1);
                    return (
                      <BarRow key={status} label={status.replace(/_/g, " ")} value={count as number} max={maxVal} color="bg-brand-600" />
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── Issues ────────────────────────────────────────────────── */}
          {tab === "issues" && issueStats && (
            <div className="space-y-5">
              <KpiCard label="Total Issues" value={issueStats.total} />

              {/* By priority */}
              <div className="rounded-xl border border-brand-100 bg-white p-5">
                <p className="mb-4 text-sm font-bold text-brand-800">Issues by Priority</p>
                <div className="space-y-3">
                  {[
                    { key: "critical", label: "Critical", color: "bg-red-500" },
                    { key: "high", label: "High", color: "bg-orange-400" },
                    { key: "medium", label: "Medium", color: "bg-amber-400" },
                    { key: "low", label: "Low", color: "bg-brand-600" },
                  ].map(({ key, label, color }) => {
                    const val = (issueStats.by_priority ?? {})[key] ?? 0;
                    const max = Math.max(...Object.values(issueStats.by_priority ?? {}), 1);
                    return <BarRow key={key} label={label} value={val} max={max} color={color} />;
                  })}
                </div>
              </div>

              {/* By type */}
              <div className="rounded-xl border border-brand-100 bg-white p-5">
                <p className="mb-4 text-sm font-bold text-brand-800">Issues by Type</p>
                <div className="space-y-3">
                  {Object.entries(issueStats.by_type ?? {}).map(([type, count]) => {
                    const max = Math.max(...Object.values(issueStats.by_type ?? {}), 1);
                    return (
                      <BarRow key={type} label={type.replace(/_/g, " ")} value={count as number} max={max} color="bg-brand-600" />
                    );
                  })}
                </div>
              </div>

              {/* Open vs Closed - two divs side by side proportionally */}
              <div className="rounded-xl border border-brand-100 bg-white p-5">
                <p className="mb-4 text-sm font-bold text-brand-800">Open vs Closed</p>
                {(() => {
                  const open = (issueStats.by_status ?? {})["open"] ?? 0;
                  const resolved = (issueStats.by_status ?? {})["resolved"] ?? 0;
                  const total = open + resolved || 1;
                  const openPct = Math.round((open / total) * 100);
                  const closedPct = 100 - openPct;
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 overflow-hidden rounded-xl">
                        <div
                          className="flex h-10 items-center justify-center rounded-lg bg-yellow-400 text-xs font-bold text-white transition-all"
                          style={{ width: `${openPct}%`, minWidth: openPct > 0 ? "3rem" : "0" }}
                        >
                          {openPct > 10 && `${openPct}%`}
                        </div>
                        <div
                          className="flex h-10 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-white transition-all"
                          style={{ width: `${closedPct}%`, minWidth: closedPct > 0 ? "3rem" : "0" }}
                        >
                          {closedPct > 10 && `${closedPct}%`}
                        </div>
                      </div>
                      <div className="flex gap-6 text-xs">
                        <span className="flex items-center gap-1.5 text-brand-600">
                          <span className="inline-block h-3 w-3 rounded-sm bg-yellow-400" />
                          Open ({open})
                        </span>
                        <span className="flex items-center gap-1.5 text-brand-600">
                          <span className="inline-block h-3 w-3 rounded-sm bg-brand-600" />
                          Resolved ({resolved})
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ── Actions ───────────────────────────────────────────────── */}
          {tab === "actions" && actionStats && (
            <div className="space-y-5">
              {/* Overdue highlight */}
              {actionStats.overdue > 0 && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {actionStats.overdue} overdue action{actionStats.overdue !== 1 ? "s" : ""} — immediate attention required
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                <KpiCard label="Total Actions" value={actionStats.total} />
                <KpiCard
                  label="Overdue"
                  value={actionStats.overdue}
                  color={actionStats.overdue > 0 ? "text-red-600" : "text-brand-700"}
                />
                <KpiCard
                  label="Completed"
                  value={(actionStats.by_status ?? {})["complete"] ?? 0}
                  color="text-brand-700"
                />
              </div>

              {/* By status */}
              <div className="rounded-xl border border-brand-100 bg-white p-5">
                <p className="mb-4 text-sm font-bold text-brand-800">Actions by Status</p>
                <div className="space-y-3">
                  {[
                    { key: "to_do", label: "To Do", color: "bg-gray-400" },
                    { key: "in_progress", label: "In Progress", color: "bg-blue-500" },
                    { key: "complete", label: "Complete", color: "bg-brand-600" },
                    { key: "cant_do", label: "Can't Do", color: "bg-red-400" },
                  ].map(({ key, label, color }) => {
                    const val = (actionStats.by_status ?? {})[key] ?? 0;
                    const max = Math.max(...Object.values(actionStats.by_status ?? {}), 1);
                    return <BarRow key={key} label={label} value={val} max={max} color={color} />;
                  })}
                </div>
              </div>

              {/* By priority */}
              <div className="rounded-xl border border-brand-100 bg-white p-5">
                <p className="mb-4 text-sm font-bold text-brand-800">Actions by Priority</p>
                <div className="space-y-3">
                  {[
                    { key: "high", label: "High", color: "bg-red-500" },
                    { key: "medium", label: "Medium", color: "bg-amber-400" },
                    { key: "low", label: "Low", color: "bg-brand-600" },
                  ].map(({ key, label, color }) => {
                    const val = (actionStats.by_priority ?? {})[key] ?? 0;
                    const max = Math.max(...Object.values(actionStats.by_priority ?? {}), 1);
                    return <BarRow key={key} label={label} value={val} max={max} color={color} />;
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
