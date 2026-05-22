// Empty string = same origin (proxied via Vite dev server or Nginx)
const API_BASE = "";

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("rigpro_token");
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
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

export type IssuesSummary = {
  total: number;
  by_status: Record<string, number>;
  by_type: Record<string, number>;
  by_priority: Record<string, number>;
};

export type ActionsSummary = {
  total: number;
  overdue: number;
  by_status: Record<string, number>;
  by_priority: Record<string, number>;
};

export type Notification = {
  id: string;
  user_id: string;
  message: string;
  event_type: "info" | "warning" | "critical" | "success";
  link: string;
  is_read: boolean;
  created_at: string;
};

export const notificationsApi = {
  list: (userId: string) =>
    api<Notification[]>(`/api/notifications?user_id=${encodeURIComponent(userId)}`),
  unreadCount: (userId: string) =>
    api<{ count: number }>(`/api/notifications/unread-count?user_id=${encodeURIComponent(userId)}`),
  markRead: (id: string) =>
    api<Notification>(`/api/notifications/${id}/read`, { method: "PATCH" }),
  markAllRead: (userId: string) =>
    api<{ ok: boolean }>(`/api/notifications/mark-all-read?user_id=${encodeURIComponent(userId)}`, { method: "POST" }),
};
