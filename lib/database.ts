import { supabase, supabaseAdmin } from "./supabase"
import type { User, Condo, Tenant, RentPayment, IncomeRecord, ExpenseRecord, TenantHistory, Document } from "./supabase"

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
  },
  async update(
  id: string,
  updates: Partial<User>
): Promise<User | null> {
  try {
    // ตรวจสอบข้อมูลก่อนอัปเดต
    if (!id || typeof updates !== 'object') {
      throw new Error('Invalid input data');
    }

    const { data, error } = await supabaseAdmin!
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase Error Details:', {
        message: error.message,
        code: error.code,
        details: error.details
      });
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Full Error Stack:', error);
    return null;
  }
}
}


// Condo functions
export const condoService = {
  async getByUserId(userId: string): Promise<Condo[]> {
    const { data, error } = await supabase
      .from("condos")
      .select("*")
      .eq("user_id", userId)
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

   async delete(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('rent_payments')
        .delete()
        .eq('id', id)
      
      if (error) {
        console.error('Error deleting payment:', error)
        return false
      }
      
      return true
    } catch (err) {
      console.error('Error deleting payment:', err)
      return false
    }
  }
}

export const incomeService = {
  async getAll(): Promise<IncomeRecord[]> {
    const { data, error } = await supabase
      .from("income_records")
      .select(`
        *,
        condo:condos(*),
        tenant:tenants(*)
      `)
      .order("date", { ascending: false })

    return error ? [] : (data as IncomeRecord[])
  },

  async create(incomeData: Omit<IncomeRecord, "id" | "created_at">): Promise<IncomeRecord | null> {
    // กันเคส UI ส่ง "" → ให้เป็น null
    const payload = {
      ...incomeData,
      tenant_id: incomeData.tenant_id || null,
    }

    const { data, error } = await supabase
      .from("income_records")
      .insert([payload])
      .select(`
        *,
        condo:condos(*),
        tenant:tenants(*)
      `)
      .single()

    return error ? null : (data as IncomeRecord)
  },

  async update(id: string, updates: Partial<IncomeRecord>): Promise<IncomeRecord | null> {
    const payload = {
      ...updates,
      tenant_id:
        updates.tenant_id === "" ? null : updates.tenant_id ?? undefined, // คงค่าเดิมถ้าไม่ส่งมา
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from("income_records")
      .update(payload)
      .eq("id", id)
      .select(`
        *,
        condo:condos(*),
        tenant:tenants(*)
      `)
      .single()

    return error ? null : (data as IncomeRecord)
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
        condo:condos(*),
        tenant:tenants(*)
      `)
      .order("date", { ascending: false })

    return error ? [] : (data as ExpenseRecord[])
  },

  async create(expenseData: Omit<ExpenseRecord, "id" | "created_at">): Promise<ExpenseRecord | null> {
    const payload = {
      ...expenseData,
      tenant_id: expenseData.tenant_id || null,
    }

    const { data, error } = await supabase
      .from("expense_records")
      .insert([payload])
      .select(`
        *,
        condo:condos(*),
        tenant:tenants(*)
      `)
      .single()

    return error ? null : (data as ExpenseRecord)
  },

  async update(id: string, updates: Partial<ExpenseRecord>): Promise<ExpenseRecord | null> {
    const payload = {
      ...updates,
      tenant_id:
        updates.tenant_id === "" ? null : updates.tenant_id ?? undefined,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from("expense_records")
      .update(payload)
      .eq("id", id)
      .select(`
        *,
        condo:condos(*),
        tenant:tenants(*)
      `)
      .single()

    return error ? null : (data as ExpenseRecord)
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
  async getByUserCondos(userId: string): Promise<TenantHistory[]> {
    // 1. ดึง condo_ids ของ user จากคอลัมน์ user_id
    const { data: condos, error: condoError } = await supabase
      .from('condos')
      .select('id')
      .eq('user_id', userId) // เปลี่ยนจาก owner_id เป็น user_id
      
    if (condoError || !condos?.length) return []

    // 2. ดึง tenant_history โดยใช้ condo_ids
    const { data, error } = await supabase
      .from('tenant_history')
      .select(`
        *,
        condo:condos(*)
      `)
      .in('condo_id', condos.map(c => c.id))
      .order("moved_out_at", { ascending: false })

    return error ? [] : data
  }
}

export type GetOptions = {
  documentType?: string
  scope?: "tenant" | "payment" | "income" | "expense" | "condo" | "any"
}

export const documentService = {
  async getByCondoId(condoId: string, opts?: GetOptions): Promise<Document[]> {
    let q = supabase.from("documents").select("*").eq("condo_id", condoId)

    // เอาเฉพาะเอกสาร “ของคอนโดโดยตรง”
    if (opts?.scope === "condo") {
      q = q
        .is("tenant_id", null)
        .is("payment_id", null)
        .is("income_id", null)
        .is("expense_id", null)
    }

    if (opts?.documentType) q = q.eq("document_type", opts.documentType)
    const { data, error } = await q.order("created_at", { ascending: false })
    return error ? [] : (data as Document[])
  },

  async getByTenantId(tenantId: string, opts?: GetOptions): Promise<Document[]> {
    let q = supabase.from("documents").select("*").eq("tenant_id", tenantId)

    // เอาเฉพาะเอกสาร “ของผู้เช่าโดยตรง”
    if (opts?.scope === "tenant") {
      q = q.is("payment_id", null).is("income_id", null).is("expense_id", null)
    }

    if (opts?.documentType) q = q.eq("document_type", opts.documentType)
    const { data, error } = await q.order("created_at", { ascending: false })
    return error ? [] : (data as Document[])
  },

  async getByPaymentId(paymentId: string, opts?: GetOptions): Promise<Document[]> {
    let q = supabase.from("documents").select("*").eq("payment_id", paymentId)
    if (opts?.documentType) q = q.eq("document_type", opts.documentType)
    const { data, error } = await q.order("created_at", { ascending: false })
    return error ? [] : (data as Document[])
  },

  async getByIncomeId(incomeId: string, opts?: GetOptions): Promise<Document[]> {
    let q = supabase.from("documents").select("*").eq("income_id", incomeId)
    if (opts?.documentType) q = q.eq("document_type", opts.documentType)
    const { data, error } = await q.order("created_at", { ascending: false })
    return error ? [] : (data as Document[])
  },

  async getByExpenseId(expenseId: string, opts?: GetOptions): Promise<Document[]> {
    let q = supabase.from("documents").select("*").eq("expense_id", expenseId)
    if (opts?.documentType) q = q.eq("document_type", opts.documentType)
    const { data, error } = await q.order("created_at", { ascending: false })
    return error ? [] : (data as Document[])
  },

  async create(documentData: Omit<Document, "id" | "created_at">): Promise<Document | null> {
    const { data, error } = await supabase.from("documents").insert([documentData]).select().single()
    return error ? null : (data as Document)
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase.from("documents").delete().eq("id", id)
    return !error
  },
}

// Notification functions
export const notificationService = {
  async getAll(userId: string): Promise<Notification[]> {
    const { data, error } = await supabase
      .from("notifications")
      .select(
        `
            *,
            tenant:tenant_id(id, full_name),
            condo:condo_id(id, name, room_number)
          `,
      )
      .eq("user_id", userId) // Filter by user_id
      .order("date", { ascending: false })

    return error ? [] : data
  },

  async update(id: string, updates: Partial<Notification>): Promise<Notification | null> {
    const { data, error } = await supabase
      .from("notifications")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()

    return error ? null : data
  },

  async create(notificationData: Omit<Notification, "id" | "created_at" | "updated_at">): Promise<Notification | null> {
    const { data, error } = await supabase.from("notifications").insert([notificationData]).select().single()

    return error ? null : data
  },
}