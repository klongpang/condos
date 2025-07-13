import { supabase, supabaseAdmin } from "./supabase"
import type { User, Condo, Tenant, RentPayment, IncomeRecord, ExpenseRecord, TenantHistory } from "./supabase"

// User functions
export const userService = {
  async authenticate(username: string, password: string): Promise<User | null> {const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("username", username)
    .single();

  if (error || !data) return null;

  if (data.password === password) {
    return data;
  }

  return null;
  },

  async getById(id: string): Promise<User | null> {
    const { data, error } = await supabase.from("users").select("*").eq("id", id).single()

    return error ? null : data
  },

  async create(userData: Omit<User, "id" | "created_at">): Promise<User | null> {
  const { data, error } = await supabaseAdmin!
    .from("users")
    .insert([userData])
    .select()
    .single()

  return error ? null : data
  }
}

// Condo functions
export const condoService = {
  async getByUserId(userId: string): Promise<Condo[]> {
    const { data, error } = await supabase
      .from("condos")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })

    return error ? [] : data
  },

  async create(condoData: Omit<Condo, "id" | "created_at">): Promise<Condo | null> {
    const { data, error } = await supabase.from("condos").insert([condoData]).select().single()

    return error ? null : data
  },

  async update(id: string, updates: Partial<Condo>): Promise<Condo | null> {
    const { data, error } = await supabase
      .from("condos")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()

    return error ? null : data
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from("condos")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id)

    return !error
  },
}

// Tenant functions
export const tenantService = {
  async getAll(): Promise<Tenant[]> {
    const { data, error } = await supabase
      .from("tenants")
      .select(`
        *,
        condo:condos(*)
      `)
      .eq("is_active", true)
      .order("created_at", { ascending: false })

    return error ? [] : data
  },

  async getByCondoId(condoId: string): Promise<Tenant[]> {
    const { data, error } = await supabase
      .from("tenants")
      .select(`
        *,
        condo:condos(*)
      `)
      .eq("condo_id", condoId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })

    return error ? [] : data
  },

  async create(tenantData: Omit<Tenant, "id" | "created_at">): Promise<Tenant | null> {
    const { data, error } = await supabase
      .from("tenants")
      .insert([tenantData])
      .select(`
        *,
        condo:condos(*)
      `)
      .single()

    return error ? null : data
  },

  async update(id: string, updates: Partial<Tenant>): Promise<Tenant | null> {
    const { data, error } = await supabase
      .from("tenants")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(`
        *,
        condo:condos(*)
      `)
      .single()

    return error ? null : data
  },

  async endContract(
    tenantId: string,
    endData: {
      end_reason: string
      actual_end_date: string
      notes?: string
    },
  ): Promise<boolean> {
    const { error } = await supabase
      .from("tenants")
      .update({
        is_active: false,
        status: "ended",
        ...endData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tenantId)

    return !error
  },
}

// Rent Payment functions
export const rentPaymentService = {
  async getAll(): Promise<RentPayment[]> {
    const { data, error } = await supabase
      .from("rent_payments")
      .select(`
        *,
        tenant:tenants(
          *,
          condo:condos(*)
        )
      `)
      .order("due_date", { ascending: false })

    return error ? [] : data
  },

  async create(paymentData: Omit<RentPayment, "id" | "created_at">): Promise<RentPayment | null> {
    const { data, error } = await supabase
      .from("rent_payments")
      .insert([paymentData])
      .select(`
        *,
        tenant:tenants(
          *,
          condo:condos(*)
        )
      `)
      .single()

    return error ? null : data
  },

  async update(id: string, updates: Partial<RentPayment>): Promise<RentPayment | null> {
    const { data, error } = await supabase
      .from("rent_payments")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(`
        *,
        tenant:tenants(
          *,
          condo:condos(*)
        )
      `)
      .single()

    return error ? null : data
  },

  async updateOverduePayments(): Promise<void> {
    const today = new Date().toISOString().split("T")[0]

    await supabase.from("rent_payments").update({ status: "overdue" }).eq("status", "unpaid").lt("due_date", today)
  },
}

// Income Record functions
export const incomeService = {
  async getAll(): Promise<IncomeRecord[]> {
    const { data, error } = await supabase
      .from("income_records")
      .select(`
        *,
        condo:condos(*)
      `)
      .order("date", { ascending: false })

    return error ? [] : data
  },

  async create(incomeData: Omit<IncomeRecord, "id" | "created_at">): Promise<IncomeRecord | null> {
    const { data, error } = await supabase
      .from("income_records")
      .insert([incomeData])
      .select(`
        *,
        condo:condos(*)
      `)
      .single()

    return error ? null : data
  },

  async update(id: string, updates: Partial<IncomeRecord>): Promise<IncomeRecord | null> {
    const { data, error } = await supabase
      .from("income_records")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(`
        *,
        condo:condos(*)
      `)
      .single()

    return error ? null : data
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase.from("income_records").delete().eq("id", id)

    return !error
  },
}

// Expense Record functions
export const expenseService = {
  async getAll(): Promise<ExpenseRecord[]> {
    const { data, error } = await supabase
      .from("expense_records")
      .select(`
        *,
        condo:condos(*)
      `)
      .order("date", { ascending: false })

    return error ? [] : data
  },

  async create(expenseData: Omit<ExpenseRecord, "id" | "created_at">): Promise<ExpenseRecord | null> {
    const { data, error } = await supabase
      .from("expense_records")
      .insert([expenseData])
      .select(`
        *,
        condo:condos(*)
      `)
      .single()

    return error ? null : data
  },

  async update(id: string, updates: Partial<ExpenseRecord>): Promise<ExpenseRecord | null> {
    const { data, error } = await supabase
      .from("expense_records")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(`
        *,
        condo:condos(*)
      `)
      .single()

    return error ? null : data
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase.from("expense_records").delete().eq("id", id)

    return !error
  },
}

// Tenant History functions
export const tenantHistoryService = {
  async getAll(): Promise<TenantHistory[]> {
    const { data, error } = await supabase
      .from("tenant_history")
      .select(`
        *,
        condo:condos(*)
      `)
      .order("moved_out_at", { ascending: false })

    return error ? [] : data
  },

  async create(historyData: Omit<TenantHistory, "id" | "created_at" | "moved_out_at">): Promise<TenantHistory | null> {
    const { data, error } = await supabase
      .from("tenant_history")
      .insert([
        {
          ...historyData,
          moved_out_at: new Date().toISOString(),
        },
      ])
      .select(`
        *,
        condo:condos(*)
      `)
      .single()

    return error ? null : data
  },
}
