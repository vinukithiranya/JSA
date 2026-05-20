import Layout from "../components/Layout";
import type { User } from "../types";

type Props = { user: User | null; onLogout: () => void };

const SAMPLE_CONTRACTORS = [
  { id: "C001", company: "Alpha Drilling Services", contact: "James Whitfield", email: "j.whitfield@alphadrilling.com", phone: "+61 412 000 111", category: "Drilling", status: "active", expiry: "2026-12-31" },
  { id: "C002", company: "SafeWork Solutions", contact: "Maria Torres", email: "m.torres@safework.com.au", phone: "+61 403 222 333", category: "Safety", status: "active", expiry: "2026-09-30" },
  { id: "C003", company: "Coastal Crane Hire", contact: "David Nguyen", email: "d.nguyen@coastalcrane.com", phone: "+61 418 444 555", category: "Equipment", status: "pending", expiry: "2027-03-15" },
  { id: "C004", company: "EnviroShield Pty Ltd", contact: "Rachel Brennan", email: "r.brennan@enviroshield.com", phone: "+61 400 666 777", category: "Environmental", status: "active", expiry: "2026-06-30" },
  { id: "C005", company: "Peak Maintenance Group", contact: "Scott Lim", email: "s.lim@peakmaint.com", phone: "+61 423 888 999", category: "Maintenance", status: "expired", expiry: "2025-11-01" },
];

const CAT_COLORS: Record<string, string> = {
  Drilling: "bg-blue-100 text-blue-700",
  Safety: "bg-red-100 text-red-700",
  Equipment: "bg-purple-100 text-purple-700",
  Environmental: "bg-green-100 text-green-700",
  Maintenance: "bg-orange-100 text-orange-700",
};

const STATUS_BADGE: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  pending: "bg-amber-100 text-amber-700",
  expired: "bg-red-100 text-red-700",
};

function isNearExpiry(expiry: string): boolean {
  const days = (new Date(expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return days >= 0 && days <= 60;
}

export default function ContractorsPage({ user, onLogout }: Props) {
  return (
    <Layout user={user} title="Contractors" onLogout={onLogout}>
      {/* Banner */}
      <div className="mb-6 flex items-center gap-4 rounded-xl border border-brand-200 bg-brand-50 px-5 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <div>
          <p className="font-display text-sm font-semibold text-brand-900">Contractor Management</p>
          <p className="text-xs text-brand-500">Contractor onboarding, compliance tracking and documentation management is coming soon.</p>
        </div>
        <span className="ml-auto rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700">Coming soon</span>
      </div>

      {/* Stats row */}
      <div className="mb-5 grid grid-cols-3 gap-4 sm:grid-cols-3">
        {[
          { label: "Active", count: SAMPLE_CONTRACTORS.filter((c) => c.status === "active").length, color: "text-green-600" },
          { label: "Pending", count: SAMPLE_CONTRACTORS.filter((c) => c.status === "pending").length, color: "text-amber-600" },
          { label: "Expired", count: SAMPLE_CONTRACTORS.filter((c) => c.status === "expired").length, color: "text-red-600" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-brand-100 bg-white px-4 py-3 shadow-sm">
            <p className={`font-display text-xl font-bold ${s.color}`}>{s.count}</p>
            <p className="text-xs text-brand-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-brand-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-brand-100 px-4 py-3">
          <p className="text-sm font-semibold text-brand-900">{SAMPLE_CONTRACTORS.length} Contractors</p>
          <button
            disabled
            className="rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white opacity-40 cursor-not-allowed"
          >
            + Add Contractor
          </button>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-brand-100 bg-brand-50/50">
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-brand-400">Company</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-brand-400">Category</th>
              <th className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wide text-brand-400 sm:table-cell">Contact</th>
              <th className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wide text-brand-400 md:table-cell">Expires</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-brand-400">Status</th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE_CONTRACTORS.map((c) => {
              const nearExpiry = isNearExpiry(c.expiry) && c.status !== "expired";
              return (
                <tr key={c.id} className="border-b border-brand-50 last:border-0 transition hover:bg-brand-50/30">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-brand-900">{c.company}</p>
                    <p className="text-xs text-brand-400">{c.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CAT_COLORS[c.category] ?? "bg-brand-100 text-brand-700"}`}>
                      {c.category}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <p className="text-sm text-brand-700">{c.contact}</p>
                    <p className="text-xs text-brand-400">{c.phone}</p>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <span className={`text-sm ${nearExpiry ? "font-semibold text-amber-600" : "text-brand-600"}`}>
                      {c.expiry}
                    </span>
                    {nearExpiry && (
                      <p className="text-xs text-amber-500">Expiring soon</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE[c.status]}`}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
