"use client"

import { useState, useEffect } from "react"
import {
  condoService,
  tenantService,
  rentPaymentService,
  incomeService,
  expenseService,
  tenantHistoryService,
} from "../database"
import type { Condo, Tenant, RentPayment, IncomeRecord, ExpenseRecord, TenantHistory } from "../supabase"

// Custom hook for condos with real database
export function useCondosDB(userId?: string) {
  const [condos, setCondos] = useState<Condo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCondos = async () => {
    if (!userId) return

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
export function useTenantsDB(condoId?: string) {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTenants = async () => {
    try {
      setLoading(true)
      const data = condoId ? await tenantService.getByCondoId(condoId) : await tenantService.getAll()
      setTenants(data)
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
  }, [condoId])

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
export function useRentPaymentsDB(tenantId?: string) {
  const [payments, setPayments] = useState<RentPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPayments = async () => {
    try {
      setLoading(true)
      const data = await rentPaymentService.getAll()
      const filteredData = tenantId ? data.filter((p) => p.tenant_id === tenantId) : data
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
  }, [tenantId])

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

  return { payments, loading, error, addPayment, updatePayment, refetch: fetchPayments }
}

// Custom hook for financial records with real database
export function useFinancialRecordsDB(condoId?: string) {
  const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>([])
  const [expenseRecords, setExpenseRecords] = useState<ExpenseRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRecords = async () => {
    try {
      setLoading(true)
      const [incomeData, expenseData] = await Promise.all([incomeService.getAll(), expenseService.getAll()])

      const filteredIncome = condoId ? incomeData.filter((r) => r.condo_id === condoId) : incomeData
      const filteredExpenses = condoId ? expenseData.filter((r) => r.condo_id === condoId) : expenseData

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
  }, [condoId])

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
export function useTenantHistoryDB(condoId?: string) {
  const [tenantHistory, setTenantHistory] = useState<TenantHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHistory = async () => {
    try {
      setLoading(true)
      const data = await tenantHistoryService.getAll()
      const filteredData = condoId ? data.filter((h) => h.condo_id === condoId) : data
      setTenantHistory(filteredData)
      setError(null)
    } catch (err) {
      setError("Failed to fetch tenant history")
      console.error("Error fetching tenant history:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [condoId])

  return { tenantHistory, loading, error, refetch: fetchHistory }
}
