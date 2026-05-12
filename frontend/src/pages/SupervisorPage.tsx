import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { api } from "../api";
import type { JsaRecord, User } from "../types";

type Props = { user: User | null; onLogout: () => void };

export default function SupervisorPage({ user, onLogout }: Props) {
  const [items, setItems] = useState<JsaRecord[]>([]);

  async function load() {
    const all = await api<JsaRecord[]>("/api/jsa");
    setItems(all.filter((x) => x.status === "pending_approval"));
  }

  useEffect(() => {
    load().catch(() => null);
  }, []);

  async function approve(id: string) {
    await api(`/api/jsa/${id}/approve`, { method: "POST" });
    await load();
  }

  return (
    <Layout user={user} title="Supervisor Approval Queue" onLogout={onLogout}>
      <div className="glass-card rounded-2xl p-5 shadow-card">
        <h2 className="mb-4 font-display text-xl text-brand-900">Pending JSAs ({items.length})</h2>
        <div className="space-y-3">
          {items.map((jsa) => (
            <article key={jsa.id} className="flex flex-col gap-3 rounded-xl bg-white p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold text-brand-900">{jsa.job_number} - {jsa.boat_name}</p>
                <p className="text-sm text-brand-700">Service Log: {jsa.service_log_number} | Location: {jsa.location}</p>
              </div>
              <div className="flex gap-2">
                <a href={`http://localhost:8000/api/jsa/${jsa.id}/report`} target="_blank" className="rounded-xl bg-brand-100 px-3 py-2 font-semibold text-brand-900">View PDF</a>
                <button onClick={() => approve(jsa.id)} className="rounded-xl bg-brand-700 px-3 py-2 font-semibold text-white">Approve</button>
              </div>
            </article>
          ))}
          {items.length === 0 ? <p className="text-brand-700">No pending approvals.</p> : null}
        </div>
      </div>
    </Layout>
  );
}
