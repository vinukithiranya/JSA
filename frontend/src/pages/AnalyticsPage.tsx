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

// ── Chart primitives ────────────────────────────────────────────────

/** Renders a small SVG bar chart from an array of numeric values. */
function MiniBarChart({ data, color = "#499241" }: { data: number[]; color?: string }) {
  const max = Math.max(...data, 1);
  const W = 110;
  const H = 52;
  const barW = Math.max(2, Math.floor(W / data.length) - 2);
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0">
      {data.map((val, i) => {
        const h = Math.max(3, (val / max) * (H - 2));
        const x = i * (W / data.length) + 1;
        const opacity = 0.35 + (i / (data.length - 1 || 1)) * 0.65;
        return (
          <rect key={i} x={x} y={H - h} width={barW} height={h} rx={2} fill={color} opacity={opacity} />
        );
      })}
    </svg>
  );
}

/** Renders a small SVG line chart with a gradient fill from an array of numeric values. */
function MiniLineChart({ data, color = "#499241" }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const W = 110;
  const H = 52;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * W,
    H - ((v - min) / range) * (H - 6) - 3,
  ] as [number, number]);
  const linePath = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${W},${H} L0,${H} Z`;
  const gid = `lg${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gid})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Renders an SVG donut chart from an array of labeled, colored segments. */
function DonutChart({ segments, size = 130 }: {
  segments: { value: number; color: string; label: string }[];
  size?: number;
}) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const r = size * 0.34;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const sw = size * 0.14;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth={sw} />
      {segments.filter(s => s.value > 0).map((seg, i) => {
        const len = (seg.value / total) * circ;
        const rot = acc * 360 - 90;
        acc += seg.value / total;
        return (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={sw}
            strokeDasharray={`${len.toFixed(2)} ${(circ - len).toFixed(2)}`}
            strokeDashoffset={0}
            transform={`rotate(${rot.toFixed(2)}, ${cx}, ${cy})`}
          />
        );
      })}
    </svg>
  );
}

// ── Reusable sub-components ─────────────────────────────────────────

/** Renders a centered loading spinner animation. */
function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
    </div>
  );
}

/** Renders a labeled horizontal bar row scaled relative to a maximum value. */
function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-36 shrink-0 truncate text-xs text-brand-600">{label}</span>
      <div className="flex-1 overflow-hidden rounded-full bg-brand-100 h-2.5">
        <div className={`h-2.5 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right text-xs font-semibold text-brand-700">{value}</span>
    </div>
  );
}

/** Renders a labeled progress bar showing a percentage value. */
function ProgressBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-brand-600">{label}</span>
        <span className="font-semibold text-brand-800">{value.toFixed(1)}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-brand-100">
        <div className={`h-2.5 rounded-full ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  );
}

// ── Up/down trend badge ─────────────────────────────────────────────

