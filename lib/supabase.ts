import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase URL and Anon Key must be provided in environment variables."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Only create admin client if service role key exists (for server-side usage)
export const supabaseAdmin = serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

// Database types (same as before)
export interface User {
  id: string
  username: string
  full_name: string
  email?: string
  password?: string;
  phone?: string
  created_at: string
  profile_picture_url?: string
}

export interface Condo {
  id: string
  user_id: string
  name: string
  address: string
  room_number?: string
  description?: string
  purchase_price?: number
  purchase_date?: string
  seller?: string
  is_active: boolean
  created_at: string
  tenants?: Tenant[]
  area?: number
  loan_term?: number
  installment_amount?: number
  payment_due_date?: string
}


export interface Tenant {
  id: string
  condo_id: string
  full_name: string
  phone?: string
  line_id?: string
  rental_start: string
  rental_end: string
  deposit?: number
  monthly_rent: number
  is_active: boolean
  status: "active" | "ending" | "ended"
  end_reason?: "expired" | "early_termination" | "changed_tenant"
  actual_end_date?: string
  notes?: string
  created_at: string
  condo?: Condo
}

export interface TenantHistory {
  id: string
  condo_id: string
  full_name: string
  phone?: string
  line_id?: string
  rental_start: string
  rental_end: string
  actual_end_date?: string
  deposit?: number
  monthly_rent: number
  end_reason?: "expired" | "early_termination" | "changed_tenant"
  notes?: string
  created_at: string
  moved_out_at: string
  condo?: Condo
}

export interface RentPayment {
  id: string
  tenant_id: string
  amount: number
  due_date: string
  paid_date?: string
  status: "unpaid" | "paid" | "overdue"
  notes?: string
  created_at: string
  tenant?: Tenant
}

export interface IncomeRecord {
  id: string
  condo_id: string
  type: string
  amount: number
  date: string
  description?: string
  category?: string
  created_at: string
  condo?: Condo
}

export interface ExpenseRecord {
  id: string
  condo_id: string
  type: string
  amount: number
  date: string
  description?: string
  category?: string
  created_at: string
  condo?: Condo
}

export interface Document {
  id: string
  condo_id?: string
  tenant_id?: string
  name: string
  file_url?: string
  file_type?: string
  document_type?: string
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: "rent_due" | "rent_overdue" | "contract_expiring" | "maintenance" | "payment_received" | "system_alert"
  title: string
  message: string
  date: string
  is_read: boolean
  priority: "high" | "medium" | "low"
  tenant_id?: string
  condo_id?: string
  amount?: number
  created_at: string
  updated_at: string
  tenant?: Tenant // Joined tenant data
  condo?: Condo // Joined condo data
}