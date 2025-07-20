"use client"

import { useState, useEffect, useCallback } from "react"
import {
  condoService,
  tenantService,
  rentPaymentService,
  incomeService,
  expenseService,
  tenantHistoryService,
  documentService, // Import documentService
} from "../database"
import { supabase } from "@/lib/supabase"
import type { Condo, Tenant, RentPayment, IncomeRecord, ExpenseRecord, TenantHistory, Document, Notification } from "../supabase"

// Custom hook for condos with real database
export function useCondosDB(userId?: string) {
  const [condos, setCondos] = useState<Condo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCondos = async () => {
    if (!userId) {
      setCondos([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const data = await condoService.getByUserId(userId)
      setCondos(data)
      setError(null)
    } catch (err) {
      setError("Failed to fetch condos")
      console.error("Error fetching condos:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCondos()
  }, [userId])

  const addCondo = async (condoData: Omit<Condo, "id" | "created_at">) => {
    try {
      const newCondo = await condoService.create(condoData)
      if (newCondo) {
        setCondos((prev) => [newCondo, ...prev])
        return newCondo
      }
    } catch (err) {
      setError("Failed to add condo")
      console.error("Error adding condo:", err)
    }
    return null
  }

  const updateCondo = async (id: string, updates: Partial<Condo>) => {
    try {
      const updatedCondo = await condoService.update(id, updates)
      if (updatedCondo) {
        setCondos((prev) => prev.map((c) => (c.id === id ? updatedCondo : c)))
        return updatedCondo
      }
    } catch (err) {
      setError("Failed to update condo")
      console.error("Error updating condo:", err)
    }
    return null
  }

  const deleteCondo = async (id: string) => {
    try {
      const success = await condoService.delete(id)
      if (success) {
        setCondos((prev) => prev.filter((c) => c.id !== id))
        return true
      }
    } catch (err) {
      setError("Failed to delete condo")
      console.error("Error deleting condo:", err)
    }
    return false
  }

  return { condos, loading, error, addCondo, updateCondo, deleteCondo, refetch: fetchCondos }
}

// Custom hook for tenants with real database
export function useTenantsDB(userId?: string) {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTenants = async () => {
    try {
      setLoading(true)
      // Fetch all tenants first, then filter by user's condos if userId is provided
      const allTenants = await tenantService.getAll()
      let filteredData = allTenants

      if (userId) {
        const userCondos = await condoService.getByUserId(userId)
        const userCondoIds = userCondos.map((c) => c.id)
        filteredData = allTenants.filter((t) => userCondoIds.includes(t.condo_id))
      }

      setTenants(filteredData)
      setError(null)
    } catch (err) {
      setError("Failed to fetch tenants")
      console.error("Error fetching tenants:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTenants()
  }, [userId]) // Depend on userId to refetch when user changes

  const addTenant = async (tenantData: Omit<Tenant, "id" | "created_at">) => {
    try {
      const newTenant = await tenantService.create(tenantData)
      if (newTenant) {
        setTenants((prev) => [newTenant, ...prev])
        return newTenant
      }
    } catch (err) {
      setError("Failed to add tenant")
      console.error("Error adding tenant:", err)
    }
    return null
  }

  const updateTenant = async (id: string, updates: Partial<Tenant>) => {
    try {
      const updatedTenant = await tenantService.update(id, updates)
      if (updatedTenant) {
        setTenants((prev) => prev.map((t) => (t.id === id ? updatedTenant : t)))
        return updatedTenant
      }
    } catch (err) {
      setError("Failed to update tenant")
      console.error("Error updating tenant:", err)
    }
    return null
  }

  const endTenantContract = async (
    tenantId: string,
    endData: {
      end_reason: string
      actual_end_date: string
      notes?: string
    },
  ) => {
    try {
      const success = await tenantService.endContract(tenantId, endData)
      if (success) {
        // Move to history and update local state
        const tenant = tenants.find((t) => t.id === tenantId)
        if (tenant) {
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
        }

        setTenants((prev) => prev.filter((t) => t.id !== tenantId))
        return true
      }
    } catch (err) {
      setError("Failed to end tenant contract")
      console.error("Error ending tenant contract:", err)
    }
    return false
  }

  return { tenants, loading, error, addTenant, updateTenant, endTenantContract, refetch: fetchTenants }
}

// Custom hook for rent payments with real database
  export function useRentPaymentsDB(userId?: string) {
    const [payments, setPayments] = useState<RentPayment[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchPayments = async () => {
      try {
        setLoading(true)
        const allPayments = await rentPaymentService.getAll()
        let filteredData = allPayments

        if (userId) {
          const userCondos = await condoService.getByUserId(userId)
          const userCondoIds = userCondos.map((c) => c.id)
          filteredData = allPayments.filter((p) => p.tenant?.condo_id && userCondoIds.includes(p.tenant.condo_id))
        }

        setPayments(filteredData)
        setError(null)
      } catch (err) {
        setError("Failed to fetch payments")
        console.error("Error fetching payments:", err)
      } finally {
        setLoading(false)
      }
    }

    useEffect(() => {
      fetchPayments()
      // Update overdue payments on load
      rentPaymentService.updateOverduePayments()
    }, [userId])

    const addPayment = async (paymentData: Omit<RentPayment, "id" | "created_at">) => {
      try {
        const newPayment = await rentPaymentService.create(paymentData)
        if (newPayment) {
          setPayments((prev) => [newPayment, ...prev])
          return newPayment
        }
      } catch (err) {
        setError("Failed to add payment")
        console.error("Error adding payment:", err)
      }
      return null
    }

    const updatePayment = async (id: string, updates: Partial<RentPayment>) => {
      try {
        const updatedPayment = await rentPaymentService.update(id, updates)
        if (updatedPayment) {
          setPayments((prev) => prev.map((p) => (p.id === id ? updatedPayment : p)))
          return updatedPayment
        }
      } catch (err) {
        setError("Failed to update payment")
        console.error("Error updating payment:", err)
      }
      return null
    }

    const deletePayment = async (id: string) => {
      try {
        const success = await rentPaymentService.delete(id)
        if (success) {
          setPayments((prev) => prev.filter((p) => p.id !== id))
          return true
        }
        return false
      } catch (err) {
        setError("Failed to delete payment")
        console.error("Error deleting payment:", err)
        return false
      }
    }

    return { 
      payments, 
      loading, 
      error, 
      addPayment, 
      updatePayment, 
      deletePayment, 
      refetch: fetchPayments 
    }
  }

// Custom hook for financial records with real database
export function useFinancialRecordsDB(userId?: string) {
  const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>([])
  const [expenseRecords, setExpenseRecords] = useState<ExpenseRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRecords = async () => {
    try {
      setLoading(true)
      const [allIncomeData, allExpenseData] = await Promise.all([incomeService.getAll(), expenseService.getAll()])

      let filteredIncome = allIncomeData
      let filteredExpenses = allExpenseData

      if (userId) {
        const userCondos = await condoService.getByUserId(userId)
        const userCondoIds = userCondos.map((c) => c.id)
        filteredIncome = allIncomeData.filter((r) => userCondoIds.includes(r.condo_id))
        filteredExpenses = allExpenseData.filter((r) => userCondoIds.includes(r.condo_id))
      }

      setIncomeRecords(filteredIncome)
      setExpenseRecords(filteredExpenses)
      setError(null)
    } catch (err) {
      setError("Failed to fetch financial records")
      console.error("Error fetching financial records:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecords()
  }, [userId])

  const addIncomeRecord = async (recordData: Omit<IncomeRecord, "id" | "created_at">) => {
    try {
      const newRecord = await incomeService.create(recordData)
      if (newRecord) {
        setIncomeRecords((prev) => [newRecord, ...prev])
        return newRecord
      }
    } catch (err) {
      setError("Failed to add income record")
      console.error("Error adding income record:", err)
    }
    return null
  }

  const addExpenseRecord = async (recordData: Omit<ExpenseRecord, "id" | "created_at">) => {
    try {
      const newRecord = await expenseService.create(recordData)
      if (newRecord) {
        setExpenseRecords((prev) => [newRecord, ...prev])
        return newRecord
      }
    } catch (err) {
      setError("Failed to add expense record")
      console.error("Error adding expense record:", err)
    }
    return null
  }

  const updateIncomeRecord = async (id: string, updates: Partial<IncomeRecord>) => {
    try {
      const updatedRecord = await incomeService.update(id, updates)
      if (updatedRecord) {
        setIncomeRecords((prev) => prev.map((r) => (r.id === id ? updatedRecord : r)))
        return updatedRecord
      }
    } catch (err) {
      setError("Failed to update income record")
      console.error("Error updating income record:", err)
    }
    return null
  }

  const updateExpenseRecord = async (id: string, updates: Partial<ExpenseRecord>) => {
    try {
      const updatedRecord = await expenseService.update(id, updates)
      if (updatedRecord) {
        setExpenseRecords((prev) => prev.map((r) => (r.id === id ? updatedRecord : r)))
        return updatedRecord
      }
    } catch (err) {
      setError("Failed to update expense record")
      console.error("Error updating expense record:", err)
    }
    return null
  }

  const deleteIncomeRecord = async (id: string) => {
    try {
      const success = await incomeService.delete(id)
      if (success) {
        setIncomeRecords((prev) => prev.filter((r) => r.id !== id))
        return true
      }
    } catch (err) {
      setError("Failed to delete income record")
      console.error("Error deleting income record:", err)
    }
    return false
  }

  const deleteExpenseRecord = async (id: string) => {
    try {
      const success = await expenseService.delete(id)
      if (success) {
        setExpenseRecords((prev) => prev.filter((r) => r.id !== id))
        return true
      }
    } catch (err) {
      setError("Failed to delete expense record")
      console.error("Error deleting expense record:", err)
    }
    return false
  }

  return {
    incomeRecords,
    expenseRecords,
    loading,
    error,
    addIncomeRecord,
    addExpenseRecord,
    updateIncomeRecord,
    updateExpenseRecord,
    deleteIncomeRecord,
    deleteExpenseRecord,
    refetch: fetchRecords,
  }
}

// Custom hook for tenant history with real database
export function useTenantHistoryDB(userId?: string) {
  const [tenantHistory, setTenantHistory] = useState<TenantHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      if (!userId) {
        setTenantHistory([])
        return
      }

      // 1. ดึง condo_ids ของ user ปัจจุบันจากตาราง condos
      const { data: condos, error: condoError } = await supabase
        .from("condos")
        .select("id")
        .eq("user_id", userId) // ใช้ user_id ตามโครงสร้างของคุณ

      if (condoError) throw condoError

      if (!condos || condos.length === 0) {
        setTenantHistory([])
        return
      }

      const condoIds = condos.map(c => c.id)

      // 2. ดึง tenant_history ที่มี condo_id ตรงกับ condo ของ user
      const { data, error: historyError } = await supabase
        .from("tenant_history")
        .select(`
          *,
          condo:condos(*)
        `)
        .in("condo_id", condoIds)
        .order("moved_out_at", { ascending: false })

      if (historyError) throw historyError

      setTenantHistory(data || [])
    } catch (err) {
      console.error("Error fetching tenant history:", err)
      setError("ไม่สามารถโหลดประวัติผู้เช่าได้")
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const refresh = useCallback(() => {
    fetchData()
  }, [fetchData])

  return {
    tenantHistory,
    loading,
    error,
    refresh
  }
}
// Custom hook for documents with real database
export function useDocumentsDB(condoId?: string, tenantId?: string) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDocuments = async () => {
    if (!condoId && !tenantId) {
      setDocuments([])
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      let data: Document[] = []
      if (condoId) {
        data = await documentService.getByCondoId(condoId)
      } else if (tenantId) {
        data = await documentService.getByTenantId(tenantId)
      }
      setDocuments(data)
      setError(null)
    } catch (err) {
      setError("Failed to fetch documents")
      console.error("Error fetching documents:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [condoId, tenantId])

  const addDocument = async (documentData: Omit<Document, "id" | "created_at">) => {
    try {
      const newDocument = await documentService.create(documentData)
      if (newDocument) {
        setDocuments((prev) => [newDocument, ...prev])
        return newDocument
      }
    } catch (err) {
      setError("Failed to add document")
      console.error("Error adding document:", err)
    }
    return null
  }

  const deleteDocument = async (id: string) => {
    try {
      const success = await documentService.delete(id)
      if (success) {
        setDocuments((prev) => prev.filter((d) => d.id !== id))
        return true
      }
    } catch (err) {
      setError("Failed to delete document")
      console.error("Error deleting document:", err)
    }
    return false
  }

  return { documents, loading, error, addDocument, deleteDocument, refetch: fetchDocuments }
}

export const useNotificationsDB = (userId?: string) => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (!userId) {
        setNotifications([])
        setLoading(false)
        return
      }
      const { data, error: dbError } = await supabase
        .from("notifications")
        .select(
          `
          *,
          tenant:tenant_id(id, full_name),
          condo:condo_id(id, name, room_number)
        `,
        )
        .eq("user_id", userId)
        .order("date", { ascending: false })

      if (dbError) throw dbError
      setNotifications(data || [])
    } catch (err: any) {
      setError(err.message)
      console.error("Error fetching notifications:", err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const updatedNotification = await supabase
        .from("notifications")
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq("id", notificationId)
        .select()
        .single()

      if (updatedNotification) {
        setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)))
      }
      return updatedNotification
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    try {
      if (!userId) {
        setError("User not authenticated.")
        return false
      }
      const { error: dbError } = await supabase
        .from("notifications")
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("is_read", false) // Only mark unread as read

      if (dbError) throw dbError
      await fetchNotifications() // Refetch all to ensure UI is updated
      return true
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }, [userId, fetchNotifications])

  return { notifications, loading, error, markAsRead, markAllAsRead, refetch: fetchNotifications }
}