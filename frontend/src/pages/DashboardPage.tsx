import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import { api, type DashboardSummary } from "../api";
import type { User } from "../types";

type Props = { user: User; onLogout: () => void };

export default function DashboardPage({ user, onLogout }: Props) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    api<DashboardSummary>("/api/dashboard/summary").then(setSummary).catch(() => null);
  }, []);

  return (
    <AppShell user={user} title="Operations Dashboard" onLogout={onLogout}>
      <section className="grid gap-4 md:grid-cols-5">
        <Card title="Total JSAs" value={summary?.kpi.total_jsa ?? 0} />
        <Card title="Pending Approval" value={summary?.kpi.pending_approval ?? 0} />
        <Card title="Approved" value={summary?.kpi.approved ?? 0} />
        <Card title="Completion %" value={`${summary?.kpi.completion_rate ?? 0}%`} />
        <Card title="Avg Risk Score" value={summary?.kpi.avg_risk_score ?? 0} />
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="glass-card rounded-2xl p-5 shadow-card">
          <h2 className="mb-3 font-display text-xl text-brand-900">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Link to="/jsa/new" className="rounded-xl bg-brand-700 px-4 py-2 font-semibold text-white">Create New JSA</Link>
            <Link to="/supervisor" className="rounded-xl bg-white px-4 py-2 font-semibold text-brand-800">Supervisor Queue</Link>
            <Link to="/forms" className="rounded-xl bg-white px-4 py-2 font-semibold text-brand-800">Form Builder</Link>
            <Link to="/documents" className="rounded-xl bg-white px-4 py-2 font-semibold text-brand-800">Documents</Link>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 shadow-card">
          <h2 className="mb-3 font-display text-xl text-brand-900">Status Breakdown</h2>
          <ul className="space-y-2 text-brand-800">
            {summary?.status_breakdown.map((item) => (
              <li key={item.status} className="flex items-center justify-between rounded-xl bg-white p-3">
                <span className="capitalize">{item.status.replace("_", " ")}</span>
                <strong>{item.count}</strong>
              </li>
            )) ?? <li>No data yet</li>}
          </ul>
        </div>
      </section>
    </AppShell>
  );
}

function Card({ title, value }: { title: string; value: string | number }) {
  return (
    <article className="glass-card rounded-2xl p-4 shadow-card">
      <p className="text-sm text-brand-700">{title}</p>
      <p className="font-display text-3xl text-brand-900">{value}</p>
    </article>
  );
}
