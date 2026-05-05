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
};

export type FormTemplate = {
  id: string;
  name: string;
  category: string;
  description: string;
  form_schema: {
    sections?: Array<{
      title?: string;
      fields?: Array<{ id: string; type: string; label: string; required?: boolean }>;
    }>;
  };
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
