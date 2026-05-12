import { useState } from "react";
import Layout from "../components/Layout";
import { api } from "../api";
import { clearOfflineQueue, getOfflineQueue } from "../offlineQueue";
import type { User } from "../types";

type Props = { user: User | null; onLogout: () => void };

export default function SyncPage({ user, onLogout }: Props) {
  const [message, setMessage] = useState("");
  const queue = getOfflineQueue();

  async function syncNow() {
    if (queue.length === 0) {
      setMessage("No offline items to sync.");
      return;
    }

    const payload = {
      created_by: user.id,
      items: queue,
    };

    const result = await api<{ synced: number }>("/api/sync/jsa-batch", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    clearOfflineQueue();
    setMessage(`Synced ${result.synced} offline JSA records.`);
  }

  return (
    <Layout user={user} title="Offline Sync Center" onLogout={onLogout}>
      <div className="glass-card rounded-2xl p-5 shadow-card">
        <h2 className="mb-2 font-display text-xl text-brand-900">Queued Offline JSAs</h2>
        <p className="mb-4 text-brand-800">{queue.length} records waiting for sync.</p>
        <button onClick={syncNow} className="rounded-xl bg-brand-700 px-4 py-2 font-semibold text-white">Sync Now</button>
        {message ? <p className="mt-3 text-brand-800">{message}</p> : null}
      </div>
    </Layout>
  );
}
