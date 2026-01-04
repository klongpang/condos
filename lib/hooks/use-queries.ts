"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  condoService,
  tenantService,
  rentPaymentService,
  incomeService,
  expenseService,
  tenantHistoryService,
} from "../database"
import { supabase } from "@/lib/supabase"
import type {
  Condo,
  Tenant,
  RentPayment,
  IncomeRecord,
  ExpenseRecord,
  TenantHistory,
  NotificationSummary,
} from "../supabase"

// ==================== Query Keys ====================
export const queryKeys = {
  condos: (userId?: string) => ["condos", userId] as const,
  tenants: (userId?: string) => ["tenants", userId] as const,
  payments: (userId?: string) => ["payments", userId] as const,
  incomeRecords: (userId?: string) => ["incomeRecords", userId] as const,
  expenseRecords: (userId?: string) => ["expenseRecords", userId] as const,
  financialRecords: (userId?: string) => ["financialRecords", userId] as const,
  tenantHistory: (userId?: string) => ["tenantHistory", userId] as const,
  notificationSummaries: (userId?: string) => ["notificationSummaries", userId] as const,
}

// ==================== Fetch Functions ====================
async function fetchCondos(userId?: string): Promise<Condo[]> {
  if (!userId) return []
  return await condoService.getByUserId(userId)
}

async function fetchTenants(userId?: string): Promise<Tenant[]> {
  const allTenants = await tenantService.getAll()
  if (!userId) return allTenants

  const userCondos = await condoService.getByUserId(userId)
  const userCondoIds = userCondos.map((c) => c.id)
  return allTenants.filter((t) => userCondoIds.includes(t.condo_id))
}

async function fetchPayments(userId?: string): Promise<RentPayment[]> {
  // Update overdue payments on load
  await rentPaymentService.updateOverduePayments()
  
  const allPayments = await rentPaymentService.getAll()
  if (!userId) return allPayments

  const userCondos = await condoService.getByUserId(userId)
  const userCondoIds = userCondos.map((c) => c.id)
  return allPayments.filter((p) => p.tenant?.condo_id && userCondoIds.includes(p.tenant.condo_id))
}

async function fetchFinancialRecords(userId?: string): Promise<{
  incomeRecords: IncomeRecord[]
  expenseRecords: ExpenseRecord[]
}> {
  const [allIncomeData, allExpenseData] = await Promise.all([
    incomeService.getAll(),
    expenseService.getAll(),
  ])

  if (!userId) {
    return { incomeRecords: allIncomeData, expenseRecords: allExpenseData }
  }

  const userCondos = await condoService.getByUserId(userId)
  const userCondoIds = userCondos.map((c) => c.id)
  
  return {
    incomeRecords: allIncomeData.filter((r) => userCondoIds.includes(r.condo_id)),
    expenseRecords: allExpenseData.filter((r) => userCondoIds.includes(r.condo_id)),
  }
}

async function fetchTenantHistory(userId?: string): Promise<TenantHistory[]> {
  if (!userId) return []

  const { data: condos, error: condoError } = await supabase
    .from("condos")
    .select("id")
    .eq("user_id", userId)

  if (condoError) throw condoError
  if (!condos || condos.length === 0) return []

  const condoIds = condos.map((c) => c.id)

  const { data, error: historyError } = await supabase
    .from("tenant_history")
    .select(`*, condo:condos(*)`)
    .in("condo_id", condoIds)
    .order("moved_out_at", { ascending: false })

  if (historyError) throw historyError
  return data || []
}

async function fetchNotificationSummaries(userId?: string): Promise<NotificationSummary[]> {
  if (!userId) return []

  const { data, error: dbError } = await supabase
    .from("notification_summaries")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false })

  if (dbError) throw dbError
  return data || []
}

// ==================== Query Hooks ====================

/**
 * Hook สำหรับดึงข้อมูล Condos พร้อม caching
 * staleTime: 5 นาที (ข้อมูลเปลี่ยนไม่บ่อย)
 */
export function useCondos(userId?: string) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: queryKeys.condos(userId),
    queryFn: () => fetchCondos(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  return {
    condos: query.data ?? [],
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  }
}

/**
 * Hook สำหรับดึงข้อมูล Tenants พร้อม caching
 * staleTime: 5 นาที (ข้อมูลเปลี่ยนไม่บ่อย)
 */
