import Layout from "../components/Layout";
import type { User } from "../types";

type Props = { user: User | null; onLogout: () => void };

const MODULES = [
  { title: "Safety Induction", description: "Introduction to site safety procedures, PPE requirements and emergency protocols.", duration: "45 min", category: "Safety", status: "available" },
  { title: "JSA Completion", description: "How to correctly fill out a Job Safety Analysis and identify hazards.", duration: "30 min", category: "Compliance", status: "available" },
  { title: "Hazardous Materials Handling", description: "Procedures for safely handling and storing hazardous materials on-site.", duration: "60 min", category: "Safety", status: "coming_soon" },
  { title: "Emergency Response", description: "Step-by-step emergency response procedures including evacuation and first aid.", duration: "90 min", category: "Safety", status: "coming_soon" },
  { title: "Equipment Operation", description: "Safe operation of drilling equipment and machinery.", duration: "120 min", category: "Operations", status: "coming_soon" },
  { title: "Environmental Compliance", description: "Environmental protection standards and spill response procedures.", duration: "45 min", category: "Environmental", status: "coming_soon" },
];

const CAT_COLORS: Record<string, string> = {
  Safety: "bg-red-100 text-red-700",
  Compliance: "bg-blue-100 text-blue-700",
  Operations: "bg-purple-100 text-purple-700",
  Environmental: "bg-green-100 text-green-700",
};

export default function TrainingPage({ user, onLogout }: Props) {
  return (
    <Layout user={user} title="Training" onLogout={onLogout}>
      {/* Banner */}
      <div className="mb-6 flex items-center gap-4 rounded-xl border border-brand-200 bg-brand-50 px-5 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
          </svg>
        </div>
        <div>
          <p className="font-display text-sm font-semibold text-brand-900">Training Modules</p>
          <p className="text-xs text-brand-500">Interactive training and compliance modules are coming soon. Browse the available modules below.</p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m) => (
          <div
            key={m.title}
            className={`flex flex-col rounded-xl border bg-white p-4 shadow-sm transition ${
              m.status === "coming_soon" ? "border-brand-100 opacity-60" : "border-brand-100 hover:shadow-card"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CAT_COLORS[m.category] ?? "bg-brand-100 text-brand-700"}`}>
                {m.category}
              </span>
              {m.status === "coming_soon" && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                  Coming soon
                </span>
              )}
            </div>
            <h3 className="mt-3 font-display text-sm font-semibold text-brand-900">{m.title}</h3>
            <p className="mt-1 flex-1 text-xs leading-relaxed text-brand-500">{m.description}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="flex items-center gap-1 text-xs text-brand-400">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {m.duration}
              </span>
              <button
                disabled={m.status === "coming_soon"}
                className="rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {m.status === "coming_soon" ? "Coming soon" : "Start module"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}
