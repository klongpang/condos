"use client"

import { useState, useMemo } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { useAuth } from "@/lib/auth-context"
import { useCondos, useRentPayments, useFinancialRecords } from "@/lib/hooks/use-queries"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import { Filter, DollarSign, TrendingUp, TrendingDown } from "lucide-react" // Import new icons
import { StatsCard } from "@/components/ui/stats-card" // Import StatsCard

export default function ReportsPage() {
  const { user } = useAuth()
  const { incomeRecords, expenseRecords, loading: financialsLoading } = useFinancialRecords(user?.id)
  const { payments, loading: paymentsLoading } = useRentPayments(user?.id)
  const { condos, loading: condosLoading } = useCondos(user?.id)

  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())
  const [selectedMonth, setSelectedMonth] = useState<string>("all") // New state for month filter
  const [selectedCondoFilter, setSelectedCondoFilter] = useState<string>("all")

  // Generate month options in Thai
  const monthOptions = [
    { value: "01", label: "มกราคม" },
    { value: "02", label: "กุมภาพันธ์" },
    { value: "03", label: "มีนาคม" },
    { value: "04", label: "เมษายน" },
    { value: "05", label: "พฤษภาคม" },
    { value: "06", label: "มิถุนายน" },
    { value: "07", label: "กรกฎาคม" },
    { value: "08", label: "สิงหาคม" },
    { value: "09", label: "กันยายน" },
    { value: "10", label: "ตุลาคม" },
    { value: "11", label: "พฤศจิกายน" },
    { value: "12", label: "ธันวาคม" },
  ]

  // Memoized filtered financial records based on year, month, and condo
  const filteredFinancialRecords = useMemo(() => {
    return {
      income: incomeRecords.filter((record) => {
        const recordDate = new Date(record.date)
        const recordYear = recordDate.getFullYear().toString()
        const recordMonth = (recordDate.getMonth() + 1).toString().padStart(2, "0") // Ensure 2 digits
        const yearMatch = selectedYear === "all" || recordYear === selectedYear
        const monthMatch = selectedMonth === "all" || recordMonth === selectedMonth
        const condoMatch = selectedCondoFilter === "all" || record.condo_id === selectedCondoFilter
        return yearMatch && monthMatch && condoMatch
      }),
      expense: expenseRecords.filter((record) => {
        const recordDate = new Date(record.date)
        const recordYear = recordDate.getFullYear().toString()
        const recordMonth = (recordDate.getMonth() + 1).toString().padStart(2, "0") // Ensure 2 digits
        const yearMatch = selectedYear === "all" || recordYear === selectedYear
        const monthMatch = selectedMonth === "all" || recordMonth === selectedMonth
        const condoMatch = selectedCondoFilter === "all" || record.condo_id === selectedCondoFilter
        return yearMatch && monthMatch && condoMatch
      }),
    }
  }, [incomeRecords, expenseRecords, selectedYear, selectedMonth, selectedCondoFilter])

  // Memoized filtered payments based on year, month, and condo
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const paymentDate = new Date(p.due_date)
      const paymentYear = paymentDate.getFullYear().toString()
      const paymentMonth = (paymentDate.getMonth() + 1).toString().padStart(2, "0") // Ensure 2 digits
      const yearMatch = selectedYear === "all" || paymentYear === selectedYear
      const monthMatch = selectedMonth === "all" || paymentMonth === selectedMonth
      const condoMatch = selectedCondoFilter === "all" || p.tenant?.condo_id === selectedCondoFilter
      return yearMatch && monthMatch && condoMatch
    })
  }, [payments, selectedYear, selectedMonth, selectedCondoFilter])

  // Monthly Financial Data for Bar Chart
  const monthlyFinancialData = useMemo(() => {
    const dataMap = new Map<string, { name: string; income: number; expense: number }>()

    // Initialize dataMap with all months for the selected year
    for (let i = 0; i < 12; i++) {
      const monthValue = (i + 1).toString().padStart(2, "0")
      const monthName = format(new Date(Number.parseInt(selectedYear), i, 1), "MMMM", { locale: th })
      dataMap.set(monthValue, { name: monthName, income: 0, expense: 0 })
    }

    // Populate data for income
    filteredFinancialRecords.income.forEach((record) => {
      const monthValue = (new Date(record.date).getMonth() + 1).toString().padStart(2, "0")
      const currentMonthData = dataMap.get(monthValue)
      if (currentMonthData) {
        currentMonthData.income += record.amount
      }
    })

    // Populate data for expenses
    filteredFinancialRecords.expense.forEach((record) => {
      const monthValue = (new Date(record.date).getMonth() + 1).toString().padStart(2, "0")
      const currentMonthData = dataMap.get(monthValue)
      if (currentMonthData) {
        currentMonthData.expense += record.amount
      }
    })

    // Convert map to array and sort by month number
    return Array.from(dataMap.entries())
      .sort(([monthA], [monthB]) => Number.parseInt(monthA) - Number.parseInt(monthB))
      .map(([, value]) => value)
  }, [filteredFinancialRecords.income, filteredFinancialRecords.expense, selectedYear])

  // Payment Status Data for Pie Chart
  const paymentStatusData = useMemo(() => {
    const statusCounts = {
      paid: 0,
      unpaid: 0,
      overdue: 0,
    }

    filteredPayments.forEach((payment) => {
      statusCounts[payment.status]++
    })

    return [
      { name: "ชำระแล้ว", value: statusCounts.paid, color: "#22c55e" }, // green-500
      { name: "ยังไม่ชำระ", value: statusCounts.unpaid, color: "#eab308" }, // yellow-500
      { name: "เกินกำหนด", value: statusCounts.overdue, color: "#ef4444" }, // red-500
    ]
  }, [filteredPayments])

  // Income by Category Data for Pie Chart
  const incomeByCategoryData = useMemo(() => {
    const categoryMap = new Map<string, number>()
    filteredFinancialRecords.income.forEach((record) => {
      const category = record.category || "ไม่ระบุ"
      categoryMap.set(category, (categoryMap.get(category) || 0) + record.amount)
    })
    return Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }))
  }, [filteredFinancialRecords.income])

  // Expense by Category Data for Pie Chart
  const expenseByCategoryData = useMemo(() => {
    const categoryMap = new Map<string, number>()
    filteredFinancialRecords.expense.forEach((record) => {
      const category = record.category || "ไม่ระบุ"
      categoryMap.set(category, (categoryMap.get(category) || 0) + record.amount)
    })
    return Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }))
  }, [filteredFinancialRecords.expense])

  // Available Years for filter - always include current year
  const availableYears = useMemo(() => {
    const years = new Set<number>()
    // Always add current year so it's selectable even if no data exists
    years.add(new Date().getFullYear())
    incomeRecords.forEach((r) => years.add(new Date(r.date).getFullYear()))
    expenseRecords.forEach((r) => years.add(new Date(r.date).getFullYear()))
    payments.forEach((p) => years.add(new Date(p.due_date).getFullYear()))
    return Array.from(years).sort((a, b) => b - a)
  }, [incomeRecords, expenseRecords, payments])

  // Financial Summary
  const totalIncome = filteredFinancialRecords.income.reduce((sum, record) => sum + record.amount, 0)
  const totalExpenses = filteredFinancialRecords.expense.reduce((sum, record) => sum + record.amount, 0)
  const netIncome = totalIncome - totalExpenses

  // Colors for Pie Charts (can be expanded)
  const PIE_COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ffc658", "#a4de6c"]

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">รายงานและสถิติ</h1>
          <p className="text-gray-400">ภาพรวมการเงินและสถานะการชำระค่าเช่า</p>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 flex flex-wrap items-center gap-4">
          <Filter className="h-5 w-5 text-gray-400" />
          <div>
            <label className="text-sm font-medium text-gray-300 mr-2">ปี:</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {availableYears.length > 0 ? (
                availableYears.map((year) => (
                  <option key={year} value={year.toString()}>
                    {year + 543}
                  </option>
                ))
              ) : (
                <option value={new Date().getFullYear().toString()}>{new Date().getFullYear() + 543}</option>
              )}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-300 mr-2">เดือน:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">ทั้งหมด</option>
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-300 mr-2">คอนโด:</label>
            <select
              value={selectedCondoFilter}
              onChange={(e) => setSelectedCondoFilter(e.target.value)}
              className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">ทั้งหมด</option>
              {condos.map((condo) => (
                <option key={condo.id} value={condo.id}>
                  {condo.name} ({condo.room_number})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCard
            title="รายรับรวม"
            value={`฿${totalIncome.toLocaleString()}`}
            icon={TrendingUp}
            className="bg-green-900/20 border-green-700"
            loading={financialsLoading}
          />
          <StatsCard
            title="รายจ่ายรวม"
            value={`฿${totalExpenses.toLocaleString()}`}
            icon={TrendingDown}
            className="bg-red-900/20 border-red-700"
            loading={financialsLoading}
          />
          <StatsCard
            title="กำไรสุทธิ"
            value={`฿${netIncome.toLocaleString()}`}
            icon={DollarSign}
            className={netIncome >= 0 ? "bg-blue-900/20 border-blue-700" : "bg-red-900/20 border-red-700"}
            loading={financialsLoading}
          />
        </div>

        {/* Monthly Financial Chart */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            รายรับและรายจ่ายรายเดือน ({Number.parseInt(selectedYear) + 543})
          </h2>
          {financialsLoading ? (
            <div className="text-gray-400 text-center py-10">กำลังโหลดข้อมูล...</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={monthlyFinancialData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
                <XAxis dataKey="name" stroke="#cbd5e0" />
                <YAxis stroke="#cbd5e0" tickFormatter={(value) => `฿${value.toLocaleString()}`} />
                <Tooltip
                  formatter={(value: number) => `฿${value.toLocaleString()}`}
                  contentStyle={{ backgroundColor: "#2d3748", border: "none", borderRadius: "8px" }}
                  labelStyle={{ color: "#cbd5e0" }}
                  itemStyle={{ color: "#cbd5e0" }}
                />
                <Legend wrapperStyle={{ color: "#cbd5e0" }} />
                <Bar dataKey="income" name="รายรับ" fill="#22c55e" /> {/* green-500 */}
                <Bar dataKey="expense" name="รายจ่าย" fill="#ef4444" /> {/* red-500 */}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Income and Expense by Category Pie Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              รายรับตามหมวดหมู่ ({Number.parseInt(selectedYear) + 543}
              {selectedMonth !== "all" && ` - ${monthOptions.find((m) => m.value === selectedMonth)?.label}`})
            </h2>
            {financialsLoading ? (
              <div className="text-gray-400 text-center py-10">กำลังโหลดข้อมูล...</div>
            ) : incomeByCategoryData.length === 0 ? (
              <div className="text-gray-400 text-center py-10">ไม่พบข้อมูลรายรับสำหรับตัวกรองที่เลือก</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={incomeByCategoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {incomeByCategoryData.map((entry, index) => (
                      <Cell key={`cell-income-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [`฿${value.toLocaleString()}`, name]}
                    contentStyle={{ backgroundColor: "#2d3748", border: "none", borderRadius: "8px" }}
                    labelStyle={{ color: "#cbd5e0" }}
                    itemStyle={{ color: "#cbd5e0" }}
                  />
                  <Legend wrapperStyle={{ color: "#cbd5e0" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              รายจ่ายตามหมวดหมู่ ({Number.parseInt(selectedYear) + 543}
              {selectedMonth !== "all" && ` - ${monthOptions.find((m) => m.value === selectedMonth)?.label}`})
            </h2>
            {financialsLoading ? (
              <div className="text-gray-400 text-center py-10">กำลังโหลดข้อมูล...</div>
            ) : expenseByCategoryData.length === 0 ? (
              <div className="text-gray-400 text-center py-10">ไม่พบข้อมูลรายจ่ายสำหรับตัวกรองที่เลือก</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={expenseByCategoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {expenseByCategoryData.map((entry, index) => (
                      <Cell key={`cell-expense-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [`฿${value.toLocaleString()}`, name]}
                    contentStyle={{ backgroundColor: "#2d3748", border: "none", borderRadius: "8px" }}
                    labelStyle={{ color: "#cbd5e0" }}
                    itemStyle={{ color: "#cbd5e0" }}
                  />
                  <Legend wrapperStyle={{ color: "#cbd5e0" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Payment Status Pie Chart */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            สถานะการชำระค่าเช่า ({Number.parseInt(selectedYear) + 543}
            {selectedMonth !== "all" && ` - ${monthOptions.find((m) => m.value === selectedMonth)?.label}`})
          </h2>
          {paymentsLoading ? (
            <div className="text-gray-400 text-center py-10">กำลังโหลดข้อมูล...</div>
          ) : paymentStatusData.every((d) => d.value === 0) ? (
            <div className="text-gray-400 text-center py-10">ไม่พบข้อมูลการชำระค่าเช่าสำหรับตัวกรองที่เลือก</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={paymentStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {paymentStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [`${value.toLocaleString()} รายการ`, name]}
                  contentStyle={{ backgroundColor: "#2d3748", border: "none", borderRadius: "8px" }}
                  labelStyle={{ color: "#cbd5e0" }}
                  itemStyle={{ color: "#cbd5e0" }}
                />
                <Legend wrapperStyle={{ color: "#cbd5e0" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
