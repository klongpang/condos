"use client"

import { useState, useEffect } from "react"
import type { Condo, Tenant, RentPayment, IncomeRecord, ExpenseRecord } from "../supabase"
import { mockCondos, mockTenants, mockRentPayments, mockIncomeRecords, mockExpenseRecords } from "../mock-data"

// Custom hook for condos
export function useCondos(userId?: string) {
  const [condos, setCondos] = useState<Condo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      const userCondos = userId ? mockCondos.filter((c) => c.user_id === userId) : mockCondos
      setCondos(userCondos)
      setLoading(false)
    }, 500)
  }, [userId])

  const addCondo = (condo: Omit<Condo, "id" | "created_at">) => {
    const newCondo: Condo = {
      ...condo,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
    }
    setCondos((prev) => [...prev, newCondo])
    return newCondo
  }

  const updateCondo = (id: string, updates: Partial<Condo>) => {
    setCondos((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)))
  }

  const deleteCondo = (id: string) => {
    setCondos((prev) => prev.filter((c) => c.id !== id))
  }

  return { condos, loading, addCondo, updateCondo, deleteCondo }
}

// Custom hook for tenants
export function useTenants(condoId?: string) {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setTimeout(() => {
      const filteredTenants = condoId ? mockTenants.filter((t) => t.condo_id === condoId) : mockTenants
      setTenants(filteredTenants)
      setLoading(false)
    }, 500)
  }, [condoId])

  const addTenant = (tenant: Omit<Tenant, "id" | "created_at">) => {
    const newTenant: Tenant = {
      ...tenant,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      status: "active",
    }
    setTenants((prev) => [...prev, newTenant])
    return newTenant
  }

  const updateTenant = (id: string, updates: Partial<Tenant>) => {
    setTenants((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)))
  }

  const deleteTenant = (id: string) => {
    setTenants((prev) => prev.filter((t) => t.id !== id))
  }

  return { tenants, loading, addTenant, updateTenant, deleteTenant }
}

// Custom hook for rent payments
export function useRentPayments(tenantId?: string) {
  const [payments, setPayments] = useState<RentPayment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setTimeout(() => {
      const filteredPayments = tenantId ? mockRentPayments.filter((p) => p.tenant_id === tenantId) : mockRentPayments
      setPayments(filteredPayments)
      setLoading(false)
    }, 500)
  }, [tenantId])

  const addPayment = (payment: Omit<RentPayment, "id" | "created_at">) => {
    const newPayment: RentPayment = {
      ...payment,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
    }
    setPayments((prev) => [...prev, newPayment])
    return newPayment
  }

  const updatePayment = (id: string, updates: Partial<RentPayment>) => {
    setPayments((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)))
  }

  return { payments, loading, addPayment, updatePayment }
}

// Custom hook for financial records
export function useFinancialRecords(condoId?: string) {
  const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>([])
  const [expenseRecords, setExpenseRecords] = useState<ExpenseRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setTimeout(() => {
      const filteredIncome = condoId ? mockIncomeRecords.filter((r) => r.condo_id === condoId) : mockIncomeRecords
      const filteredExpenses = condoId ? mockExpenseRecords.filter((r) => r.condo_id === condoId) : mockExpenseRecords

      setIncomeRecords(filteredIncome)
      setExpenseRecords(filteredExpenses)
      setLoading(false)
    }, 500)
  }, [condoId])

  const addIncomeRecord = (record: Omit<IncomeRecord, "id" | "created_at">) => {
    const newRecord: IncomeRecord = {
      ...record,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
    }
    setIncomeRecords((prev) => [...prev, newRecord])
    return newRecord
  }

  const addExpenseRecord = (record: Omit<ExpenseRecord, "id" | "created_at">) => {
    const newRecord: ExpenseRecord = {
      ...record,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
    }
    setExpenseRecords((prev) => [...prev, newRecord])
    return newRecord
  }

  const updateIncomeRecord = (id: string, updates: Partial<IncomeRecord>) => {
    setIncomeRecords((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)))
  }

  const updateExpenseRecord = (id: string, updates: Partial<ExpenseRecord>) => {
    setExpenseRecords((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)))
  }

  const deleteIncomeRecord = (id: string) => {
    setIncomeRecords((prev) => prev.filter((r) => r.id !== id))
  }

  const deleteExpenseRecord = (id: string) => {
    setExpenseRecords((prev) => prev.filter((r) => r.id !== id))
  }

  return {
    incomeRecords,
    expenseRecords,
    loading,
    addIncomeRecord,
    addExpenseRecord,
    updateIncomeRecord,
    updateExpenseRecord,
    deleteIncomeRecord,
    deleteExpenseRecord,
  }
}
