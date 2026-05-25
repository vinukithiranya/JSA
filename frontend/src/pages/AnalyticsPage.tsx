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
      <div className="flex-1 overflow-hidden rounded-full bg-brand-100 h-3">
        <div
          className={`h-3 rounded-full transition-all ${color}`}
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

function KpiCard({ label, value, sub, gradient }: { label: string; value: string | number; sub?: string; gradient?: string }) {
  return (
    <div className={`rounded-2xl p-4 shadow-lg ${gradient ?? "bg-white/70 backdrop-blur-sm border border-white/50"}`}>
      <p className="text-xs font-medium text-white/80">{label}</p>
      <p className="mt-1 text-3xl font-bold text-white">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-white/70">{sub}</p>}
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
      <div className="min-h-full bg-gradient-to-br from-brand-50 via-emerald-50 to-teal-50 -m-6 p-6">

        {/* ── Page header strip ─────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-brand-700 to-brand-600 rounded-2xl p-4 mb-5 text-white flex items-center justify-between shadow-lg">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-200 mb-0.5">Platform</p>
            <h1 className="text-xl font-bold tracking-tight">Analytics & Insights</h1>
            <p className="text-sm text-brand-200 mt-0.5">Platform performance overview</p>
          </div>
          <div className="bg-white/20 rounded-full p-3">
            <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </div>
        </div>

        {/* ── Tab bar ──────────────────────────────────────────────── */}
        <div className="bg-white/60 backdrop-blur-sm border border-white/50 rounded-2xl p-1.5 flex gap-1 w-fit mb-5">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-xl px-4 py-1.5 text-sm font-semibold transition-all duration-200 ${
                tab === t.key
                  ? "bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-md"
                  : "text-brand-600 hover:bg-white/60"
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
            {/* ── Overview ──────────────────────────────────────────── */}
            {tab === "overview" && summary && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  <KpiCard
                    label="Inspection Completion"
                    value={`${(summary.inspection_completion_rate ?? 0).toFixed(0)}%`}
                    sub={`${summary.completed_inspections} / ${summary.total_inspections} completed`}
                    gradient="bg-gradient-to-br from-brand-600 to-brand-700"
                  />
                  <KpiCard
                    label="Open Issues"
                    value={summary.open_issues}
                    sub={`of ${summary.total_issues} total`}
                    gradient={summary.open_issues > 10 ? "bg-gradient-to-br from-red-400 to-rose-600" : "bg-gradient-to-br from-amber-400 to-orange-500"}
                  />
                  <KpiCard
                    label="Overdue Actions"
                    value={summary.overdue_actions}
                    sub={`of ${summary.total_actions} total`}
                    gradient={summary.overdue_actions > 0 ? "bg-gradient-to-br from-red-500 to-red-700" : "bg-gradient-to-br from-brand-500 to-brand-700"}
                  />
                  <KpiCard
                    label="Actions Completed"
                    value={summary.completed_actions}
                    sub={`of ${summary.total_actions} total`}
                    gradient="bg-gradient-to-br from-emerald-400 to-brand-600"
                  />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="bg-white/70 backdrop-blur-sm border border-white/50 shadow-lg rounded-2xl p-5 hover:shadow-xl transition-all duration-200">
                    <p className="text-xs font-bold uppercase tracking-widest text-brand-500 mb-4">Inspections Overview</p>
                    <ProgressBar
                      label="Completion Rate"
                      value={summary.inspection_completion_rate ?? 0}
                      color="bg-gradient-to-r from-brand-500 to-brand-700"
                    />
                  </div>
                  <div className="bg-white/70 backdrop-blur-sm border border-white/50 shadow-lg rounded-2xl p-5 hover:shadow-xl transition-all duration-200">
                    <p className="text-xs font-bold uppercase tracking-widest text-brand-500 mb-4">Actions Overview</p>
                    <ProgressBar
                      label="Actions Overdue"
                      value={summary.total_actions > 0 ? (summary.overdue_actions / summary.total_actions) * 100 : 0}
                      color="bg-gradient-to-r from-red-400 to-rose-500"
                    />
                    <div className="mt-3">
                      <ProgressBar
                        label="Actions Completed"
                        value={summary.total_actions > 0 ? (summary.completed_actions / summary.total_actions) * 100 : 0}
                        color="bg-gradient-to-r from-brand-500 to-brand-700"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Inspections ───────────────────────────────────────── */}
            {tab === "inspections" && inspStats && (
              <div className="space-y-5">
                <div className="grid grid-cols-3 gap-4">
                  <KpiCard
                    label="Total Inspections"
                    value={inspStats.total}
                    gradient="bg-gradient-to-br from-brand-600 to-brand-700"
                  />
                  <KpiCard
                    label="Average Score"
                    value={inspStats.average_score != null ? `${inspStats.average_score.toFixed(1)}%` : "—"}
                    gradient="bg-gradient-to-br from-sky-400 to-blue-500"
                  />
                  <KpiCard
                    label="Flagged Rate"
                    value={`${(inspStats.flagged_rate ?? 0).toFixed(1)}%`}
                    gradient={(inspStats.flagged_rate ?? 0) > 20 ? "bg-gradient-to-br from-red-400 to-rose-600" : "bg-gradient-to-br from-amber-400 to-orange-500"}
                  />
                </div>

                <div className="bg-white/70 backdrop-blur-sm border border-white/50 shadow-lg rounded-2xl p-5 hover:shadow-xl transition-all duration-200">
                  <p className="text-xs font-bold uppercase tracking-widest text-brand-500 mb-4">Top Templates by Usage</p>
                  <div className="space-y-3">
                    {(inspStats.by_template ?? []).slice(0, 5).map((t) => {
                      const max = Math.max(...(inspStats.by_template ?? []).map((x) => x.count), 1);
                      return (
                        <BarRow key={t.name} label={t.name} value={t.count} max={max} color="bg-gradient-to-r from-brand-400 to-brand-600" />
                      );
                    })}
                    {(!inspStats.by_template || inspStats.by_template.length === 0) && (
                      <p className="text-sm text-brand-400 italic">No template data available.</p>
                    )}
                  </div>
                </div>

                <div className="bg-white/70 backdrop-blur-sm border border-white/50 shadow-lg rounded-2xl p-5 hover:shadow-xl transition-all duration-200 space-y-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-brand-500">Score & Completion Rates</p>
                  <ProgressBar
                    label="Completion Rate"
                    value={inspStats.total > 0 ? ((inspStats.by_status?.completed ?? 0) / inspStats.total * 100) : 0}
                    color="bg-gradient-to-r from-brand-500 to-brand-700"
                  />
                  <ProgressBar
                    label="Flagged Rate"
                    value={inspStats.flagged_rate ?? 0}
                    color="bg-gradient-to-r from-red-400 to-rose-500"
                  />
                </div>

                <div className="bg-white/70 backdrop-blur-sm border border-white/50 shadow-lg rounded-2xl p-5 hover:shadow-xl transition-all duration-200">
                  <p className="text-xs font-bold uppercase tracking-widest text-brand-500 mb-4">By Status</p>
                  <div className="space-y-3">
                    {Object.entries(inspStats.by_status ?? {}).map(([status, count]) => {
                      const maxVal = Math.max(...Object.values(inspStats.by_status ?? {}), 1);
                      return (
                        <BarRow key={status} label={status.replace(/_/g, " ")} value={count as number} max={maxVal} color="bg-gradient-to-r from-brand-400 to-brand-600" />
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── Issues ────────────────────────────────────────────── */}
            {tab === "issues" && issueStats && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-4">
                  <KpiCard
                    label="Total Issues"
                    value={issueStats.total}
                    gradient="bg-gradient-to-br from-brand-600 to-brand-700"
                  />
                </div>

                <div className="bg-white/70 backdrop-blur-sm border border-white/50 shadow-lg rounded-2xl p-5 hover:shadow-xl transition-all duration-200">
                  <p className="text-xs font-bold uppercase tracking-widest text-brand-500 mb-4">By Priority</p>
                  <div className="space-y-3">
                    {[
                      { key: "critical", label: "Critical", color: "bg-gradient-to-r from-red-500 to-red-700" },
                      { key: "high", label: "High", color: "bg-gradient-to-r from-orange-400 to-red-500" },
                      { key: "medium", label: "Medium", color: "bg-gradient-to-r from-amber-400 to-orange-400" },
                      { key: "low", label: "Low", color: "bg-gradient-to-r from-brand-400 to-brand-600" },
                    ].map(({ key, label, color }) => {
                      const val = (issueStats.by_priority ?? {})[key] ?? 0;
                      const max = Math.max(...Object.values(issueStats.by_priority ?? {}), 1);
                      return <BarRow key={key} label={label} value={val} max={max} color={color} />;
                    })}
                  </div>
                </div>

                <div className="bg-white/70 backdrop-blur-sm border border-white/50 shadow-lg rounded-2xl p-5 hover:shadow-xl transition-all duration-200">
                  <p className="text-xs font-bold uppercase tracking-widest text-brand-500 mb-4">By Type</p>
                  <div className="space-y-3">
                    {Object.entries(issueStats.by_type ?? {}).map(([type, count]) => {
                      const max = Math.max(...Object.values(issueStats.by_type ?? {}), 1);
                      return (
                        <BarRow key={type} label={type.replace(/_/g, " ")} value={count as number} max={max} color="bg-gradient-to-r from-brand-400 to-brand-600" />
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white/70 backdrop-blur-sm border border-white/50 shadow-lg rounded-2xl p-5 hover:shadow-xl transition-all duration-200">
                  <p className="text-xs font-bold uppercase tracking-widest text-brand-500 mb-4">Open vs Resolved</p>
                  {(() => {
                    const open = (issueStats.by_status ?? {})["open"] ?? 0;
                    const resolved = (issueStats.by_status ?? {})["resolved"] ?? 0;
                    const total = open + resolved || 1;
                    const openPct = Math.round((open / total) * 100);
                    const closedPct = 100 - openPct;
                    return (
                      <div className="space-y-3">
                        <div className="flex rounded-xl h-12 overflow-hidden w-full">
                          <div
                            className="flex items-center justify-center bg-gradient-to-r from-amber-400 to-orange-400 text-xs font-bold text-white transition-all"
                            style={{ width: `${openPct}%`, minWidth: openPct > 0 ? "3rem" : "0" }}
                          >
                            {openPct > 10 && `${openPct}%`}
                          </div>
                          <div
                            className="flex items-center justify-center bg-gradient-to-r from-brand-500 to-brand-700 text-xs font-bold text-white transition-all"
                            style={{ width: `${closedPct}%`, minWidth: closedPct > 0 ? "3rem" : "0" }}
                          >
                            {closedPct > 10 && `${closedPct}%`}
                          </div>
                        </div>
                        <div className="flex gap-6 text-xs">
                          <span className="flex items-center gap-1.5 text-brand-600">
                            <span className="inline-block h-3 w-3 rounded-sm bg-amber-400" />
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

            {/* ── Actions ───────────────────────────────────────────── */}
            {tab === "actions" && actionStats && (
              <div className="space-y-5">
                {actionStats.overdue > 0 && (
                  <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {actionStats.overdue} overdue action{actionStats.overdue !== 1 ? "s" : ""} — immediate attention required
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                  <KpiCard
                    label="Total Actions"
                    value={actionStats.total}
                    gradient="bg-gradient-to-br from-brand-600 to-brand-700"
                  />
                  <KpiCard
                    label="Overdue"
                    value={actionStats.overdue}
                    gradient={actionStats.overdue > 0 ? "bg-gradient-to-br from-red-500 to-red-700" : "bg-gradient-to-br from-brand-500 to-brand-700"}
                  />
                  <KpiCard
                    label="Completed"
                    value={(actionStats.by_status ?? {})["complete"] ?? 0}
                    gradient="bg-gradient-to-br from-emerald-400 to-brand-600"
                  />
                </div>

                <div className="bg-white/70 backdrop-blur-sm border border-white/50 shadow-lg rounded-2xl p-5 hover:shadow-xl transition-all duration-200">
                  <p className="text-xs font-bold uppercase tracking-widest text-brand-500 mb-4">By Status</p>
                  <div className="space-y-3">
                    {[
                      { key: "to_do", label: "To Do", color: "bg-gradient-to-r from-slate-400 to-gray-500" },
                      { key: "in_progress", label: "In Progress", color: "bg-gradient-to-r from-blue-400 to-indigo-500" },
                      { key: "complete", label: "Complete", color: "bg-gradient-to-r from-brand-400 to-brand-600" },
                      { key: "cant_do", label: "Can't Do", color: "bg-gradient-to-r from-red-400 to-rose-500" },
                    ].map(({ key, label, color }) => {
                      const val = (actionStats.by_status ?? {})[key] ?? 0;
                      const max = Math.max(...Object.values(actionStats.by_status ?? {}), 1);
                      return <BarRow key={key} label={label} value={val} max={max} color={color} />;
                    })}
                  </div>
                </div>

                <div className="bg-white/70 backdrop-blur-sm border border-white/50 shadow-lg rounded-2xl p-5 hover:shadow-xl transition-all duration-200">
                  <p className="text-xs font-bold uppercase tracking-widest text-brand-500 mb-4">By Priority</p>
                  <div className="space-y-3">
                    {[
                      { key: "high", label: "High", color: "bg-gradient-to-r from-red-400 to-rose-500" },
                      { key: "medium", label: "Medium", color: "bg-gradient-to-r from-amber-400 to-orange-400" },
                      { key: "low", label: "Low", color: "bg-gradient-to-r from-brand-400 to-brand-600" },
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
      </div>
    </Layout>
  );
}