export function useTenants(userId?: string) {
  const query = useQuery({
    queryKey: queryKeys.tenants(userId),
    queryFn: () => fetchTenants(userId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  return {
    tenants: query.data ?? [],
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  }
}

/**
 * Hook สำหรับดึงข้อมูล Rent Payments พร้อม caching
 * staleTime: 1 นาที (อาจมีการเปลี่ยนบ่อยกว่า)
 */
export function useRentPayments(userId?: string) {
  const query = useQuery({
    queryKey: queryKeys.payments(userId),
    queryFn: () => fetchPayments(userId),
    staleTime: 1 * 60 * 1000, // 1 minute
  })

  return {
    payments: query.data ?? [],
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  }
}

/**
 * Hook สำหรับดึงข้อมูล Financial Records พร้อม caching
 * staleTime: 2 นาที
 */
export function useFinancialRecords(userId?: string) {
  const query = useQuery({
    queryKey: queryKeys.financialRecords(userId),
    queryFn: () => fetchFinancialRecords(userId),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })

  return {
    incomeRecords: query.data?.incomeRecords ?? [],
    expenseRecords: query.data?.expenseRecords ?? [],
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  }
}

/**
 * Hook สำหรับดึงประวัติผู้เช่า พร้อม caching
 * staleTime: 5 นาที (ข้อมูลประวัติเปลี่ยนไม่บ่อย)
 */
export function useTenantHistory(userId?: string) {
  const query = useQuery({
    queryKey: queryKeys.tenantHistory(userId),
    queryFn: () => fetchTenantHistory(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  return {
    tenantHistory: query.data ?? [],
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refresh: query.refetch,
  }
}

/**
 * Hook สำหรับดึง Notification Summaries พร้อม caching
 * staleTime: 30 วินาที (ต้องอัพเดทบ่อย)
 */
export function useNotifications(userId?: string) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: queryKeys.notificationSummaries(userId),
    queryFn: () => fetchNotificationSummaries(userId),
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
  })

  const markAsRead = async (summaryId: string) => {
    const { error } = await supabase
      .from("notification_summaries")
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .eq("id", summaryId)

    if (error) throw error

    // Update cache optimistically
    queryClient.setQueryData(queryKeys.notificationSummaries(userId), (old: NotificationSummary[] | undefined) =>
      old?.map((s) => (s.id === summaryId ? { ...s, is_read: true } : s))
    )
  }

  const markAllAsRead = async () => {
    if (!userId) return false

    const { error: dbError } = await supabase
      .from("notification_summaries")
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("is_read", false)

    if (dbError) throw dbError

    // Refetch to ensure UI is updated
    await query.refetch()
    return true
  }

  // Compute stats from summaries
  const summaries = query.data ?? []
  const unreadCount = summaries.filter(s => !s.is_read).length
  const totalItems = summaries.reduce((sum, s) => sum + s.total_count, 0)

  return {
    summaries,
    notifications: summaries, // alias for backward compatibility
    loading: query.isLoading,
    error: query.error?.message ?? null,
    markAsRead,
    markAllAsRead,
    refetch: query.refetch,
    unreadCount,
    totalItems,
  }
}

// ==================== Mutation Hooks ====================

/**
 * Mutation สำหรับเพิ่ม Condo
 */
export function useAddCondo(userId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (condoData: Omit<Condo, "id" | "created_at">) => {
      const newCondo = await condoService.create(condoData)
      if (!newCondo) throw new Error("Failed to add condo")
      return newCondo
    },
    onSuccess: (newCondo) => {
      queryClient.setQueryData(queryKeys.condos(userId), (old: Condo[] | undefined) =>
        old ? [newCondo, ...old] : [newCondo]
      )
    },
  })
}

/**
 * Mutation สำหรับอัพเดท Condo
 */
export function useUpdateCondo(userId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Condo> }) => {
      const updated = await condoService.update(id, updates)
      if (!updated) throw new Error("Failed to update condo")
      return updated
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.condos(userId), (old: Condo[] | undefined) =>
        old?.map((c) => (c.id === updated.id ? updated : c))
      )
    },
  })
}

/**
 * Mutation สำหรับลบ Condo
 */
export function useDeleteCondo(userId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const ok = await condoService.delete(id)
      if (!ok) throw new Error("Failed to delete condo")
      return id
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData(queryKeys.condos(userId), (old: Condo[] | undefined) =>
        old?.filter((c) => c.id !== deletedId)
      )
    },
  })
}

/**
 * Mutation สำหรับเพิ่ม Tenant
 */
export function useAddTenant(userId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (tenantData: Omit<Tenant, "id" | "created_at">) => {
      const newTenant = await tenantService.create(tenantData)
      if (!newTenant) throw new Error("Failed to add tenant")
      return newTenant
    },
    onSuccess: (newTenant) => {
      queryClient.setQueryData(queryKeys.tenants(userId), (old: Tenant[] | undefined) =>
        old ? [newTenant, ...old] : [newTenant]
      )
    },
  })
}

/**
 * Mutation สำหรับอัพเดท Tenant
 */
