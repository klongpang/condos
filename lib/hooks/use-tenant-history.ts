"use client"

import { useState, useEffect } from "react"
import type { TenantHistory, Tenant } from "../supabase"
import { mockTenantHistory } from "../mock-data"

export function useTenantHistory(condoId?: string) {
  const [tenantHistory, setTenantHistory] = useState<TenantHistory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setTimeout(() => {
      const filteredHistory = condoId ? mockTenantHistory.filter((h) => h.condo_id === condoId) : mockTenantHistory
      setTenantHistory(filteredHistory)
      setLoading(false)
    }, 500)
  }, [condoId])

  const addTenantHistory = (history: Omit<TenantHistory, "id" | "created_at" | "moved_out_at">) => {
    const newHistory: TenantHistory = {
      ...history,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      moved_out_at: new Date().toISOString(),
    }
    setTenantHistory((prev) => [...prev, newHistory])
    return newHistory
  }

  const endTenantContract = (
    tenant: Tenant,
    endReason: "expired" | "early_termination" | "changed_tenant",
    actualEndDate: string,
    notes?: string,
  ) => {
    // สร้างประวัติผู้เช่า
    const historyRecord: Omit<TenantHistory, "id" | "created_at" | "moved_out_at"> = {
      condo_id: tenant.condo_id,
      full_name: tenant.full_name,
      phone: tenant.phone,
      line_id: tenant.line_id,
      rental_start: tenant.rental_start,
      rental_end: tenant.rental_end,
      actual_end_date: actualEndDate,
      deposit: tenant.deposit,
      monthly_rent: tenant.monthly_rent,
      end_reason: endReason,
      notes: notes,
    }

    return addTenantHistory(historyRecord)
  }

  return {
    tenantHistory,
    loading,
    addTenantHistory,
    endTenantContract,
  }
}

export default useTenantHistory
