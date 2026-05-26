import React from "react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { api, type DashboardSummary } from "../api";
import type { User } from "../types";

type Props = { user: User | null; onLogout: () => void };
type Tab = "overview" | "inspections" | "issues" | "actions";

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

const GLASS = "bg-white/[0.18] backdrop-blur-2xl border border-white/60 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.85),inset_0_-1px_0_rgba(255,255,255,0.1)]";
const BG_STYLE: React.CSSProperties = {
  backgroundImage: `url('${import.meta.env.BASE_URL}dashboard-bg.png')`,
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundAttachment: "fixed",
};

// ── Chart primitives ────────────────────────────────────────────────

function MiniBarChart({ data, color = "#499241" }: { data: number[]; color?: string }) {
  const max = Math.max(...data, 1);
  const W = 100, H = 48;
  const bw = Math.max(2, Math.floor(W / data.length) - 2);
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0">
      {data.map((v, i) => {
        const h = Math.max(3, (v / max) * (H - 2));
        return <rect key={i} x={i * (W / data.length) + 1} y={H - h} width={bw} height={h} rx={2} fill={color} opacity={0.35 + (i / (data.length - 1 || 1)) * 0.65} />;
      })}
    </svg>
  );
}

function MiniLineChart({ data, color = "#499241" }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1), min = Math.min(...data, 0), rng = max - min || 1;
  const W = 100, H = 48;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * W, H - ((v - min) / rng) * (H - 6) - 3] as [number, number]);
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const gid = `mlc${color.replace(/\W/g, "")}`;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <path d={`${line} L${W},${H} L0,${H} Z`} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DonutChart({ segments, size = 120 }: { segments: { value: number; color: string; label: string }[]; size?: number }) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const r = size * 0.34, cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r, sw = size * 0.14;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={sw} />
      {segments.filter(s => s.value > 0).map((seg, i) => {
        const len = (seg.value / total) * circ, rot = acc * 360 - 90;
        acc += seg.value / total;
        return <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth={sw} strokeDasharray={`${len.toFixed(2)} ${(circ - len).toFixed(2)}`} strokeDashoffset={0} transform={`rotate(${rot.toFixed(2)},${cx},${cy})`} />;
      })}
    </svg>
  );
}

