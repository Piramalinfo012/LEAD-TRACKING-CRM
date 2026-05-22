/**
 * CRM Shared Types
 */

export enum UserRole {
  ADMIN = 'ADMIN',
  CRM = 'CRM',
  SALES = 'SALES'
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  employee_id: string;
  reporting_manager_id?: string;
  senior_sales_id?: string;
  profile_url?: string;
}

export enum LeadStatus {
  COLD = 'COLD',
  LEAD = 'LEAD',
  MEETING = 'MEETING',
  TECHNICAL_DISCUSSION = 'TECHNICAL_DISCUSSION',
  NEGOTIATION = 'NEGOTIATION',
  ORDER = 'ORDER',
  CLOSED = 'CLOSED'
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface Lead {
  id: string;
  company_name: string;
  contact_person: string;
  mobile: string;
  alternate_mobile?: string;
  email: string;
  address: string;
  city: string;
  state: string;
  product: string;
  source: string;
  priority: Priority;
  owner_id: string;
  expected_value: number;
  notes: string;
  status: LeadStatus;
  followup_date?: string;
  next_action?: string;
  attachments?: string[]; // Drive IDs or URLs
  created_at: string;
  updated_at: string;
  
  // Entry Data Fields
  'Party Name'?: string;
  'Person Name'?: string;
  'Mobile No. '?: string;
  'Gmail ID'?: string;
  'MCBs. (KIT) URl'?: string;
  'Last Remarks'?: string;
  'District'?: string;
  'State'?: string;
  'Sales Person Name'?: string;
  'Source'?: string;
  'Follow Up date'?: string;
  Timestamp?: string;
  
  // Close details if CLOSED
  close_reason?: string;
  close_remark?: string;
  closed_by?: string;
  closed_at?: string;

  // Lead Stage Specific Data
  lead_planned_date?: string;
  lead_actual_date?: string;
  lead_status?: string;
  product_details?: string;
  mcb_requirement?: string;
  pain_points?: string;
  kit_details?: string;
  meeting_followup_date?: string;

  // Meeting Stage Specific Data
  meeting_planned_date?: string;
  meeting_actual_date?: string;
  meeting_status?: string;
  reschedule_date?: string;
  discussion_points?: string;
  meeting_person_name?: string;
  meeting_number?: string;
  bullet_point_remarks?: string;
  meeting_url?: string;
}

export interface Followup {
  id: string;
  lead_id: string;
  user_id: string;
  type: 'CALL' | 'MEETING' | 'NOTE';
  notes: string;
  date: string;
  created_at: string;
}

export interface LeadHistory {
  id: string;
  lead_id: string;
  prev_stage: string;
  next_stage: string;
  user_id: string;
  timestamp: string;
  remarks: string;
}
