import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import { api } from "../api";
import type { JsaRecord, User } from "../types";

type Props = { user: User };

export default function ReviewPage({ user }: Props) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [jsa, setJsa] = useState<JsaRecord | null>(null);

  useEffect(() => {
    if (!id) return;
    api<JsaRecord>(`/api/jsa/${id}`).then(setJsa).catch(() => null);
  }, [id]);

  async function submitForApproval() {
    if (!id) return;
    await api<JsaRecord>(`/api/jsa/${id}/submit`, { method: "POST" });
    navigate("/dashboard");
  }

  return (
    <AppShell user={user} title="Review and Edit Hazards">
      <div className="grid gap-4 md:grid-cols-3">
        <section className="glass-card rounded-2xl p-5 shadow-card md:col-span-2">
          <h2 className="mb-4 font-display text-xl text-brand-900">Detected Hazards</h2>
          <div className="space-y-3">
            {jsa?.hazards.map((hazard) => (
              <article key={hazard.hazard_id} className="rounded-xl bg-white p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-semibold text-brand-900">{hazard.hazard_name}</h3>
                  <span className="rounded-lg bg-brand-100 px-2 py-1 text-xs">Risk {hazard.pre_score}</span>
                </div>
                <p className="mb-2 text-sm text-brand-800">{hazard.controls}</p>
                <p className="text-xs text-brand-700">Pre: {hazard.pre_likelihood} x {hazard.pre_severity} = {hazard.pre_score}</p>
                <p className="text-xs text-brand-700">Post: {hazard.post_likelihood} x {hazard.post_severity} = {hazard.post_score}</p>
              </article>
            )) ?? <p>No hazards detected yet.</p>}
          </div>
        </section>

        <aside className="glass-card rounded-2xl p-5 shadow-card">
          <h2 className="mb-4 font-display text-xl text-brand-900">PPE Checklist</h2>
          <ul className="space-y-2">
            {jsa?.ppe_list.map((ppe) => (
              <li key={ppe} className="rounded-lg bg-white px-3 py-2 text-sm">{ppe}</li>
            )) ?? <li>No PPE items</li>}
          </ul>

          <div className="mt-6 space-y-2">
            <button onClick={submitForApproval} className="w-full rounded-xl bg-brand-700 py-2 font-semibold text-white">Submit for Supervisor</button>
            <Link to="/dashboard" className="block w-full rounded-xl bg-white py-2 text-center font-semibold text-brand-800">Back to Dashboard</Link>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
