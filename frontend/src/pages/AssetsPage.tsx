import Layout from "../components/Layout";
import type { User } from "../types";

type Props = { user: User | null; onLogout: () => void };

const SAMPLE_ASSETS = [
  { id: "A001", name: "Drilling Rig #1", type: "Equipment", site: "Rig Alpha", status: "operational", last_inspection: "2026-05-10" },
  { id: "A002", name: "Safety Harness Set (x12)", type: "PPE", site: "Rig Alpha", status: "operational", last_inspection: "2026-05-08" },
  { id: "A003", name: "Crane Unit B", type: "Equipment", site: "Rig Beta", status: "maintenance", last_inspection: "2026-04-30" },
  { id: "A004", name: "Fire Suppression System", type: "Safety", site: "Rig Alpha", status: "operational", last_inspection: "2026-05-01" },
  { id: "A005", name: "Forklift F-04", type: "Vehicle", site: "Yard", status: "out_of_service", last_inspection: "2026-03-15" },
  { id: "A006", name: "Gas Detector Kit", type: "Safety", site: "Rig Beta", status: "operational", last_inspection: "2026-05-12" },
];

const TYPE_COLORS: Record<string, string> = {
  Equipment: "bg-blue-100 text-blue-700",
  PPE: "bg-yellow-100 text-yellow-700",
  Safety: "bg-red-100 text-red-700",
  Vehicle: "bg-purple-100 text-purple-700",
};

const STATUS_BADGE: Record<string, string> = {
  operational: "bg-green-100 text-green-700",
  maintenance: "bg-amber-100 text-amber-700",
  out_of_service: "bg-red-100 text-red-700",
};

const STATUS_LABEL: Record<string, string> = {
  operational: "Operational",
  maintenance: "Under Maintenance",
  out_of_service: "Out of Service",
};

export default function AssetsPage({ user, onLogout }: Props) {
  return (
    <Layout user={user} title="Assets" onLogout={onLogout}>
      {/* Banner */}
      <div className="mb-6 flex items-center gap-4 rounded-xl border border-brand-200 bg-brand-50 px-5 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <div>
          <p className="font-display text-sm font-semibold text-brand-900">Asset Register</p>
          <p className="text-xs text-brand-500">Full asset management with inspection scheduling is coming soon. Sample data shown below.</p>
        </div>
        <span className="ml-auto rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700">Coming soon</span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-brand-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-brand-100 px-4 py-3">
          <p className="text-sm font-semibold text-brand-900">{SAMPLE_ASSETS.length} Assets</p>
          <button
            disabled
            className="rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white opacity-40 cursor-not-allowed"
          >
            + Add Asset
          </button>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-brand-100 bg-brand-50/50">
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-brand-400">Asset ID</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-brand-400">Name</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-brand-400">Type</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-brand-400">Site</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-brand-400">Status</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-brand-400">Last Inspection</th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE_ASSETS.map((a) => (
              <tr key={a.id} className="border-b border-brand-50 last:border-0 transition hover:bg-brand-50/30">
                <td className="px-4 py-3 font-mono text-xs text-brand-500">{a.id}</td>
                <td className="px-4 py-3 text-sm font-medium text-brand-900">{a.name}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[a.type] ?? "bg-brand-100 text-brand-700"}`}>
                    {a.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-brand-600">{a.site}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[a.status]}`}>
                    {STATUS_LABEL[a.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-brand-500">{a.last_inspection}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
