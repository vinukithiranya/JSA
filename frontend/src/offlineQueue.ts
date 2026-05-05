export type OfflineJsaPayload = {
  job_number: string;
  boat_name: string;
  service_log_number: string;
  location: string;
  date: string;
  steps: string[];
  answers: Record<string, boolean>;
};

const QUEUE_KEY = "rigpro_offline_jsa_queue";

export function enqueueOfflineJsa(item: OfflineJsaPayload): void {
  const existing = getOfflineQueue();
  localStorage.setItem(QUEUE_KEY, JSON.stringify([...existing, item]));
}

export function getOfflineQueue(): OfflineJsaPayload[] {
  const raw = localStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as OfflineJsaPayload[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function clearOfflineQueue(): void {
  localStorage.removeItem(QUEUE_KEY);
}
