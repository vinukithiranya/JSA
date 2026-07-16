import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export interface LocalTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  form_schema: { sections: unknown[] };
}

export interface LocalInspection {
  id: string;
  template_id: string;
  template_name: string;
  title: string;
  site: string;
  conducted_by: string;
  status: string;
  answers: Record<string, unknown>;
  flagged_items: unknown[];
  score: number | null;
  total_questions: number;
  answered_questions: number;
  started_at: string;
  completed_at: string | null;
  approved_by: string | null;
  supervisor_signature: string | null;
  pdf_url: string | null;
  _offline: boolean;
}

export interface LocalIssue {
  id: string;
  title: string;
  description: string;
  issue_type: string;
  category: string;
  site: string;
  priority: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
  media_urls: string[];
  custom_answers: Record<string, string>;
  reported_by: string;
  assigned_to: string | null;
  linked_jsa_id: string | null;
  created_at: string;
  updated_at: string | null;
  resolved_at: string | null;
  _offline: boolean;
}

interface RigProSchema extends DBSchema {
  templates: { key: string; value: LocalTemplate };
  inspections: { key: string; value: LocalInspection };
  issues: { key: string; value: LocalIssue };
}

let _db: IDBPDatabase<RigProSchema> | null = null;

export async function getDB(): Promise<IDBPDatabase<RigProSchema>> {
  if (_db) return _db;
  _db = await openDB<RigProSchema>("rigpro-v1", 1, {
    upgrade(db) {
      db.createObjectStore("templates", { keyPath: "id" });
      db.createObjectStore("inspections", { keyPath: "id" });
      db.createObjectStore("issues", { keyPath: "id" });
    },
  });
  return _db;
}
