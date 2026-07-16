const isRailwayHost = typeof window !== "undefined" && window.location.hostname.endsWith("up.railway.app");

const API_BASE = isRailwayHost ? "" : (import.meta.env.VITE_API_URL ?? "");

/** Returns an Authorization header object for the stored token, or an empty object if not logged in. */
export function authHeader(): Record<string, string> {
  const token = localStorage.getItem("rigpro_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Downloads a file from an authenticated endpoint and opens it in a new tab. */
export async function downloadFile(path: string): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, { headers: authHeader() });
  if (!res.ok) throw new Error("Download failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Sends an authenticated HTTP request to the API and returns the parsed JSON response. */
export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("rigpro_token");
  const headers = new Headers(options?.headers ?? {});
  if (!(options?.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || "Request failed");
  }

  return (await res.json()) as T;
}

export type DashboardSummary = {
  kpi: {
    total_inspections: number;
    pending_approval: number;
    approved: number;
    in_progress: number;
    completion_rate: number;
    avg_score: number;
    open_issues: number;
    overdue_actions: number;
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
