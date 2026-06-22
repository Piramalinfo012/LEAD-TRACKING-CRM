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
  password?: string;
}

export enum LeadStatus {
  COLD = 'COLD',
  LEAD = 'LEAD',
  MEETING = 'MEETING',
  SAMPLE = 'SAMPLE',
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
  custom_status?: string;
  
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
  'Entry By Id'?: string;
  entry_by_id?: string;
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
  reschedule_count?: number | string;
  'Reschedule Count'?: number | string;
  'Reschedule'?: number | string;
  'No of Reschedules'?: number | string;
  discussion_points?: string;
  meeting_person_name?: string;
  meeting_number?: string;
  bullet_point_remarks?: string;
  meeting_url?: string;
  
  // Technical Discussion Stage Data
  tech_planned_date?: string;
  tech_actual_date?: string;
  tech_status?: string;
  tech_products?: TechProduct[];
  tech_kit_url?: string;

  // Sample Stage Data
  sample_planned_date?: string;
  sample_actual_date?: string;
  sample_status?: string;
  sample_product_name?: string;
  sample_qty?: string;
  sample_dispatch_date?: string;
  sample_remark?: string;
  sample_attachment?: string;

  // Negotiation Stage Data
  negotiation_planned_date?: string;
  negotiation_actual_date?: string;
  negotiation_status?: string;
  quotation_url?: string;
  unit?: string;
  final_price?: string;
  quantity?: string;
  payment_terms?: string;
  delivery_schedule?: string;
  party_type?: string;
  negotiation_remark?: string;
  negotiation_kit_url?: string;

  // Order Stage Data
  order_planned_date?: string;
  order_actual_date?: string;
  order_copy_url?: string;
  delivery_in?: string;
  unloading?: string;
  motor_pump_requirement?: string;
  transport?: string;
  order_remark?: string;
  order_attachment_url?: string;
  order_status?: string;
}

export interface TechProduct {
  product_name: string;
  density: string;
  gcv: string;
  flash_point: string;
  moisture: string;
  carbon_content: string;
  sulphur: string;
  remarks: string;
  sediment: string;
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
