export interface User {
  id: string;
  email: string;
  name: string;
  role: 'employee' | 'agent';
  created_at: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
  user: User;
}

export type TicketStatus = 'open' | 'resolved';
export type TicketCategory = 'IT' | 'HR' | 'Finance' | 'Admin' | 'Other';
export type TicketPriority = 'Low' | 'Medium' | 'High';

export interface Ticket {
  id: string;
  title: string;
  description: string;
  attachment_filename: string | null;
  status: TicketStatus;
  ai_category: string | null;
  ai_priority: string | null;
  ai_confidence?: number | null;
  agent_category: string | null;
  agent_priority: string | null;
  employee_id: string;
  agent_id: string | null;
  ai_draft_reply: string | null;
  final_reply: string | null;
  created_at: string;
  resolved_at: string | null;
  employee_name?: string;
  agent_name?: string;
}

export interface AuditLog {
  id: string;
  ticket_id: string;
  agent_id: string;
  field_changed: string;
  old_value: string;
  new_value: string;
  changed_at: string;
  agent_name?: string;
}

export interface DraftReply {
  draft: string;
  citations: string[];
}

export interface Metrics {
  tickets_by_status: { open: number; resolved: number };
  tickets_by_category: Record<string, number>;
  median_resolution_time_minutes: number;
  ai_override_percentage: number;
  total_tickets: number;
}

export interface TicketFilters {
  status?: string;
  category?: string;
  priority?: string;
  search?: string;
}
