"use client"

import { useState, useMemo } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { useAuth } from "@/lib/auth-context"
import { useCondos, useRentPayments, useFinancialRecords, useTenants } from "@/lib/hooks/use-queries"
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
import { Filter, DollarSign, TrendingUp, TrendingDown, Wallet, BarChart3 } from "lucide-react"
import { StatsCard } from "@/components/ui/stats-card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Static data hoisted outside component to prevent recreation on every render
// See: Vercel Best Practices - rendering-hoist-jsx
const MONTH_OPTIONS_REPORT = [
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
];

export default function ReportsPage() {
  const { user } = useAuth()
  const { incomeRecords, expenseRecords, loading: financialsLoading } = useFinancialRecords(user?.id)
  const { payments, loading: paymentsLoading } = useRentPayments(user?.id)
  const { condos, loading: condosLoading } = useCondos(user?.id)
  const { tenants, loading: tenantsLoading } = useTenants(user?.id)

  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())
  const [selectedMonth, setSelectedMonth] = useState<string>("all") // New state for month filter
  const [selectedCondoFilter, setSelectedCondoFilter] = useState<string>("all")


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

    // Use current year for month labels when "all" is selected
    const yearForLabels = selectedYear === "all" ? new Date().getFullYear() : Number.parseInt(selectedYear)

    // Initialize dataMap with all months for the selected year
    for (let i = 0; i < 12; i++) {
      const monthValue = (i + 1).toString().padStart(2, "0")
      const monthName = format(new Date(yearForLabels, i, 1), "MMMM", { locale: th })
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
    ].filter((item) => item.value > 0) // กรองรายการที่มีค่า 0 ออก
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

  // Available Years for filter - always include current year, filter out invalid years (e.g., Buddhist Era stored incorrectly)
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear()
    const years = new Set<number>()
    // Always add current year so it's selectable even if no data exists
    years.add(currentYear)
    
    // Helper to add year only if valid (CE years between 2000 and currentYear + 1)
    const addIfValid = (year: number) => {
      if (year >= 2000 && year <= currentYear + 1) {
        years.add(year)
      }
    }
    
    incomeRecords.forEach((r) => addIfValid(new Date(r.date).getFullYear()))
    expenseRecords.forEach((r) => addIfValid(new Date(r.date).getFullYear()))
    payments.forEach((p) => addIfValid(new Date(p.due_date).getFullYear()))
    return Array.from(years).sort((a, b) => b - a)
  }, [incomeRecords, expenseRecords, payments])

  // Financial Summary
  const totalIncome = filteredFinancialRecords.income.reduce((sum, record) => sum + record.amount, 0)
  const totalExpenses = filteredFinancialRecords.expense.reduce((sum, record) => sum + record.amount, 0)
  const netIncome = totalIncome - totalExpenses

  // Installment vs Rent Analysis - เงินออกเพิ่มต่อเดือน
  const installmentAnalysis = useMemo(() => {
    return condos.map((condo) => {
      const activeTenant = tenants.find(
        (t) => t.condo_id === condo.id && t.is_active
      );
      const installment = condo.installment_amount || 0;
      const rent = activeTenant?.monthly_rent || 0;
      const difference = installment - rent;
      
      return {
        condoId: condo.id,
        condoName: condo.name,
        roomNumber: condo.room_number,
        installment,
        rent,
        difference,
        hasTenant: !!activeTenant,
        tenantName: activeTenant?.full_name || "-",
      };
    });
  }, [condos, tenants]);

  // Summary totals
  const totalInstallment = installmentAnalysis.reduce((sum, item) => sum + item.installment, 0);
  const totalRent = installmentAnalysis.reduce((sum, item) => sum + item.rent, 0);
  const totalDifference = totalInstallment - totalRent;

  // Colors for Pie Charts (can be expanded)
  const PIE_COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ffc658", "#a4de6c"]

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">รายงานและสถิติ</h1>
          <p className="text-sm sm:text-base text-gray-400">ภาพรวมการเงินและสถานะการชำระค่าเช่า</p>
        </div>

        {/* Tabs for different report sections */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-800 p-1 border border-gray-600 rounded-lg mb-4 sm:mb-6">
            <TabsTrigger 
              value="overview"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <BarChart3 className="h-4 w-4" />
              ภาพรวม
            </TabsTrigger>
            <TabsTrigger 
              value="analysis"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Wallet className="h-4 w-4" />
              วิเคราะห์
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 sm:space-y-6">
            {/* Filters - inside Overview tab */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-3 sm:p-4 flex flex-wrap items-center gap-2 sm:gap-4">
              <Filter className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 hidden sm:block" />
              <div className="flex items-center gap-1 sm:gap-2">
                <label className="text-xs sm:text-sm font-medium text-gray-300">ปี:</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="px-2 py-1 sm:px-3 bg-gray-700 border border-gray-600 rounded text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="all">ทุกปี</option>
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
              <div className="flex items-center gap-1 sm:gap-2">
                <label className="text-xs sm:text-sm font-medium text-gray-300">เดือน:</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-2 py-1 sm:px-3 bg-gray-700 border border-gray-600 rounded text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="all">ทั้งหมด</option>
                  {MONTH_OPTIONS_REPORT.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <label className="text-xs sm:text-sm font-medium text-gray-300">คอนโด:</label>
                <select
                  value={selectedCondoFilter}
                  onChange={(e) => setSelectedCondoFilter(e.target.value)}
                  className="px-2 py-1 sm:px-3 bg-gray-700 border border-gray-600 rounded text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-green-500 max-w-[100px] sm:max-w-none"
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
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
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 sm:p-6">
          <h2 className="text-base sm:text-xl font-semibold text-white mb-3 sm:mb-4">
            รายรับและรายจ่ายรายเดือน {selectedYear === "all" ? "(ทุกปี)" : `(${Number.parseInt(selectedYear) + 543})`}
          </h2>
          {financialsLoading ? (
            <div className="text-gray-400 text-center py-10">กำลังโหลดข้อมูล...</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 sm:p-6">
            <h2 className="text-base sm:text-xl font-semibold text-white mb-3 sm:mb-4">
              รายรับตามหมวดหมู่ ({selectedYear === "all" ? "ทุกปี" : Number.parseInt(selectedYear) + 543}
              {selectedMonth !== "all" && ` - ${MONTH_OPTIONS_REPORT.find((m) => m.value === selectedMonth)?.label}`})
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

          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 sm:p-6">
            <h2 className="text-base sm:text-xl font-semibold text-white mb-3 sm:mb-4">
              รายจ่ายตามหมวดหมู่ ({selectedYear === "all" ? "ทุกปี" : Number.parseInt(selectedYear) + 543}
              {selectedMonth !== "all" && ` - ${MONTH_OPTIONS_REPORT.find((m) => m.value === selectedMonth)?.label}`})
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
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 sm:p-6">
          <h2 className="text-base sm:text-xl font-semibold text-white mb-3 sm:mb-4">
            สถานะการชำระค่าเช่า ({selectedYear === "all" ? "ทุกปี" : Number.parseInt(selectedYear) + 543}
            {selectedMonth !== "all" && ` - ${MONTH_OPTIONS_REPORT.find((m) => m.value === selectedMonth)?.label}`})
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
          </TabsContent>

          {/* Analysis Tab */}
          <TabsContent value="analysis" className="space-y-4 sm:space-y-6">
            {/* Installment vs Rent Analysis */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 sm:p-6">
              <h2 className="text-base sm:text-xl font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
                <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-orange-400" />
                <span className="hidden sm:inline">วิเคราะห์เงินออกเพิ่มต่อเดือน (ยอดผ่อน - ค่าเช่า)</span>
                <span className="sm:hidden">เงินออกเพิ่ม/เดือน</span>
              </h2>
              
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="bg-gray-700/50 rounded-lg p-3 sm:p-4 border border-gray-600">
                  <div className="text-xs sm:text-sm text-gray-400 mb-1">ยอดผ่อนรวม/เดือน</div>
                  <div className="text-lg sm:text-xl font-bold text-white">฿{totalInstallment.toLocaleString()}</div>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-3 sm:p-4 border border-gray-600">
                  <div className="text-xs sm:text-sm text-gray-400 mb-1">ค่าเช่ารวม/เดือน</div>
                  <div className="text-lg sm:text-xl font-bold text-green-400">฿{totalRent.toLocaleString()}</div>
                </div>
                <div className={`rounded-lg p-3 sm:p-4 border ${totalDifference > 0 ? 'bg-red-900/30 border-red-700' : 'bg-green-900/30 border-green-700'}`}>
                  <div className="text-xs sm:text-sm text-gray-400 mb-1">เงินออกเพิ่มรวม/เดือน</div>
                  <div className={`text-lg sm:text-xl font-bold ${totalDifference > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {totalDifference > 0 ? '+' : ''}฿{totalDifference.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Analysis Table */}
              {condosLoading || tenantsLoading ? (
                <div className="text-gray-400 text-center py-10">กำลังโหลดข้อมูล...</div>
              ) : installmentAnalysis.length === 0 ? (
                <div className="text-gray-400 text-center py-10">ไม่พบข้อมูลคอนโด</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-700/50 text-gray-300">
                      <tr>
                        <th className="px-4 py-3 text-left">คอนโด</th>
                        <th className="px-4 py-3 text-left">ผู้เช่า</th>
                        <th className="px-4 py-3 text-right">ยอดผ่อน/เดือน</th>
                        <th className="px-4 py-3 text-right">ค่าเช่า/เดือน</th>
                        <th className="px-4 py-3 text-right">เงินออกเพิ่ม/เดือน</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {installmentAnalysis.map((item) => (
                        <tr key={item.condoId} className="hover:bg-gray-700/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium text-white">{item.condoName}</div>
                            <div className="text-xs text-gray-400">ห้อง {item.roomNumber}</div>
                          </td>
                          <td className="px-4 py-3">
                            {item.hasTenant ? (
                              <span className="text-green-400">{item.tenantName}</span>
                            ) : (
                              <span className="text-yellow-400">ว่าง</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-white">
                            ฿{item.installment.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {item.hasTenant ? (
                              <span className="text-green-400">฿{item.rent.toLocaleString()}</span>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`font-medium ${item.difference > 0 ? 'text-red-400' : item.difference < 0 ? 'text-green-400' : 'text-gray-400'}`}>
                              {item.difference > 0 ? '+' : ''}{item.difference === 0 ? '-' : `฿${item.difference.toLocaleString()}`}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Note */}
              <div className="mt-4 text-xs text-gray-500 bg-gray-700/30 rounded-lg p-3">
                <strong>หมายเหตุ:</strong> แสดงเฉพาะผู้เช่าที่กำลังเช่าอยู่ (Active) • 
                <span className="text-red-400">สีแดง</span> = ต้องออกเงินเพิ่ม • 
                <span className="text-green-400">สีเขียว</span> = มีกำไร/เหลือเก็บ
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
}
