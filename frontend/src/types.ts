export type Role = "technician" | "supervisor" | "admin" | "view_only";

export type User = {
  id: string;
  email: string;
  full_name: string;
  role: Role;
};

export type Hazard = {
  hazard_id: number;
  hazard_name: string;
  controls: string;
  ppe: string;
  pre_likelihood: number;
  pre_severity: number;
  pre_score: number;
  post_likelihood: number;
  post_severity: number;
  post_score: number;
};

export type JsaRecord = {
  id: string;
  job_number: string;
  boat_name: string;
  service_log_number: string;
  location: string;
  date: string;
  status: "draft" | "pending_approval" | "approved";
  steps: string[];
  answers: Record<string, boolean>;
  hazards: Hazard[];
  ppe_list: string[];
  created_at: string;
  supervisor_signature: string | null;
  approved_by: string | null;
};

export type FormTemplate = {
  id: string;
  name: string;
  category: string;
  description: string;
  form_schema: {
    sections?: Array<{
      id?: string;
      title?: string;
      questions?: Array<{ id: string; type: string; text?: string; label?: string; required?: boolean }>;
    }>;
  };
};

export type InspectionRecord = {
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
  pdf_url: string | null;
};

export type DocumentItem = {
  id: string;
  filename: string;
  original_filename: string;
  file_path: string;
  category: string;
  folder: string;
  description: string;
  version: number;
  uploaded_by: string;
};

// ─── Issues ──────────────────────────────────────────────────────────────────

export type IssueType = "hazard" | "near_miss" | "observation" | "incident" | "positive" | "maintenance";
export type Priority = "high" | "medium" | "low";
export type IssueStatus = "open" | "in_progress" | "resolved";

export type Issue = {
  id: string;
  title: string;
  description: string;
  issue_type: IssueType;
  category: string;
  site: string;
  priority: Priority;
  status: IssueStatus;
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
};

export type IssueComment = {
  id: string;
  issue_id: string;
  user_id: string;
  message: string;
  created_at: string;
};

// ─── Actions ─────────────────────────────────────────────────────────────────

export type ActionStatus = "to_do" | "in_progress" | "complete" | "cant_do";

export type Action = {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string;
  status: ActionStatus;
  priority: Priority;
  due_date: string | null;
  labels: string[];
  action_type: string;
  linked_issue_id: string | null;
  linked_jsa_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string | null;
};

export type ActionComment = {
  id: string;
  action_id: string;
  user_id: string;
  message: string;
  created_at: string;
};

// ─── Scheduling ──────────────────────────────────────────────────────────────

export type ScheduleFrequency = "daily" | "weekly" | "monthly";
export type OccurrenceStatus = "pending" | "completed" | "missed" | "overdue";

export type Schedule = {
  id: string;
  title: string;
  template_id: string;
  template_name: string;
  frequency: ScheduleFrequency;
  frequency_value: number;
  start_date: string;
  end_date: string | null;
  site: string;
  assigned_users: string[];
  is_active: boolean;
  created_by: string;
  created_at: string;
};

export type ScheduleOccurrence = {
  id: string;
  schedule_id: string;
  schedule_title: string;
  due_date: string;
  status: OccurrenceStatus;
  completed_at: string | null;
  completed_by: string | null;
  jsa_id: string | null;
  created_at: string;
};
