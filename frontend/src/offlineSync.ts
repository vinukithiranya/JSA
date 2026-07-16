import { getDB, type LocalTemplate, type LocalInspection, type LocalIssue } from "./db";
export type { LocalTemplate, LocalInspection, LocalIssue } from "./db";
import { api } from "./api";

// ── Templates ────────────────────────────────────────────────────────────────

export async function cacheTemplates(templates: LocalTemplate[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("templates", "readwrite");
  await Promise.all(templates.map(t => tx.store.put(t)));
  await tx.done;
}

export async function getCachedTemplates(): Promise<LocalTemplate[]> {
  return (await getDB()).getAll("templates");
}

export async function getCachedTemplate(id: string): Promise<LocalTemplate | null> {
  const db = await getDB();
  return (await db.get("templates", id)) ?? null;
}

// ── Inspections ──────────────────────────────────────────────────────────────

export async function cacheInspections(inspections: LocalInspection[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("inspections", "readwrite");
  for (const insp of inspections) {
    const existing = await tx.store.get(insp.id);
    if (!existing?._offline) {
      await tx.store.put({ ...insp, _offline: false });
    }
  }
  await tx.done;
}

export async function getCachedInspections(): Promise<LocalInspection[]> {
  return (await getDB()).getAll("inspections");
}

export async function saveLocalInspection(insp: LocalInspection): Promise<void> {
  await (await getDB()).put("inspections", insp);
}

export async function getLocalInspection(id: string): Promise<LocalInspection | null> {
  const db = await getDB();
  return (await db.get("inspections", id)) ?? null;
}

// ── Issues ───────────────────────────────────────────────────────────────────

export async function cacheIssues(issues: LocalIssue[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("issues", "readwrite");
  for (const issue of issues) {
    const existing = await tx.store.get(issue.id);
    if (!existing?._offline) {
      await tx.store.put({ ...issue, _offline: false });
    }
  }
  await tx.done;
}

export async function getCachedIssues(): Promise<LocalIssue[]> {
  return (await getDB()).getAll("issues");
}

export async function saveLocalIssue(issue: LocalIssue): Promise<void> {
  await (await getDB()).put("issues", issue);
}

// ── Pending count ────────────────────────────────────────────────────────────

export async function getPendingCount(): Promise<number> {
  const db = await getDB();
  const [inspections, issues] = await Promise.all([
    db.getAll("inspections"),
    db.getAll("issues"),
  ]);
  return (
    inspections.filter(i => i._offline).length +
    issues.filter(i => i._offline).length
  );
}

// ── Sync ─────────────────────────────────────────────────────────────────────

export async function syncPending(): Promise<{ synced: number; failed: number }> {
  if (!navigator.onLine) return { synced: 0, failed: 0 };

  const db = await getDB();
  const [allInspections, allIssues] = await Promise.all([
    db.getAll("inspections"),
    db.getAll("issues"),
  ]);
  const offlineInspections = allInspections.filter(i => i._offline);
  const offlineIssues = allIssues.filter(i => i._offline);

  if (!offlineInspections.length && !offlineIssues.length) return { synced: 0, failed: 0 };

  try {
    const result = await api<{ synced_inspections: string[]; synced_issues: string[] }>(
      "/api/sync",
      {
        method: "POST",
        body: JSON.stringify({ inspections: offlineInspections, issues: offlineIssues }),
      }
    );

    const inspTx = db.transaction("inspections", "readwrite");
    for (const id of result.synced_inspections) {
      const rec = await inspTx.store.get(id);
      if (rec) await inspTx.store.put({ ...rec, _offline: false });
    }
    await inspTx.done;

    const issTx = db.transaction("issues", "readwrite");
    for (const id of result.synced_issues) {
      const rec = await issTx.store.get(id);
      if (rec) await issTx.store.put({ ...rec, _offline: false });
    }
    await issTx.done;

    const totalSynced =
      result.synced_inspections.length + result.synced_issues.length;
    const totalPending = offlineInspections.length + offlineIssues.length;
    return { synced: totalSynced, failed: totalPending - totalSynced };
  } catch {
    return { synced: 0, failed: offlineInspections.length + offlineIssues.length };
  }
}
