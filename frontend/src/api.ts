const API_BASE = "http://localhost:8000";

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
    ...options,
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || "Request failed");
  }

  return (await res.json()) as T;
}

export type DashboardSummary = {
  kpi: {
    total_jsa: number;
    pending_approval: number;
    approved: number;
    drafts: number;
    completion_rate: number;
    avg_risk_score: number;
  };
  status_breakdown: { status: string; count: number }[];
};