/** Renders a colored badge indicating an upward or downward trend with a label. */
function TrendBadge({ up, label }: { up: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${up ? "bg-brand-100 text-brand-700" : "bg-red-100 text-red-700"}`}>
      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
        {up ? (
          <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
        ) : (
          <path fillRule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1V9a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586 3.707 5.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z" clipRule="evenodd" />
        )}
      </svg>
      {label}
    </span>
  );
}

// ── Main page ───────────────────────────────────────────────────────

/** Renders the Analytics page with tabbed views for overview, inspections, issues, and actions statistics. */
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
      <div className="min-h-full -m-6 p-6" style={{ background: "linear-gradient(135deg, #c8e6c9 0%,  #e0f2f1 50%)" }}>

        {/* ── Page header ──────────────────────────────────────── */}
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

        {/* ── Tab bar ──────────────────────────────────────────── */}
        <div className="bg-white/[0.22] backdrop-blur-3xl border border-white/50 rounded-2xl p-1.5 flex gap-1 w-fit mb-5 shadow-[0_4px_20px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.85)]">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-xl px-4 py-1.5 text-sm font-semibold transition-all duration-200 ${
                tab === t.key
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-brand-600 hover:bg-brand-50"
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
            {/* ════════════════════════════════════════════════════
                Overview tab — Nexus-style dashboard layout
            ════════════════════════════════════════════════════ */}
            {tab === "overview" && summary && (
              <div className="space-y-4">

                {/* ── Row 1: 2 large KPI cards + 1 status card ── */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

                  {/* Inspections KPI (like "Projects") */}
                  <div className="bg-white/[0.22] backdrop-blur-2xl border border-white/50 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.85)]">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Inspections</p>
                    <div className="flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-4xl font-bold text-brand-800">
                          {(summary.inspection_completion_rate ?? 0).toFixed(0)}%
                        </p>
                        <div className="mt-2">
                          <TrendBadge
                            up={summary.inspection_completion_rate >= 50}
                            label={`${summary.completed_inspections} / ${summary.total_inspections} done`}
                          />
                        </div>
                      </div>
                      <MiniBarChart
                        data={
                          inspStats && Object.keys(inspStats.by_status ?? {}).length > 0
                            ? Object.values(inspStats.by_status).map(v => v as number)
                            : [2, 5, 3, 7, 4, 8, 6, 9]
                        }
                        color="#499241"
                      />
                    </div>
                  </div>

                  {/* Issues KPI (like "Income") */}
                  <div className="bg-white/[0.22] backdrop-blur-2xl border border-white/50 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.85)]">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Open Issues</p>
                    <div className="flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-4xl font-bold text-brand-800">{summary.open_issues}</p>
                        <div className="mt-2">
                          {summary.open_issues === 0 ? (
                            <TrendBadge up label="All resolved" />
                          ) : (
                            <TrendBadge up={false} label={`of ${summary.total_issues} total`} />
                          )}
                        </div>
                      </div>
                      <MiniLineChart
                        data={
                          issueStats && Object.keys(issueStats.by_status ?? {}).length > 0
                            ? Object.values(issueStats.by_status).map(v => v as number)
                            : [8, 6, 9, 4, 7, 5, summary.open_issues]
                        }
                        color="#f59e0b"
                      />
                    </div>
                  </div>

                  {/* Status Breakdown (like "Project Status") */}
                  <div className="bg-white/[0.22] backdrop-blur-2xl border border-white/50 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.85)]">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Status Overview</p>
                    <div className="space-y-3">
                      {[
                        { label: "Inspections", current: summary.completed_inspections, total: summary.total_inspections },
                        { label: "Issues Resolved", current: summary.total_issues - summary.open_issues, total: summary.total_issues },
                        { label: "Actions Done", current: summary.completed_actions, total: summary.total_actions },
                        { label: "Actions Overdue", current: summary.overdue_actions, total: summary.total_actions },
                      ].map(({ label, current, total }) => {
                        const pct = total > 0 ? (current / total) * 100 : 0;
                        return (
                          <div key={label}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-gray-600 truncate">{label}</span>
                              <span className="text-xs font-semibold text-brand-700 shrink-0 ml-2">{current} / {total}</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-brand-50">
                              <div
                                className="h-2 rounded-full bg-brand-500 transition-all"
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-700">
                        +{summary.completed_actions} completed
                      </span>
                      {summary.overdue_actions > 0 && (
                        <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                          {summary.overdue_actions} overdue
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Row 2: 3 small metric cards ─────────────── */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

                  {/* Total Inspections */}
                  <div className="bg-white/[0.22] backdrop-blur-2xl border border-white/50 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-[0_8px_32px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.85)]">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Inspections</p>
                      <p className="mt-1 text-2xl font-bold text-brand-800">{summary.total_inspections}</p>
                      <TrendBadge up label={`${(summary.inspection_completion_rate ?? 0).toFixed(1)}%`} />
                    </div>
                    <MiniLineChart
                      data={[
                        Math.round(summary.total_inspections * 0.3),
                        Math.round(summary.total_inspections * 0.55),
                        Math.round(summary.total_inspections * 0.72),
                        summary.completed_inspections,
                      ]}
                      color="#499241"
                    />
                  </div>

                  {/* Open Issues */}
                  <div className="bg-white/[0.22] backdrop-blur-2xl border border-white/50 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-[0_8px_32px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.85)]">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Open Issues</p>
                      <p className="mt-1 text-2xl font-bold text-brand-800">{summary.open_issues}</p>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${summary.open_issues > 5 ? "bg-amber-100 text-amber-700" : "bg-brand-100 text-brand-700"}`}>
                        of {summary.total_issues}
                      </span>
                    </div>
                    <MiniLineChart
                      data={[
                        summary.total_issues,
                        Math.round(summary.total_issues * 0.8),
                        Math.round(summary.total_issues * 0.6),
                        summary.open_issues,
                      ]}
                      color={summary.open_issues > 5 ? "#f59e0b" : "#499241"}
                    />
                  </div>

                  {/* Overdue Actions */}
                  <div className="bg-white/[0.22] backdrop-blur-2xl border border-white/50 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-[0_8px_32px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.85)]">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Overdue Actions</p>
                      <p className="mt-1 text-2xl font-bold text-brand-800">{summary.overdue_actions}</p>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${summary.overdue_actions > 0 ? "bg-red-100 text-red-700" : "bg-brand-100 text-brand-700"}`}>
                        {summary.overdue_actions > 0 ? "Needs attention" : "On track"}
                      </span>
                    </div>
                    <MiniBarChart
                      data={[
                        Math.round(summary.total_actions * 0.3),
                        Math.round(summary.total_actions * 0.5),
                        Math.round(summary.total_actions * 0.2),
                        summary.overdue_actions,
                      ]}
                      color={summary.overdue_actions > 0 ? "#ef4444" : "#499241"}
                    />
                  </div>
                </div>

                {/* ── Row 3: Analytics grouped bars + Donut ───── */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

                  {/* Analytics grouped bar chart */}
                  <div className="bg-white/[0.22] backdrop-blur-2xl border border-white/50 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.85)] lg:col-span-2">
                    <div className="flex items-center justify-between mb-5">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Analytics</p>
                      <div className="flex items-center gap-3">
                        {[
                          { label: "Total", color: "#499241" },
                          { label: "Completed", color: "#9fd78a" },
                          { label: "Pending / Open", color: "#f87171" },
                        ].map(({ label, color }) => (
                          <span key={label} className="flex items-center gap-1 text-xs text-gray-500">
                            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>
                    {(() => {
                      const groups = [
                        {
                          label: "Inspections",
                          bars: [
                            { value: summary.total_inspections, color: "#499241" },
                            { value: summary.completed_inspections, color: "#9fd78a" },
                            { value: summary.total_inspections - summary.completed_inspections, color: "#f87171" },
                          ],
                        },
                        {
                          label: "Issues",
                          bars: [
                            { value: summary.total_issues, color: "#499241" },
                            { value: summary.total_issues - summary.open_issues, color: "#9fd78a" },
                            { value: summary.open_issues, color: "#fbbf24" },
                          ],
                        },
                        {
                          label: "Actions",
                          bars: [
                            { value: summary.total_actions, color: "#499241" },
                            { value: summary.completed_actions, color: "#9fd78a" },
                            { value: summary.overdue_actions, color: "#f87171" },
                          ],
                        },
                      ];
                      const globalMax = Math.max(...groups.flatMap(g => g.bars.map(b => b.value)), 1);
                      return (
                        <div className="flex items-end h-32 gap-6 px-2 pb-1">
                          {groups.map((group) => (
                            <div key={group.label} className="flex flex-col items-center flex-1 min-w-0 h-full">
                              <div className="flex items-end gap-1 w-full justify-center" style={{ height: "calc(100% - 20px)" }}>
                                {group.bars.map((bar, bi) => {
                                  const heightPct = (bar.value / globalMax) * 100;
                                  return (
                                    <div
                                      key={bi}
                                      className="flex-1 rounded-t-md transition-all min-w-0"
                                      style={{ height: `${Math.max(3, heightPct)}%`, backgroundColor: bar.color, maxWidth: "20px" }}
                                      title={String(bar.value)}
                                    />
                                  );
                                })}
                              </div>
                              <span className="text-[10px] text-gray-400 mt-1.5 text-center">{group.label}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Issue Priority donut (like "Leads") */}
                  <div className="bg-white/[0.22] backdrop-blur-2xl border border-white/50 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.85)]">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Issue Priority</p>
                    <div className="flex flex-col items-center">
                      <DonutChart
                        segments={[
                          { value: (issueStats?.by_priority ?? {})["critical"] ?? 0, color: "#ef4444", label: "Critical" },
                          { value: (issueStats?.by_priority ?? {})["high"] ?? 0, color: "#f97316", label: "High" },
                          { value: (issueStats?.by_priority ?? {})["medium"] ?? 0, color: "#f59e0b", label: "Medium" },
                          { value: (issueStats?.by_priority ?? {})["low"] ?? 0, color: "#499241", label: "Low" },
                        ]}
                        size={130}
                      />
                      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 w-full">
                        {[
                          { label: "Critical", color: "#ef4444", key: "critical" },
                          { label: "High", color: "#f97316", key: "high" },
                          { label: "Medium", color: "#f59e0b", key: "medium" },
                          { label: "Low", color: "#499241", key: "low" },
                        ].map(({ label, color, key }) => (
                          <div key={key} className="flex items-center gap-1.5">
                            <span className="inline-block h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                            <span className="text-xs text-gray-500">{label}</span>
                            <span className="ml-auto text-xs font-semibold text-brand-800">
                              {(issueStats?.by_priority ?? {})[key] ?? 0}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════
                Inspections tab
            ════════════════════════════════════════════════════ */}
            {tab === "inspections" && inspStats && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Total Inspections", value: inspStats.total, color: "bg-brand-600" },
                    { label: "Average Score", value: inspStats.average_score != null ? `${inspStats.average_score.toFixed(1)}%` : "—", color: "bg-sky-500" },
                    { label: "Flagged Rate", value: `${(inspStats.flagged_rate ?? 0).toFixed(1)}%`, color: (inspStats.flagged_rate ?? 0) > 20 ? "bg-red-500" : "bg-amber-500" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-white/[0.22] backdrop-blur-2xl border border-white/50 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.85)]">
                      <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${color} mb-3`}>
                        <svg className="h-4.5 w-4.5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <p className="text-2xl font-bold text-brand-800">{value}</p>
                      <p className="text-xs font-medium text-gray-400 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-white/[0.22] backdrop-blur-2xl border border-white/50 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.85)]">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Top Templates by Usage</p>
                  <div className="space-y-3">
                    {(inspStats.by_template ?? []).slice(0, 5).map((t) => {
                      const max = Math.max(...(inspStats.by_template ?? []).map((x) => x.count), 1);
                      return <BarRow key={t.name} label={t.name} value={t.count} max={max} color="bg-brand-500" />;
                    })}
                    {(!inspStats.by_template || inspStats.by_template.length === 0) && (
                      <p className="text-sm text-brand-400 italic">No template data available.</p>
                    )}
                  </div>
                </div>

                <div className="bg-white/[0.22] backdrop-blur-2xl border border-white/50 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.85)] space-y-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Rates</p>
                  <ProgressBar
                    label="Completion Rate"
                    value={inspStats.total > 0 ? ((inspStats.by_status?.completed ?? 0) / inspStats.total * 100) : 0}
                    color="bg-brand-500"
                  />
                  <ProgressBar label="Flagged Rate" value={inspStats.flagged_rate ?? 0} color="bg-red-400" />
                </div>

                <div className="bg-white/[0.22] backdrop-blur-2xl border border-white/50 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.85)]">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">By Status</p>
                  <div className="space-y-3">
                    {Object.entries(inspStats.by_status ?? {}).map(([status, count]) => {
                      const maxVal = Math.max(...Object.values(inspStats.by_status ?? {}), 1);
                      return (
                        <BarRow key={status} label={status.replace(/_/g, " ")} value={count as number} max={maxVal} color="bg-brand-500" />
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════
                Issues tab
            ════════════════════════════════════════════════════ */}
            {tab === "issues" && issueStats && (
              <div className="space-y-4">
                <div className="bg-white/[0.22] backdrop-blur-2xl border border-white/50 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.85)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total Issues</p>
                      <p className="mt-1 text-3xl font-bold text-brand-800">{issueStats.total}</p>
                    </div>
                    <MiniBarChart
                      data={Object.values(issueStats.by_status ?? {}).map(v => v as number)}
                      color="#499241"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="bg-white/[0.22] backdrop-blur-2xl border border-white/50 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.85)]">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">By Priority</p>
                    <div className="space-y-3">
                      {[
                        { key: "critical", label: "Critical", color: "bg-red-500" },
                        { key: "high", label: "High", color: "bg-orange-400" },
                        { key: "medium", label: "Medium", color: "bg-amber-400" },
                        { key: "low", label: "Low", color: "bg-brand-500" },
                      ].map(({ key, label, color }) => {
                        const val = (issueStats.by_priority ?? {})[key] ?? 0;
                        const max = Math.max(...Object.values(issueStats.by_priority ?? {}), 1);
                        return <BarRow key={key} label={label} value={val} max={max} color={color} />;
                      })}
                    </div>
                  </div>

                  <div className="bg-white/[0.22] backdrop-blur-2xl border border-white/50 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.85)]">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">By Type</p>
                    <div className="space-y-3">
                      {Object.entries(issueStats.by_type ?? {}).map(([type, count]) => {
                        const max = Math.max(...Object.values(issueStats.by_type ?? {}), 1);
                        return (
                          <BarRow key={type} label={type.replace(/_/g, " ")} value={count as number} max={max} color="bg-brand-500" />
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="bg-white/[0.22] backdrop-blur-2xl border border-white/50 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.85)]">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Open vs Resolved</p>
                  {(() => {
                    const open = (issueStats.by_status ?? {})["open"] ?? 0;
                    const resolved = (issueStats.by_status ?? {})["resolved"] ?? 0;
                    const total = open + resolved || 1;
                    const openPct = Math.round((open / total) * 100);
                    const closedPct = 100 - openPct;
                    return (
                      <div className="space-y-3">
                        <div className="flex rounded-xl h-10 overflow-hidden w-full">
                          <div
                            className="flex items-center justify-center bg-amber-400 text-xs font-bold text-white transition-all"
                            style={{ width: `${openPct}%`, minWidth: openPct > 0 ? "3rem" : "0" }}
                          >
                            {openPct > 10 && `${openPct}%`}
                          </div>
                          <div
                            className="flex items-center justify-center bg-brand-500 text-xs font-bold text-white transition-all"
                            style={{ width: `${closedPct}%`, minWidth: closedPct > 0 ? "3rem" : "0" }}
                          >
                            {closedPct > 10 && `${closedPct}%`}
                          </div>
                        </div>
                        <div className="flex gap-6 text-xs">
                          <span className="flex items-center gap-1.5 text-gray-500">
                            <span className="inline-block h-3 w-3 rounded-sm bg-amber-400" />
                            Open ({open})
                          </span>
                          <span className="flex items-center gap-1.5 text-gray-500">
                            <span className="inline-block h-3 w-3 rounded-sm bg-brand-500" />
                            Resolved ({resolved})
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════
                Actions tab
            ════════════════════════════════════════════════════ */}
            {tab === "actions" && actionStats && (
              <div className="space-y-4">
                {actionStats.overdue > 0 && (
                  <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {actionStats.overdue} overdue action{actionStats.overdue !== 1 ? "s" : ""} — immediate attention required
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Total Actions", value: actionStats.total, accent: "border-brand-400" },
                    { label: "Overdue", value: actionStats.overdue, accent: actionStats.overdue > 0 ? "border-red-400" : "border-brand-400" },
                    { label: "Completed", value: (actionStats.by_status ?? {})["complete"] ?? 0, accent: "border-brand-300" },
                  ].map(({ label, value, accent }) => (
                    <div key={label} className={`bg-white/[0.22] backdrop-blur-2xl border border-white/50 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.85)] border-l-4 ${accent}`}>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
                      <p className="mt-1 text-3xl font-bold text-brand-800">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="bg-white/[0.22] backdrop-blur-2xl border border-white/50 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.85)]">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">By Status</p>
                    <div className="space-y-3">
                      {[
                        { key: "to_do", label: "To Do", color: "bg-gray-400" },
                        { key: "in_progress", label: "In Progress", color: "bg-blue-400" },
                        { key: "complete", label: "Complete", color: "bg-brand-500" },
                        { key: "cant_do", label: "Can't Do", color: "bg-red-400" },
                      ].map(({ key, label, color }) => {
                        const val = (actionStats.by_status ?? {})[key] ?? 0;
                        const max = Math.max(...Object.values(actionStats.by_status ?? {}), 1);
                        return <BarRow key={key} label={label} value={val} max={max} color={color} />;
                      })}
                    </div>
                  </div>

                  <div className="bg-white/[0.22] backdrop-blur-2xl border border-white/50 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.85)]">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">By Priority</p>
                    <div className="space-y-3">
                      {[
                        { key: "high", label: "High", color: "bg-red-400" },
                        { key: "medium", label: "Medium", color: "bg-amber-400" },
                        { key: "low", label: "Low", color: "bg-brand-500" },
                      ].map(({ key, label, color }) => {
                        const val = (actionStats.by_priority ?? {})[key] ?? 0;
                        const max = Math.max(...Object.values(actionStats.by_priority ?? {}), 1);
                        return <BarRow key={key} label={label} value={val} max={max} color={color} />;
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
