"use client"

import { useState, useMemo } from "react"
import { BarChart3, PieChart, TrendingUp, Download, Filter, DollarSign, Home } from "lucide-react"
import { MainLayout } from "@/components/layout/main-layout"
import { StatsCard } from "@/components/ui/stats-card"
import { DataTable } from "@/components/ui/data-table"
import { useAuth } from "@/lib/auth-context"
import { useCondosDB, useTenantsDB, useRentPaymentsDB, useFinancialRecordsDB } from "@/lib/hooks/use-database"
import { Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, Tooltip, Pie, Cell } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import { BarChart } from "recharts"

export default function ReportsPage() {
  const { user } = useAuth()
  const [selectedPeriod, setSelectedPeriod] = useState("current-month")
  const [selectedReport, setSelectedReport] = useState("income-expense")

  const { condos } = useCondosDB(user?.id)
  const { tenants } = useTenantsDB(user?.id)
  const { payments } = useRentPaymentsDB(user?.id)
  const { incomeRecords, expenseRecords } = useFinancialRecordsDB(user?.id)

  // Filter data based on selected period (for summary stats and charts)
  const filteredIncomeRecords = useMemo(() => {
    const now = new Date()
    return incomeRecords.filter((record) => {
      const recordDate = new Date(record.date)
      if (selectedPeriod === "current-month") {
        return recordDate.getMonth() === now.getMonth() && recordDate.getFullYear() === now.getFullYear()
      } else if (selectedPeriod === "last-month") {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        return recordDate.getMonth() === lastMonth.getMonth() && recordDate.getFullYear() === lastMonth.getFullYear()
      } else if (selectedPeriod === "current-year") {
        return recordDate.getFullYear() === now.getFullYear()
      } else if (selectedPeriod === "last-year") {
        return recordDate.getFullYear() === now.getFullYear() - 1
      }
      return true // "all" or default
    })
  }, [incomeRecords, selectedPeriod])

  const filteredExpenseRecords = useMemo(() => {
    const now = new Date()
    return expenseRecords.filter((record) => {
      const recordDate = new Date(record.date)
      if (selectedPeriod === "current-month") {
        return recordDate.getMonth() === now.getMonth() && recordDate.getFullYear() === now.getFullYear()
      } else if (selectedPeriod === "last-month") {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        return recordDate.getMonth() === lastMonth.getMonth() && recordDate.getFullYear() === lastMonth.getFullYear()
      } else if (selectedPeriod === "current-year") {
        return recordDate.getFullYear() === now.getFullYear()
      } else if (selectedPeriod === "last-year") {
        return recordDate.getFullYear() === now.getFullYear() - 1
      }
      return true // "all" or default
    })
  }, [expenseRecords, selectedPeriod])

  const filteredPayments = useMemo(() => {
    const now = new Date()
    return payments.filter((payment) => {
      const paymentDate = new Date(payment.due_date) // Use due_date for filtering period
      if (selectedPeriod === "current-month") {
        return paymentDate.getMonth() === now.getMonth() && paymentDate.getFullYear() === now.getFullYear()
      } else if (selectedPeriod === "last-month") {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        return paymentDate.getMonth() === lastMonth.getMonth() && paymentDate.getFullYear() === lastMonth.getFullYear()
      } else if (selectedPeriod === "current-year") {
        return paymentDate.getFullYear() === now.getFullYear()
      } else if (selectedPeriod === "last-year") {
        return paymentDate.getFullYear() === now.getFullYear() - 1
      }
      return true // "all" or default
    })
  }, [payments, selectedPeriod])

  // Calculate financial data for summary
  const totalIncome = filteredIncomeRecords.reduce((sum, record) => sum + record.amount, 0)
  const totalExpenses = filteredExpenseRecords.reduce((sum, record) => sum + record.amount, 0)
  const netIncome = totalIncome - totalExpenses

  // Payment statistics for summary and pie chart
  const paidPayments = filteredPayments.filter((p) => p.status === "paid")
  const unpaidPayments = filteredPayments.filter((p) => p.status === "unpaid")
  const overduePayments = filteredPayments.filter((p) => p.status === "overdue")

  const paymentStatusData = [
    { name: "ชำระแล้ว", value: paidPayments.length, color: "hsl(var(--chart-1))" }, // Green
    { name: "ยังไม่ชำระ", value: unpaidPayments.length, color: "hsl(var(--chart-2))" }, // Yellow
    { name: "เกินกำหนด", value: overduePayments.length, color: "hsl(var(--chart-3))" }, // Red
  ]

  // Occupancy rate
  const totalUnits = condos.length
  const occupiedUnits = tenants.filter((t) => t.is_active).length
  const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0

  // Monthly income/expense data for chart
  const monthlyFinancials = useMemo(() => {
    const dataMap = new Map<string, { income: number; expense: number }>()
    const now = new Date()
    const currentYear = now.getFullYear()

    // Determine the year range for the chart based on selectedPeriod
    let startYear = currentYear
    let endYear = currentYear
    if (selectedPeriod === "last-year") {
      startYear = currentYear - 1
      endYear = currentYear - 1
    } else if (selectedPeriod === "all") {
      // Find min/max year from all records
      const allYears = new Set<number>()
      incomeRecords.forEach((r) => allYears.add(new Date(r.date).getFullYear()))
      expenseRecords.forEach((r) => allYears.add(new Date(r.date).getFullYear()))
      if (allYears.size > 0) {
        startYear = Math.min(...Array.from(allYears))
        endYear = Math.max(...Array.from(allYears))
      }
    }

    // Initialize map for all months in the relevant year(s)
    for (let y = startYear; y <= endYear; y++) {
      for (let i = 0; i < 12; i++) {
        const monthKey = `${y}-${(i + 1).toString().padStart(2, "0")}`
        dataMap.set(monthKey, { income: 0, expense: 0 })
      }
    }

    // Populate data for income
    incomeRecords.forEach((record) => {
      const recordDate = new Date(record.date)
      const recordYear = recordDate.getFullYear()
      const recordMonth = (recordDate.getMonth() + 1).toString().padStart(2, "0")
      const monthKey = `${recordYear}-${recordMonth}`

      // Filter by selected period for chart data
      if (
        selectedPeriod === "current-month" &&
        !(recordDate.getMonth() === now.getMonth() && recordDate.getFullYear() === now.getFullYear())
      )
        return
      if (
        selectedPeriod === "last-month" &&
        !(
          recordDate.getMonth() === (now.getMonth() - 1 + 12) % 12 &&
          recordDate.getFullYear() === (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear())
        )
      )
        return
      if (selectedPeriod === "current-year" && recordYear !== currentYear) return
      if (selectedPeriod === "last-year" && recordYear !== currentYear - 1) return
      // For "all", no date filtering here, it's handled by the map initialization

      const current = dataMap.get(monthKey) || { income: 0, expense: 0 }
      dataMap.set(monthKey, { ...current, income: current.income + record.amount })
    })

    // Populate data for expenses
    expenseRecords.forEach((record) => {
      const recordDate = new Date(record.date)
      const recordYear = recordDate.getFullYear()
      const recordMonth = (recordDate.getMonth() + 1).toString().padStart(2, "0")
      const monthKey = `${recordYear}-${recordMonth}`

      // Filter by selected period for chart data
      if (
        selectedPeriod === "current-month" &&
        !(recordDate.getMonth() === now.getMonth() && recordDate.getFullYear() === now.getFullYear())
      )
        return
      if (
        selectedPeriod === "last-month" &&
        !(
          recordDate.getMonth() === (now.getMonth() - 1 + 12) % 12 &&
          recordDate.getFullYear() === (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear())
        )
      )
        return
      if (selectedPeriod === "current-year" && recordYear !== currentYear) return
      if (selectedPeriod === "last-year" && recordYear !== currentYear - 1) return

      const current = dataMap.get(monthKey) || { income: 0, expense: 0 }
      dataMap.set(monthKey, { ...current, expense: current.expense + record.amount })
    })

    const sortedData = Array.from(dataMap.entries())
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([key, value]) => {
        const [year, monthNum] = key.split("-").map(Number)
        const monthName = format(new Date(year, monthNum - 1, 1), "MMM", { locale: th })
        return {
          month: monthName,
          income: value.income,
          expense: value.expense,
        }
      })
    return sortedData
  }, [incomeRecords, expenseRecords, selectedPeriod])

  // Tenant payment history columns
  const tenantPaymentColumns = [
    {
      key: "tenant_name",
      header: "ผู้เช่า",
      render: (payment: any) => {
        const tenant = tenants.find((t) => t.id === payment.tenant_id)
        return tenant?.full_name || "ไม่ทราบ"
      },
    },
    {
      key: "condo",
      header: "ห้อง",
      render: (payment: any) => {
        const tenant = tenants.find((t) => t.id === payment.tenant_id)
        const condo = tenant ? condos.find((c) => c.id === tenant.condo_id) : null
        return condo ? `${condo.name} (${condo.room_number})` : "ไม่ทราบ"
      },
    },
    {
      key: "amount",
      header: "จำนวนเงิน",
      render: (payment: any) => `฿${payment.amount.toLocaleString()}`,
    },
    {
      key: "due_date",
      header: "วันครบกำหนด",
      render: (payment: any) => new Date(payment.due_date).toLocaleDateString("th-TH"),
    },
    {
      key: "paid_date",
      header: "วันที่ชำระ",
      render: (payment: any) => (payment.paid_date ? new Date(payment.paid_date).toLocaleDateString("th-TH") : "-"),
    },
    {
      key: "status",
      header: "สถานะ",
      render: (payment: any) => {
        const statusColors = {
          paid: "bg-green-900 text-green-300",
          unpaid: "bg-yellow-900 text-yellow-300",
          overdue: "bg-red-900 text-red-300",
        }
        const statusText = {
          paid: "ชำระแล้ว",
          unpaid: "ยังไม่ชำระ",
          overdue: "เกินกำหนด",
        }
        return (
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[payment.status as keyof typeof statusColors]}`}
          >
            {statusText[payment.status as keyof typeof statusText]}
          </span>
        )
      },
    },
  ]

  // Property performance data columns
  const propertyPerformanceColumns = [
    {
      key: "name",
      header: "คอนโด",
      render: (condo: any) => `${condo.name} (${condo.room_number})`,
    },
    {
      key: "tenant",
      header: "ผู้เช่าปัจจุบัน",
      render: (condo: any) => {
        const tenant = tenants.find((t) => t.condo_id === condo.id && t.is_active)
        return tenant ? tenant.full_name : "ว่าง"
      },
    },
    {
      key: "monthly_rent",
      header: "ค่าเช่า/เดือน",
      render: (condo: any) => {
        const tenant = tenants.find((t) => t.condo_id === condo.id && t.is_active)
        return tenant ? `฿${tenant.monthly_rent.toLocaleString()}` : "-"
      },
    },
    {
      key: "occupancy_months",
      header: "เช่าแล้ว (เดือน)",
      render: (condo: any) => {
        const tenant = tenants.find((t) => t.condo_id === condo.id && t.is_active)
        if (!tenant) return "0"
        const startDate = new Date(tenant.rental_start)
        const today = new Date()
        const months = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
        return months.toString()
      },
    },
    {
      key: "total_income",
      header: "รายได้รวม",
      render: (condo: any) => {
        const income = incomeRecords.filter((r) => r.condo_id === condo.id).reduce((sum, r) => sum + r.amount, 0)
        return `฿${income.toLocaleString()}`
      },
    },
  ]

  const exportReport = () => {
    // Simulate report export
    alert("กำลังส่งออกรายงาน...")
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">รายงาน</h1>
            <p className="text-gray-400">รายงานและสถิติการจัดการคอนโด</p>
          </div>
          <div className="flex space-x-3">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="current-month">เดือนปัจจุบัน</option>
              <option value="last-month">เดือนที่แล้ว</option>
              <option value="current-year">ปีปัจจุบัน</option>
              <option value="last-year">ปีที่แล้ว</option>
              <option value="all">ทั้งหมด</option>
            </select>
            <button
              onClick={exportReport}
              className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              ส่งออกรายงาน
            </button>
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="รายได้รวม"
            value={`฿${totalIncome.toLocaleString()}`}
            icon={TrendingUp}
            trend={{ value: 0, isPositive: true }} // Trend value is placeholder, actual trend calculation is complex
          />
          <StatsCard
            title="ค่าใช้จ่ายรวม"
            value={`฿${totalExpenses.toLocaleString()}`}
            icon={BarChart3}
            trend={{ value: 0, isPositive: false }}
          />
          <StatsCard
            title="กำไรสุทธิ"
            value={`฿${netIncome.toLocaleString()}`}
            icon={DollarSign}
            trend={{ value: 0, isPositive: netIncome >= 0 }}
          />
          <StatsCard
            title="อัตราการเช่า"
            value={`${occupancyRate.toFixed(1)}%`}
            icon={Home}
            trend={{ value: 0, isPositive: true }}
          />
        </div>

        {/* Monthly Income/Expense Chart */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-medium text-white mb-4">
            รายรับ-รายจ่ายรายเดือน (
            {selectedPeriod === "current-year"
              ? new Date().getFullYear() + 543
              : selectedPeriod === "last-year"
                ? new Date().getFullYear() - 1 + 543
                : "ทุกปี"}
            )
          </h3>
          <ChartContainer
            config={{
              income: {
                label: "รายรับ",
                color: "hsl(var(--chart-1))", // Green
              },
              expense: {
                label: "รายจ่าย",
                color: "hsl(var(--chart-2))", // Red
              },
            }}
            className="h-[300px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyFinancials} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" />
                <XAxis
                  dataKey="month"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `฿${value.toLocaleString()}`}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar dataKey="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="var(--color-expense)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        {/* Payment Status Pie Chart */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-medium text-white mb-4">สถานะการชำระค่าเช่า</h3>
          <ChartContainer
            config={{
              ชำระแล้ว: { label: "ชำระแล้ว", color: "hsl(var(--chart-1))" },
              ยังไม่ชำระ: { label: "ยังไม่ชำระ", color: "hsl(var(--chart-2))" },
              เกินกำหนด: { label: "เกินกำหนด", color: "hsl(var(--chart-3))" },
            }}
            className="h-[300px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                <Pie
                  data={paymentStatusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {paymentStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        {/* Report Sections */}
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={selectedReport}
              onChange={(e) => setSelectedReport(e.target.value)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="income-expense">รายงานรายได้-ค่าใช้จ่าย</option>
              <option value="payment-history">ประวัติการชำระเงิน</option>
              <option value="property-performance">ผลการดำเนินงานแต่ละห้อง</option>
              <option value="tenant-summary">สรุปผู้เช่า</option>
            </select>
          </div>

          {selectedReport === "income-expense" && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white">รายงานรายได้-ค่าใช้จ่าย</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                  <h4 className="text-lg font-medium text-white mb-4">รายการรายรับ</h4>
                  <DataTable
                    data={filteredIncomeRecords}
                    columns={[
                      {
                        key: "date",
                        header: "วันที่",
                        render: (record: any) => format(new Date(record.date), "dd/MM/yyyy", { locale: th }),
                      },
                      { key: "category", header: "หมวดหมู่" },
                      {
                        key: "amount",
                        header: "จำนวนเงิน",
                        render: (record: any) => `฿${record.amount.toLocaleString()}`,
                      },
                    ]}
                    emptyMessage="ไม่พบรายการรายรับ"
                    itemsPerPage={5}
                    showPagination={true}
                  />
                </div>
                <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                  <h4 className="text-lg font-medium text-white mb-4">รายการรายจ่าย</h4>
                  <DataTable
                    data={filteredExpenseRecords}
                    columns={[
                      {
                        key: "date",
                        header: "วันที่",
                        render: (record: any) => format(new Date(record.date), "dd/MM/yyyy", { locale: th }),
                      },
                      { key: "category", header: "หมวดหมู่" },
                      {
                        key: "amount",
                        header: "จำนวนเงิน",
                        render: (record: any) => `฿${record.amount.toLocaleString()}`,
                      },
                    ]}
                    emptyMessage="ไม่พบรายการรายจ่าย"
                    itemsPerPage={5}
                    showPagination={true}
                  />
                </div>
              </div>
            </div>
          )}

          {selectedReport === "payment-history" && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white">ประวัติการชำระเงิน</h3>
              <DataTable
                data={filteredPayments}
                columns={tenantPaymentColumns}
                emptyMessage="ไม่พบประวัติการชำระเงิน"
                itemsPerPage={10}
                showPagination={true}
              />
            </div>
          )}

          {selectedReport === "property-performance" && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white">ผลการดำเนินงานแต่ละห้อง</h3>
              <DataTable
                data={condos}
                columns={propertyPerformanceColumns}
                emptyMessage="ไม่พบข้อมูลคอนโด"
                itemsPerPage={10}
                showPagination={true}
              />
            </div>
          )}

          {selectedReport === "tenant-summary" && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white">สรุปผู้เช่า</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                  <h4 className="text-lg font-medium text-white mb-4">ผู้เช่าปัจจุบัน</h4>
                  <div className="space-y-2">
                    {tenants
                      .filter((t) => t.is_active)
                      .map((tenant) => {
                        const condo = condos.find((c) => c.id === tenant.condo_id)
                        return (
                          <div key={tenant.id} className="flex justify-between items-center">
                            <span className="text-gray-300">{tenant.full_name}</span>
                            <span className="text-sm text-gray-400">
                              {condo?.name} ({condo?.room_number})
                            </span>
                          </div>
                        )
                      })}
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                  <h4 className="text-lg font-medium text-white mb-4">ห้องว่าง</h4>
                  <div className="space-y-2">
                    {condos
                      .filter((condo) => !tenants.some((t) => t.condo_id === condo.id && t.is_active))
                      .map((condo) => (
                        <div key={condo.id} className="flex justify-between items-center">
                          <span className="text-gray-300">{condo.name}</span>
                          <span className="text-sm text-gray-400">({condo.room_number})</span>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                  <h4 className="text-lg font-medium text-white mb-4">สัญญาใกล้หมดอายุ</h4>
                  <div className="space-y-2">
                    {tenants
                      .filter((tenant) => {
                        const endDate = new Date(tenant.rental_end)
                        const today = new Date()
                        const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                        return daysUntilExpiry <= 30 && daysUntilExpiry > 0 && tenant.is_active
                      })
                      .map((tenant) => {
                        const endDate = new Date(tenant.rental_end)
                        const today = new Date()
                        const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                        return (
                          <div key={tenant.id} className="flex justify-between items-center">
                            <span className="text-gray-300">{tenant.full_name}</span>
                            <span className="text-sm text-yellow-400">{daysUntilExpiry} วัน</span>
                          </div>
                        )
                      })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