// ── Reusable display helpers ────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/40 border-t-brand-600" />
    </div>
  );
}

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-36 shrink-0 truncate text-xs text-brand-600">{label}</span>
      <div className="flex-1 overflow-hidden rounded-full bg-white/20 h-2.5">
        <div className={`h-2.5 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right text-xs font-semibold text-brand-800">{value}</span>
    </div>
  );
}

function GlassBar({ label, current, total, color }: { label: string; current: number; total: number; color: string }) {
  const pct = total > 0 ? (current / total) * 100 : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="font-medium capitalize text-gray-700">{label}</span>
        <span className="font-bold text-brand-800">{current}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
        <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// ── Main combined page ──────────────────────────────────────────────

export default function DashboardPage({ user, onLogout }: Props) {
  const [tab, setTab]               = useState<Tab>("overview");
  const [dashSummary, setDash]      = useState<DashboardSummary | null>(null);
  const [inspStats, setInspStats]   = useState<InspectionStats | null>(null);
  const [issueStats, setIssueStats] = useState<IssueStats | null>(null);
  const [actionStats, setActStats]  = useState<ActionStats | null>(null);
  const [loading, setLoading]       = useState(true);
  const isSup = user?.role === "supervisor" || user?.role === "admin";

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api<DashboardSummary>("/api/dashboard/summary"),
      api<InspectionStats>("/api/analytics/inspections"),
      api<IssueStats>("/api/analytics/issues"),
      api<ActionStats>("/api/analytics/actions"),
    ])
      .then(([d, insp, iss, act]) => { setDash(d); setInspStats(insp); setIssueStats(iss); setActStats(act); })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  // ── Derived values ──────────────────────────────────────────────
  const inspTotal      = inspStats?.total ?? 0;
  const inspCompleted  = inspStats?.by_status?.["completed"] ?? 0;
  const inspInProgress = inspStats?.by_status?.["in_progress"] ?? 0;
  const inspAvgScore   = inspStats?.average_score ?? null;

  const totalIssues    = issueStats?.total ?? 0;
  const openIssues     = issueStats?.by_status?.["open"] ?? 0;
  const highPriority   = issueStats?.by_priority?.["high"] ?? 0;

  const totalActions   = actionStats?.total ?? 0;
  const overdueActions = actionStats?.overdue ?? 0;
  const doneActions    = actionStats?.by_status?.["complete"] ?? 0;
  const openActions    = (actionStats?.by_status?.["to_do"] ?? 0) + (actionStats?.by_status?.["in_progress"] ?? 0);

  const completionRate = inspTotal > 0 ? Math.round((inspCompleted / inspTotal) * 100) : 0;

  const quickActions = [
    { to: "/inspections", label: "Inspections",  icon: "📋", cls: "bg-brand-600/90 text-white hover:bg-brand-700/90 border-brand-500/50" },
    { to: "/issues",      label: "Report Issue",  icon: "⚠️",  cls: "bg-red-500/80  text-white hover:bg-red-600/80   border-red-400/50"   },
    { to: "/actions",     label: "Actions",        icon: "✓",   cls: "bg-white/30    text-brand-900 hover:bg-white/50 border-white/40"      },
    { to: "/scheduling",  label: "Scheduling",     icon: "📅",  cls: "bg-white/30    text-brand-900 hover:bg-white/50 border-white/40"      },
    { to: "/documents",   label: "Documents",      icon: "≡",   cls: "bg-white/30    text-brand-900 hover:bg-white/50 border-white/40"      },
    { to: "/sync",        label: "Offline Sync",   icon: "↻",   cls: "bg-white/30    text-brand-900 hover:bg-white/50 border-white/40"      },
    ...(isSup ? [
      { to: "/supervisor", label: "Approvals",    icon: "⊙",  cls: "bg-amber-500/80 text-white hover:bg-amber-600/80 border-amber-400/50" },
      { to: "/forms",      label: "Form Builder", icon: "⊞",  cls: "bg-white/30     text-brand-900 hover:bg-white/50 border-white/40"     },
    ] : []),
  ];

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview",    label: "Overview"    },
    { key: "inspections", label: "Inspections" },
    { key: "issues",      label: "Issues"      },
    { key: "actions",     label: "Actions"     },
  ];

  return (
    <Layout user={user} title="Dashboard" onLogout={onLogout}>
      <div className="min-h-full -mx-4 -my-4 px-4 py-4 sm:-mx-6 sm:-my-5 sm:px-6 sm:py-5" style={BG_STYLE}>

        {/* ── Welcome header ──────────────────────────────────── */}
        <div className="bg-gradient-to-r from-brand-700 to-brand-600 rounded-2xl p-4 mb-5 text-white flex items-center justify-between shadow-lg">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-200 mb-0.5">Welcome back</p>
            <h1 className="text-xl font-bold tracking-tight">{user?.full_name ?? "Dashboard"}</h1>
            <p className="text-sm text-brand-200 mt-0.5">Operations overview & analytics</p>
          </div>
          <div className="bg-white/20 rounded-full p-3">
            <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
        </div>

        {/* ── Tab bar ─────────────────────────────────────────── */}
        <div className="overflow-x-auto mb-5 -mx-1 px-1">
          <div className="bg-white/[0.18] backdrop-blur-2xl border border-white/60 rounded-2xl p-1.5 flex gap-1 w-fit shadow-[0_4px_20px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.85)]">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`rounded-xl px-3 py-1.5 sm:px-4 text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                  tab === t.key
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-brand-700 hover:bg-white/20"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? <Spinner /> : (
          <>
            {/* ════════════════════════════════════════════════
                OVERVIEW TAB
            ════════════════════════════════════════════════ */}
            {tab === "overview" && (
              <div className="space-y-4">

                {/* Row 1: 3 large KPI cards */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

                  {/* Inspections */}
                  <div className={`${GLASS} p-5`}>
                    <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide mb-3">Inspections</p>
                    <div className="flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-4xl font-bold text-brand-800">{inspTotal}</p>
                        <div className="mt-2 flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1.5 text-xs text-brand-600">
                            <span className="h-2 w-2 rounded-full bg-brand-500 shrink-0" />{inspCompleted} completed
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-xs text-brand-600">
                            <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />{inspInProgress} in progress
                          </span>
                          {inspAvgScore != null && (
                            <span className="inline-flex items-center gap-1.5 text-xs text-brand-600">
                              <span className="h-2 w-2 rounded-full bg-sky-400 shrink-0" />Avg score {inspAvgScore.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                      <MiniBarChart
                        data={Object.keys(inspStats?.by_status ?? {}).length > 0 ? Object.values(inspStats!.by_status) : [2,5,3,7,4,8,6]}
                        color="#499241"
                      />
                    </div>
                    <Link to="/inspections" className="mt-3 block text-xs font-semibold text-brand-700 hover:text-brand-900">View all →</Link>
                  </div>

                  {/* Issues */}
                  <div className={`${GLASS} p-5`}>
                    <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide mb-3">Open Issues</p>
                    <div className="flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-4xl font-bold text-brand-800">{openIssues}</p>
                        <div className="mt-2 flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1.5 text-xs text-brand-600">
                            <span className="h-2 w-2 rounded-full bg-orange-500 shrink-0" />{highPriority} high priority
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-xs text-brand-600">
                            <span className="h-2 w-2 rounded-full bg-gray-400 shrink-0" />{totalIssues} total
                          </span>
                        </div>
                      </div>
                      <MiniLineChart
                        data={[totalIssues, Math.round(totalIssues * 0.8), Math.round(totalIssues * 0.6), openIssues]}
                        color="#f59e0b"
                      />
                    </div>
                    <Link to="/issues" className="mt-3 block text-xs font-semibold text-brand-700 hover:text-brand-900">View all →</Link>
                  </div>

                  {/* Status Overview */}
                  <div className={`${GLASS} p-5`}>
                    <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide mb-4">Status Overview</p>
                    <div className="space-y-3">
                      {[
                        { label: "Insp. Completed",  current: inspCompleted,            total: inspTotal    },
                        { label: "Insp. In Progress", current: inspInProgress,           total: inspTotal    },
                        { label: "Issues Resolved",   current: totalIssues - openIssues, total: totalIssues  },
                        { label: "Actions Done",      current: doneActions,              total: totalActions },
                      ].map(({ label, current, total }) => {
                        const pct = total > 0 ? (current / total) * 100 : 0;
                        return (
                          <div key={label}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-gray-600 truncate">{label}</span>
                              <span className="text-xs font-semibold text-brand-700 shrink-0 ml-2">{current}/{total}</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-white/20">
                              <div className="h-2 rounded-full bg-brand-500 transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full bg-brand-100/70 px-2.5 py-1 text-xs font-semibold text-brand-700">{doneActions} done</span>
                      {overdueActions > 0 && (
                        <span className="rounded-full bg-red-100/70 px-2.5 py-1 text-xs font-semibold text-red-700">{overdueActions} overdue</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Row 2: 3 small metric cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className={`${GLASS} p-4 flex items-center justify-between gap-3`}>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide">Completion Rate</p>
                      <p className="mt-1 text-2xl font-bold text-brand-800">{completionRate}%</p>
                      <span className="inline-flex items-center rounded-full bg-brand-100/70 px-2 py-0.5 text-xs font-semibold text-brand-700 mt-1.5">
                        Inspections
                      </span>
                    </div>
                    <MiniLineChart data={[Math.round(inspTotal*0.3), Math.round(inspTotal*0.55), Math.round(inspTotal*0.72), inspCompleted]} color="#499241" />
                  </div>

                  <div className={`${GLASS} p-4 flex items-center justify-between gap-3`}>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide">Open Actions</p>
                      <p className="mt-1 text-2xl font-bold text-brand-800">{openActions}</p>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold mt-1.5 ${openActions > 5 ? "bg-blue-100/70 text-blue-700" : "bg-brand-100/70 text-brand-700"}`}>
                        of {totalActions} total
                      </span>
                    </div>
                    <MiniBarChart
                      data={[actionStats?.by_status?.["to_do"]??0, actionStats?.by_status?.["in_progress"]??0, doneActions]}
                      color="#3b82f6"
                    />
                  </div>

                  <div className={`${GLASS} p-4 flex items-center justify-between gap-3`}>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide">Overdue Actions</p>
                      <p className="mt-1 text-2xl font-bold text-brand-800">{overdueActions}</p>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold mt-1.5 ${overdueActions > 0 ? "bg-red-100/70 text-red-700" : "bg-brand-100/70 text-brand-700"}`}>
                        {overdueActions > 0 ? "Needs attention" : "On track"}
                      </span>
                    </div>
                    <MiniBarChart
                      data={[Math.round(totalActions*0.3), Math.round(totalActions*0.5), Math.round(totalActions*0.2), overdueActions]}
                      color={overdueActions > 0 ? "#ef4444" : "#499241"}
                    />
                  </div>
                </div>

                {/* Row 3: Quick Actions + Issue Priority donut */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <div className={`${GLASS} p-5 lg:col-span-2`}>
                    <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide mb-4">Quick Actions</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {quickActions.map(({ to, label, icon, cls }) => (
                        <Link key={to} to={to} className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all backdrop-blur-sm border ${cls}`}>
                          <span>{icon}</span>{label}
                        </Link>
                      ))}
                    </div>
                  </div>

                  <div className={`${GLASS} p-5`}>
                    <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide mb-4">Issue Priority</p>
                    <div className="flex flex-col items-center">
                      <DonutChart segments={[
                        { value: issueStats?.by_priority?.["critical"]??0, color:"#ef4444", label:"Critical" },
                        { value: issueStats?.by_priority?.["high"]    ??0, color:"#f97316", label:"High"     },
                        { value: issueStats?.by_priority?.["medium"]  ??0, color:"#f59e0b", label:"Medium"   },
                        { value: issueStats?.by_priority?.["low"]     ??0, color:"#499241", label:"Low"      },
                      ]} size={120} />
                      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 w-full">
                        {[
                          { label:"Critical", color:"#ef4444", key:"critical" },
                          { label:"High",     color:"#f97316", key:"high"     },
                          { label:"Medium",   color:"#f59e0b", key:"medium"   },
                          { label:"Low",      color:"#499241", key:"low"      },
                        ].map(({ label, color, key }) => (
                          <div key={key} className="flex items-center gap-1.5">
                            <span className="inline-block h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                            <span className="text-xs text-brand-600">{label}</span>
                            <span className="ml-auto text-xs font-semibold text-brand-800">{issueStats?.by_priority?.[key] ?? 0}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Row 4: Breakdown cards */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                  {/* Inspection Status */}
                  {inspStats && inspStats.total > 0 && (
                    <div className={`${GLASS} p-5`}>
                      <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide mb-4">Inspection Status</p>
                      <div className="space-y-3">
                        {Object.entries(inspStats.by_status).map(([status, count]) => {
                          const colors: Record<string,string> = { completed:"#499241", in_progress:"#f59e0b", approved:"#22c55e", pending_approval:"#3b82f6", draft:"#9ca3af" };
                          return <GlassBar key={status} label={status.replace(/_/g," ")} current={count} total={inspStats.total} color={colors[status] ?? "#9fd78a"} />;
                        })}
                      </div>
                    </div>
                  )}

                  {/* Actions Status */}
                  {actionStats && (
                    <div className={`${GLASS} p-5`}>
                      <div className="flex items-start justify-between mb-4">
                        <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide">Actions Status</p>
                        {overdueActions > 0 && <span className="rounded-full bg-red-100/70 px-2.5 py-1 text-xs font-semibold text-red-700">{overdueActions} overdue</span>}
                      </div>
                      <div className="space-y-3">
                        {[
                          { key:"to_do",       label:"To Do",       color:"#9ca3af" },
                          { key:"in_progress", label:"In Progress",  color:"#3b82f6" },
                          { key:"complete",    label:"Complete",     color:"#499241" },
                          { key:"cant_do",     label:"Can't Do",     color:"#ef4444" },
                        ].map(({ key, label, color }) => (
                          <GlassBar key={key} label={label} current={actionStats.by_status?.[key] ?? 0} total={totalActions} color={color} />
                        ))}
                      </div>
                      <Link to="/actions" className="mt-3 block text-xs font-semibold text-brand-700 hover:text-brand-900">View all →</Link>
                    </div>
                  )}

                  {/* Issues by Type */}
                  {issueStats && issueStats.total > 0 && (
                    <div className={`${GLASS} p-5`}>
                      <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide mb-4">Issues by Type</p>
                      <div className="space-y-3">
                        {Object.entries(issueStats.by_type).map(([type, count]) => {
                          const mx = Math.max(...Object.values(issueStats.by_type), 1);
                          return <GlassBar key={type} label={type.replace(/_/g," ")} current={count as number} total={mx} color="#499241" />;
                        })}
                      </div>
                    </div>
                  )}

                  {/* Legacy JSA */}
                  {dashSummary && dashSummary.kpi.total_jsa > 0 && (
                    <div className={`${GLASS} p-5`}>
                      <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide mb-4">Legacy JSA Records</p>
                      <div className="space-y-3">
                        {dashSummary.status_breakdown.map(item => {
                          const jsaColors: Record<string,string> = { draft:"#9fd78a", pending_approval:"#f59e0b", approved:"#22c55e" };
                          return <GlassBar key={item.status} label={item.status.replace(/_/g," ")} current={item.count} total={dashSummary.kpi.total_jsa} color={jsaColors[item.status] ?? "#9fd78a"} />;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════
                INSPECTIONS TAB
            ════════════════════════════════════════════════ */}
            {tab === "inspections" && inspStats && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { label:"Total Inspections", value: inspStats.total,                                              accent:"bg-brand-600" },
                    { label:"Average Score",      value: inspStats.average_score != null ? `${inspStats.average_score.toFixed(1)}%` : "—", accent:"bg-sky-500"   },
                    { label:"Flagged Rate",        value: `${(inspStats.flagged_rate??0).toFixed(1)}%`,               accent:(inspStats.flagged_rate??0)>20?"bg-red-500":"bg-amber-500" },
                  ].map(({ label, value, accent }) => (
                    <div key={label} className={`${GLASS} p-5`}>
                      <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${accent} mb-3`}>
                        <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <p className="text-2xl font-bold text-brand-800">{value}</p>
                      <p className="text-xs font-medium text-gray-500 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>

                <div className={`${GLASS} p-5`}>
                  <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide mb-4">Top Templates by Usage</p>
                  <div className="space-y-3">
                    {(inspStats.by_template ?? []).slice(0, 6).map(t => {
                      const mx = Math.max(...(inspStats.by_template??[]).map(x=>x.count), 1);
                      return <BarRow key={t.name} label={t.name} value={t.count} max={mx} color="bg-brand-500" />;
                    })}
                    {(!inspStats.by_template || inspStats.by_template.length === 0) && (
                      <p className="text-sm text-gray-400 italic">No template data available.</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className={`${GLASS} p-5 space-y-4`}>
                    <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide">Completion & Flagged Rates</p>
                    {[
                      { label:"Completion Rate", value: inspStats.total>0?((inspStats.by_status?.completed??0)/inspStats.total*100):0, color:"#499241" },
                      { label:"Flagged Rate",     value: inspStats.flagged_rate??0,                                                    color:"#ef4444" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">{label}</span>
                          <span className="font-semibold text-brand-800">{value.toFixed(1)}%</span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-white/20">
                          <div className="h-2.5 rounded-full transition-all" style={{ width: `${Math.min(value,100)}%`, backgroundColor: color }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className={`${GLASS} p-5`}>
                    <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide mb-4">By Status</p>
                    <div className="space-y-3">
                      {Object.entries(inspStats.by_status ?? {}).map(([status, count]) => {
                        const mx = Math.max(...Object.values(inspStats.by_status??{}), 1);
                        return <BarRow key={status} label={status.replace(/_/g," ")} value={count as number} max={mx} color="bg-brand-500" />;
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════
                ISSUES TAB
            ════════════════════════════════════════════════ */}
            {tab === "issues" && issueStats && (
              <div className="space-y-4">
                <div className={`${GLASS} p-5`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide">Total Issues</p>
                      <p className="mt-1 text-3xl font-bold text-brand-800">{issueStats.total}</p>
                    </div>
                    <MiniBarChart data={Object.values(issueStats.by_status??{}).map(v=>v as number)} color="#499241" />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className={`${GLASS} p-5`}>
                    <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide mb-4">By Priority</p>
                    <div className="space-y-3">
                      {[
                        { key:"critical", label:"Critical", color:"bg-red-500"    },
                        { key:"high",     label:"High",     color:"bg-orange-400" },
                        { key:"medium",   label:"Medium",   color:"bg-amber-400"  },
                        { key:"low",      label:"Low",      color:"bg-brand-500"  },
                      ].map(({ key, label, color }) => {
                        const val = issueStats.by_priority?.[key] ?? 0;
                        const mx  = Math.max(...Object.values(issueStats.by_priority??{}), 1);
                        return <BarRow key={key} label={label} value={val} max={mx} color={color} />;
                      })}
                    </div>
                  </div>

                  <div className={`${GLASS} p-5`}>
                    <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide mb-4">By Type</p>
                    <div className="space-y-3">
                      {Object.entries(issueStats.by_type ?? {}).map(([type, count]) => {
                        const mx = Math.max(...Object.values(issueStats.by_type??{}), 1);
                        return <BarRow key={type} label={type.replace(/_/g," ")} value={count as number} max={mx} color="bg-brand-500" />;
                      })}
                    </div>
                  </div>
                </div>

                <div className={`${GLASS} p-5`}>
                  <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide mb-4">Open vs Resolved</p>
                  {(() => {
                    const open     = issueStats.by_status?.["open"]     ?? 0;
                    const resolved = issueStats.by_status?.["resolved"] ?? 0;
                    const total    = open + resolved || 1;
                    const openPct  = Math.round((open / total) * 100);
                    const resPct   = 100 - openPct;
                    return (
                      <div className="space-y-3">
                        <div className="flex rounded-xl h-10 overflow-hidden w-full">
                          <div className="flex items-center justify-center bg-amber-400 text-xs font-bold text-white transition-all" style={{ width:`${openPct}%`, minWidth: openPct>0?"3rem":"0" }}>
                            {openPct > 10 && `${openPct}%`}
                          </div>
                          <div className="flex items-center justify-center bg-brand-500 text-xs font-bold text-white transition-all" style={{ width:`${resPct}%`, minWidth: resPct>0?"3rem":"0" }}>
                            {resPct > 10 && `${resPct}%`}
                          </div>
                        </div>
                        <div className="flex gap-6 text-xs">
                          <span className="flex items-center gap-1.5 text-gray-600"><span className="inline-block h-3 w-3 rounded-sm bg-amber-400" />Open ({open})</span>
                          <span className="flex items-center gap-1.5 text-gray-600"><span className="inline-block h-3 w-3 rounded-sm bg-brand-500" />Resolved ({resolved})</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════
                ACTIONS TAB
            ════════════════════════════════════════════════ */}
            {tab === "actions" && actionStats && (
              <div className="space-y-4">
                {actionStats.overdue > 0 && (
                  <div className="flex items-center gap-2 rounded-xl border border-red-200/60 bg-red-50/60 backdrop-blur-sm px-4 py-3 text-sm font-semibold text-red-700">
                    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {actionStats.overdue} overdue action{actionStats.overdue !== 1 ? "s" : ""} — immediate attention required
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { label:"Total Actions", value: actionStats.total,   accent:"border-brand-400" },
                    { label:"Overdue",        value: actionStats.overdue, accent: actionStats.overdue>0?"border-red-400":"border-brand-400" },
                    { label:"Completed",      value: actionStats.by_status?.["complete"]??0, accent:"border-brand-300" },
                  ].map(({ label, value, accent }) => (
                    <div key={label} className={`${GLASS} p-5 border-l-4 ${accent}`}>
                      <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide">{label}</p>
                      <p className="mt-1 text-3xl font-bold text-brand-800">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className={`${GLASS} p-5`}>
                    <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide mb-4">By Status</p>
                    <div className="space-y-3">
                      {[
                        { key:"to_do",       label:"To Do",       color:"bg-gray-400"   },
                        { key:"in_progress", label:"In Progress",  color:"bg-blue-400"   },
                        { key:"complete",    label:"Complete",     color:"bg-brand-500"  },
                        { key:"cant_do",     label:"Can't Do",     color:"bg-red-400"    },
                      ].map(({ key, label, color }) => {
                        const val = actionStats.by_status?.[key] ?? 0;
                        const mx  = Math.max(...Object.values(actionStats.by_status??{}), 1);
                        return <BarRow key={key} label={label} value={val} max={mx} color={color} />;
                      })}
                    </div>
                  </div>

                  <div className={`${GLASS} p-5`}>
                    <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide mb-4">By Priority</p>
                    <div className="space-y-3">
                      {[
                        { key:"high",   label:"High",   color:"bg-red-400"   },
                        { key:"medium", label:"Medium", color:"bg-amber-400" },
                        { key:"low",    label:"Low",    color:"bg-brand-500" },
                      ].map(({ key, label, color }) => {
                        const val = actionStats.by_priority?.[key] ?? 0;
                        const mx  = Math.max(...Object.values(actionStats.by_priority??{}), 1);
                        return <BarRow key={key} label={label} value={val} max={mx} color={color} />;
                      })}
                    </div>
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
