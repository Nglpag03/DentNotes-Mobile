export interface Patient {
  id?: string;
  first_name: string;
  last_name: string;
  condition: string;
  allergies?: string;
  medications?: string;
  created_at?: string;
  user_id?: string;
}

export type SessionStatus = "IN PROGRESS" | "PLANNED" | "COMPLETED";

export interface Session {
  id?: string;
  patient_id: string;
  title: string;
  description: string;
  session_date: string;
  status: SessionStatus;
  next_steps?: string;
  user_id?: string;
  patients?: { first_name: string; last_name: string };
}

export interface AuditEntry {
  id: number;
  user_id: string | null;
  table_name: "patients" | "sessions";
  record_id: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  changed_fields: string[] | null;
  created_at: string;
}