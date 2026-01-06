"use client"
import { useMemo } from "react"
import { Building2, Users, DollarSign, AlertTriangle, TrendingUp, TrendingDown, Check, Clock, RefreshCw, Percent, Bell, Calendar } from "lucide-react"
import { MainLayout } from "@/components/layout/main-layout"
import { StatsCard } from "@/components/ui/stats-card"
import { DataTable } from "@/components/ui/data-table"
import { useAuth } from "@/lib/auth-context"
import { useCondos, useTenants, useRentPayments, useFinancialRecords } from "@/lib/hooks/use-queries"
import { useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { format, differenceInDays, addDays } from "date-fns"
import { th } from "date-fns/locale"

export default function DashboardPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const { condos, loading: condosLoading } = useCondos(user?.id)
  const { tenants, loading: tenantsLoading } = useTenants(user?.id)
  const { payments, loading: paymentsLoading } = useRentPayments(user?.id)
  const { incomeRecords, expenseRecords, loading: financialsLoading } = useFinancialRecords(user?.id)

  // Combined loading state
  const isLoading = condosLoading || tenantsLoading || paymentsLoading || financialsLoading

  // Refresh function
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await queryClient.invalidateQueries()
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  // Calculate stats
  const totalCondos = condos.length
  const totalTenants = tenants.filter((t) => t.is_active).length
  const vacantRooms = Math.max(0, totalCondos - totalTenants)
  const occupancyRate = totalCondos > 0 ? Math.round((totalTenants / totalCondos) * 100) : 0

  // Filter payments for dashboard stats
  const unpaidPayments = payments.filter((p) => p.status === "unpaid")
  const overduePayments = payments.filter((p) => p.status === "overdue")
  const paidPayments = payments.filter((p) => p.status === "paid")

  const totalUnpaidCount = unpaidPayments.length
  const totalOverdueCount = overduePayments.length
  const totalPaidCount = paidPayments.length

  const totalUnpaidAmount = unpaidPayments.reduce((sum, p) => sum + p.amount, 0)
  const totalOverdueAmount = overduePayments.reduce((sum, p) => sum + p.amount, 0)

  const totalIncome = incomeRecords.reduce((sum, record) => sum + record.amount, 0)
  const totalExpenses = expenseRecords.reduce((sum, record) => sum + record.amount, 0)
  const netIncome = totalIncome - totalExpenses

  // Monthly chart data (last 6 months)
  const monthlyChartData = useMemo(() => {
    const now = new Date()
    const data: { name: string; income: number; expense: number }[] = []
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthName = format(date, "MMM", { locale: th })
      const year = date.getFullYear()
      const month = date.getMonth()
      
      const monthIncome = incomeRecords
        .filter(r => {
          const d = new Date(r.date)
          return d.getFullYear() === year && d.getMonth() === month
        })
        .reduce((sum, r) => sum + r.amount, 0)
      
      const monthExpense = expenseRecords
        .filter(r => {
          const d = new Date(r.date)
          return d.getFullYear() === year && d.getMonth() === month
        })
        .reduce((sum, r) => sum + r.amount, 0)
      
      data.push({ name: monthName, income: monthIncome, expense: monthExpense })
    }
    
    return data
  }, [incomeRecords, expenseRecords])

  // Payment status pie chart data
  const paymentStatusData = useMemo(() => [
    { name: "ชำระแล้ว", value: totalPaidCount, color: "#22c55e" },
    { name: "ยังไม่ชำระ", value: totalUnpaidCount, color: "#eab308" },
    { name: "เกินกำหนด", value: totalOverdueCount, color: "#ef4444" },
  ], [totalPaidCount, totalUnpaidCount, totalOverdueCount])

  // Upcoming due dates (next 7 days)
  const upcomingPayments = useMemo(() => {
    const today = new Date()
    const nextWeek = addDays(today, 7)
    
    return payments
      .filter(p => {
        if (p.status === "paid") return false
        const dueDate = new Date(p.due_date)
        return dueDate >= today && dueDate <= nextWeek
      })
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
      .slice(0, 5)
  }, [payments])

  // Recent activities - only showing PAID payments
  const recentPaidPayments = payments
    .filter((p) => p.status === "paid")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // Recent activities - Unpaid and Overdue payments
  const recentUnpaidOverduePayments = payments
    .filter((p) => p.status === "unpaid" || p.status === "overdue")
    .sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime())

  const paymentColumns = [
    {
      key: "tenant_id",
      header: "ผู้เช่า",
      render: (payment: any) => {
        // Use payment.tenant from database join to include inactive tenants
        const tenant = payment.tenant
        const condo = tenant?.condo
        return (
          <div>
            <div className="font-medium">{tenant?.full_name || "ไม่ทราบ"}</div>
            <div className="text-sm text-gray-400">
              {condo ? `${condo.name} (${condo.room_number})` : "ไม่ทราบคอนโด"}
            </div>
          </div>
        )
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
      const getStatusIcon = (status: string) => {
        switch (status) {
          case "paid":
            return <Check className="h-4 w-4" />
          case "overdue":
            return <AlertTriangle className="h-4 w-4" />
          default:
            return <Clock className="h-4 w-4" />
        }
      }

      return (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${
            payment.status === "paid"
              ? "bg-green-900 text-green-300"
              : payment.status === "overdue"
                ? "bg-red-900 text-red-300"
                : "bg-yellow-900 text-yellow-300"
          }`}
        >
          {getStatusIcon(payment.status)}
          {payment.status === "paid" ? "ชำระแล้ว" : payment.status === "overdue" ? "เกินกำหนด" : "ยังไม่ชำระ"}
        </span>
      );
    },
    },
    {
      key: "notes",
      header: "หมายเหตุ",
      render: (payment: any) => {
        return (
          <div>
            <div className="text-sm text-gray-400">
              {payment.notes || "-"}
            </div>
          </div>
        )
      },
    },
  ]

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header with Refresh Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">แดชบอร์ด</h1>
            <p className="text-sm sm:text-base text-gray-400">ยินดีต้อนรับ, {user?.full_name}</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700 transition-colors disabled:opacity-50 text-sm"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            รีเฟรช
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
          <StatsCard 
            title="คอนโดทั้งหมด" 
            value={totalCondos} 
            icon={Building2} 
            iconColor="blue"
            tooltip="จำนวนคอนโดทั้งหมดในระบบ"
            loading={isLoading}
          />
          <StatsCard 
            title="ผู้เช่าปัจจุบัน" 
            value={totalTenants} 
            icon={Users} 
            iconColor="green"
            tooltip="จำนวนผู้เช่าที่ active อยู่ในปัจจุบัน"
            loading={isLoading}
          />
          <StatsCard 
            title="ห้องว่าง" 
            value={vacantRooms} 
            icon={AlertTriangle} 
            iconColor={vacantRooms > 0 ? "yellow" : "green"}
            tooltip="จำนวนห้องที่ยังไม่มีผู้เช่า"
            loading={isLoading}
          />
          <StatsCard 
            title="อัตราการเช่า" 
            value={`${occupancyRate}%`} 
            icon={Percent} 
            iconColor={occupancyRate >= 80 ? "green" : occupancyRate >= 50 ? "yellow" : "red"}
            tooltip="เปอร์เซ็นต์ห้องที่มีผู้เช่า"
            loading={isLoading}
          />
          <StatsCard 
            title="ค่าเช่าชำระแล้ว" 
            value={totalPaidCount} 
            icon={Check} 
            iconColor="green"
            tooltip="จำนวนรายการค่าเช่าที่ชำระแล้ว"
            trend={{ value: totalPaidCount, isPositive: true, label: " รายการ" }}
            loading={isLoading}
          />
        </div>

        {/* Rent Payment Status Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
          <StatsCard
            title="ยอดค้างชำระ (ยังไม่ชำระ)"
            value={`฿${totalUnpaidAmount.toLocaleString()}`}
            icon={Clock}
            iconColor="yellow"
            tooltip="ยอดรวมค่าเช่าที่ยังไม่ได้ชำระ"
            trend={{ value: totalUnpaidCount, isPositive: false, label: " รายการ" }}
            loading={isLoading}
          />
          <StatsCard
            title="ยอดค้างชำระ (เกินกำหนด)"
            value={`฿${totalOverdueAmount.toLocaleString()}`}
            icon={AlertTriangle}
            iconColor="red"
            tooltip="ยอดรวมค่าเช่าที่เกินกำหนดชำระ"
            trend={{ value: totalOverdueCount, isPositive: false, label: " รายการ" }}
            loading={isLoading}
          />
        </div>

        {/* Financial Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          <StatsCard 
            title="รายได้รวม" 
            value={`฿${totalIncome.toLocaleString()}`} 
            icon={TrendingUp} 
            iconColor="green"
            tooltip="รายได้ทั้งหมดจากทุกแหล่ง"
            loading={isLoading}
          />
          <StatsCard 
            title="ค่าใช้จ่ายรวม" 
            value={`฿${totalExpenses.toLocaleString()}`} 
            icon={TrendingDown} 
            iconColor="red"
            tooltip="ค่าใช้จ่ายทั้งหมด"
            loading={isLoading}
          />
          <StatsCard
            title="กำไรสุทธิ"
            value={`฿${netIncome.toLocaleString()}`}
            icon={DollarSign}
            iconColor={netIncome >= 0 ? "green" : "red"}
            tooltip="รายได้หลังหักค่าใช้จ่าย"
            loading={isLoading}
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {/* Monthly Income/Expense Chart */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
              รายรับ-รายจ่าย 6 เดือนล่าสุด
            </h2>
            {isLoading ? (
              <div className="h-[200px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(v) => `฿${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: number) => [`฿${value.toLocaleString()}`, ""]}
                    contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px" }}
                    labelStyle={{ color: "#9ca3af" }}
                  />
                  <Bar dataKey="income" name="รายรับ" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="รายจ่าย" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Payment Status Pie Chart */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
              <Check className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
              สถานะการชำระค่าเช่า
            </h2>
            {isLoading ? (
              <div className="h-[200px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
              </div>
            ) : paymentStatusData.every(d => d.value === 0) ? (
              <div className="h-[200px] flex items-center justify-center text-gray-400">
                ไม่มีข้อมูลการชำระค่าเช่า
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
                <ResponsiveContainer width={160} height={160} className="sm:!w-[180px] sm:!h-[180px]">
                  <PieChart>
                    <Pie
                      data={paymentStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      dataKey="value"
                    >
                      {paymentStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [`${value} รายการ`, name]}
                      contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {paymentStatusData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="text-gray-300">{item.name}: <span className="font-medium text-white">{item.value}</span></span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Due Dates */}
        {upcomingPayments.length > 0 && (
          <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 rounded-lg border border-yellow-700/50 p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
              <span className="hidden sm:inline">การชำระที่ใกล้ครบกำหนด (7 วันข้างหน้า)</span>
              <span className="sm:hidden">ใกล้ครบกำหนด</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {upcomingPayments.map((payment) => {
                // Use payment.tenant from database join to include inactive tenants
                const tenant = payment.tenant
                const dueDate = new Date(payment.due_date)
                const daysLeft = differenceInDays(dueDate, new Date())
                
                return (
                  <div 
                    key={payment.id}
                    className="bg-gray-800/60 rounded-lg p-4 border border-gray-700"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-white">{tenant?.full_name || "ไม่ทราบ"}</p>
                        <p className="text-sm text-gray-400">{tenant?.condo?.name} ({tenant?.condo?.room_number})</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        daysLeft <= 1 ? "bg-red-900 text-red-300" : 
                        daysLeft <= 3 ? "bg-yellow-900 text-yellow-300" : 
                        "bg-blue-900 text-blue-300"
                      }`}>
                        {daysLeft === 0 ? "วันนี้" : daysLeft === 1 ? "พรุ่งนี้" : `อีก ${daysLeft} วัน`}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="text-gray-400 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(dueDate, "d MMM yyyy", { locale: th })}
                      </span>
                      <span className="text-green-400 font-medium">฿{payment.amount.toLocaleString()}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
        
        <div className="space-y-4 sm:space-y-6">
          <h2 className="text-lg sm:text-xl font-semibold text-white">รายการรอชำระและคงค้าง</h2>
          <DataTable
            data={recentUnpaidOverduePayments}
            columns={paymentColumns}
            loading={isLoading}
            emptyMessage="ไม่พบรายการค้างชำระค่าเช่าล่าสุด"
            itemsPerPage={5}
            showPagination={true}
          />
        </div>

        {/* Recent Paid Payments Table */}
        <div className="space-y-4 sm:space-y-6">
          <h2 className="text-lg sm:text-xl font-semibold text-white">รายการชำระค่าเช่า</h2>
          <DataTable
            data={recentPaidPayments}
            columns={paymentColumns}
            loading={isLoading}
            emptyMessage="ไม่พบรายการชำระค่าเช่าที่ชำระแล้วล่าสุด"
            itemsPerPage={5}
            showPagination={true}
          />
        </div>
      </div>
    </MainLayout>
  )
}