export function useUpdateTenant(userId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Tenant> }) => {
      const updated = await tenantService.update(id, updates)
      if (!updated) throw new Error("Failed to update tenant")
      return updated
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.tenants(userId), (old: Tenant[] | undefined) =>
        old?.map((t) => (t.id === updated.id ? updated : t))
      )
    },
  })
}

/**
 * Mutation สำหรับสิ้นสุดสัญญาผู้เช่า
 */
export function useEndTenantContract(userId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      tenantId,
      endData,
      tenant,
    }: {
      tenantId: string
      endData: { end_reason: string; actual_end_date: string; notes?: string }
      tenant: Tenant
    }) => {
      const success = await tenantService.endContract(tenantId, endData)
      if (!success) throw new Error("Failed to end tenant contract")

      // Move to history
      await tenantHistoryService.create({
        condo_id: tenant.condo_id,
        full_name: tenant.full_name,
        phone: tenant.phone,
        line_id: tenant.line_id,
        rental_start: tenant.rental_start,
        rental_end: tenant.rental_end,
        actual_end_date: endData.actual_end_date,
        deposit: tenant.deposit,
        monthly_rent: tenant.monthly_rent,
        end_reason: endData.end_reason as any,
        notes: endData.notes,
      })

      return tenantId
    },
    onSuccess: (tenantId) => {
      queryClient.setQueryData(queryKeys.tenants(userId), (old: Tenant[] | undefined) =>
        old?.filter((t) => t.id !== tenantId)
      )
      // Invalidate tenant history to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.tenantHistory(userId) })
    },
  })
}

/**
 * Mutation สำหรับเพิ่ม Payment
 */
export function useAddPayment(userId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (paymentData: Omit<RentPayment, "id" | "created_at">) => {
      const newPayment = await rentPaymentService.create(paymentData)
      if (!newPayment) throw new Error("Failed to add payment")
      return newPayment
    },
    onSuccess: (newPayment) => {
      queryClient.setQueryData(queryKeys.payments(userId), (old: RentPayment[] | undefined) =>
        old ? [newPayment, ...old] : [newPayment]
      )
    },
  })
}

/**
 * Mutation สำหรับอัพเดท Payment
 */
export function useUpdatePayment(userId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<RentPayment> }) => {
      const updated = await rentPaymentService.update(id, updates)
      if (!updated) throw new Error("Failed to update payment")
      return updated
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.payments(userId), (old: RentPayment[] | undefined) =>
        old?.map((p) => (p.id === updated.id ? updated : p))
      )
    },
  })
}

/**
 * Mutation สำหรับลบ Payment
 */
export function useDeletePayment(userId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const success = await rentPaymentService.delete(id)
      if (!success) throw new Error("Failed to delete payment")
      return id
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData(queryKeys.payments(userId), (old: RentPayment[] | undefined) =>
        old?.filter((p) => p.id !== deletedId)
      )
    },
  })
}

/**
 * Mutation สำหรับเพิ่ม Income Record
 */
export function useAddIncomeRecord(userId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (recordData: Omit<IncomeRecord, "id" | "created_at">) => {
      const newRecord = await incomeService.create(recordData)
      if (!newRecord) throw new Error("Failed to add income record")
      return newRecord
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.financialRecords(userId) })
    },
  })
}

/**
 * Mutation สำหรับเพิ่ม Expense Record
 */
export function useAddExpenseRecord(userId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (recordData: Omit<ExpenseRecord, "id" | "created_at">) => {
      const newRecord = await expenseService.create(recordData)
      if (!newRecord) throw new Error("Failed to add expense record")
      return newRecord
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.financialRecords(userId) })
    },
  })
}

/**
 * Mutation สำหรับอัพเดท Income Record
 */
export function useUpdateIncomeRecord(userId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<IncomeRecord> }) => {
      const updated = await incomeService.update(id, updates)
      if (!updated) throw new Error("Failed to update income record")
      return updated
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.financialRecords(userId) })
    },
  })
}

/**
 * Mutation สำหรับอัพเดท Expense Record
 */
export function useUpdateExpenseRecord(userId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ExpenseRecord> }) => {
      const updated = await expenseService.update(id, updates)
      if (!updated) throw new Error("Failed to update expense record")
      return updated
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.financialRecords(userId) })
    },
  })
}

/**
 * Mutation สำหรับลบ Income Record
 */
export function useDeleteIncomeRecord(userId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const success = await incomeService.delete(id)
      if (!success) throw new Error("Failed to delete income record")
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.financialRecords(userId) })
    },
  })
}

/**
 * Mutation สำหรับลบ Expense Record
 */
export function useDeleteExpenseRecord(userId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const success = await expenseService.delete(id)
      if (!success) throw new Error("Failed to delete expense record")
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.financialRecords(userId) })
    },
  })
}
