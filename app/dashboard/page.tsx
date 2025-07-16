"use client"
import { Building2, Users, DollarSign, AlertTriangle, TrendingUp, TrendingDown, Check, Clock } from "lucide-react"
import { MainLayout } from "@/components/layout/main-layout"
import { StatsCard } from "@/components/ui/stats-card"
import { DataTable } from "@/components/ui/data-table"
import { useAuth } from "@/lib/auth-context"
import { useCondosDB, useTenantsDB, useRentPaymentsDB, useFinancialRecordsDB } from "@/lib/hooks/use-database"

export default function DashboardPage() {
  const { user } = useAuth()
  const { condos, loading } = useCondosDB(user?.id)
  const { tenants } = useTenantsDB(user?.id) // Ensure tenants are filtered by user
  const { payments } = useRentPaymentsDB(user?.id) // Ensure payments are filtered by user
  const { incomeRecords, expenseRecords } = useFinancialRecordsDB(user?.id) // Ensure financial records are filtered by user

  // Calculate stats
  const totalCondos = condos.length
  const totalTenants = tenants.filter((t) => t.is_active).length
  const vacantRooms = totalCondos - totalTenants

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

  // Recent activities - only showing PAID payments
  const recentPaidPayments = payments
    .filter((p) => p.status === "paid")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // Recent activities - Unpaid and Overdue payments
  const recentUnpaidOverduePayments = payments
    .filter((p) => p.status === "unpaid" || p.status === "overdue")
    .sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime()) // Sort by due date for these

  const paymentColumns = [
    {
      key: "tenant_id",
      header: "ผู้เช่า",
      render: (payment: any) => {
        const tenant = tenants.find((t) => t.id === payment.tenant_id)
        return tenant?.full_name || "ไม่ทราบ"
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
      render: (payment: any) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            payment.status === "paid"
              ? "bg-green-900 text-green-300"
              : payment.status === "overdue"
                ? "bg-red-900 text-red-300"
                : "bg-yellow-900 text-yellow-300"
          }`}
        >
          {payment.status === "paid" ? "ชำระแล้ว" : payment.status === "overdue" ? "เกินกำหนด" : "ยังไม่ชำระ"}
        </span>
      ),
    },
    {
      key: "condo",
      header: "คอนโด",
      render: (payment: any) => {
        const tenant = tenants.find((t) => t.id === payment.tenant_id)
        const condo = tenant ? condos.find((c) => c.id === tenant.condo_id) : null
        return condo ? `${condo.name} (${condo.room_number})` : "ไม่ทราบ"
      },
    },
  ]

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">แดชบอร์ด</h1>
          <p className="text-gray-400">ยินดีต้อนรับ, {user?.full_name}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard title="คอนโดทั้งหมด" value={totalCondos} icon={Building2} />
          <StatsCard title="ผู้เช่าปัจจุบัน" value={totalTenants} icon={Users} />
          <StatsCard title="ห้องว่าง" value={vacantRooms} icon={AlertTriangle} />
          <StatsCard title="ค่าเช่าชำระแล้ว" value={totalPaidCount} icon={Check} />
        </div>

        {/* Rent Payment Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatsCard
            title="ยอดค้างชำระ (ยังไม่ชำระ)"
            value={`฿${totalUnpaidAmount.toLocaleString()}`}
            icon={Clock}
            trend={{ value: totalUnpaidCount, isPositive: false }}
          />
          <StatsCard
            title="ยอดค้างชำระ (เกินกำหนด)"
            value={`฿${totalOverdueAmount.toLocaleString()}`}
            icon={AlertTriangle}
            trend={{ value: totalOverdueCount, isPositive: false }}
          />
        </div>

        {/* Financial Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <StatsCard title="รายได้รวม" value={`฿${totalIncome.toLocaleString()}`} icon={TrendingUp} />
          <StatsCard title="ค่าใช้จ่ายรวม" value={`฿${totalExpenses.toLocaleString()}`} icon={TrendingDown} />
          <StatsCard
            title="กำไรสุทธิ"
            value={`฿${netIncome.toLocaleString()}`}
            icon={DollarSign}
            trend={netIncome >= 0 ? { value: 0, isPositive: true } : { value: 0, isPositive: false }}
          />
        </div>

        {/* Recent Paid Payments Table */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-white">การชำระค่าเช่าล่าสุด (ชำระแล้ว)</h2>
          <DataTable
            data={recentPaidPayments}
            columns={paymentColumns}
            loading={loading}
            emptyMessage="ไม่พบรายการชำระค่าเช่าที่ชำระแล้วล่าสุด"
            itemsPerPage={5}
            showPagination={true}
          />
        </div>

        {/* Recent Unpaid/Overdue Payments Table */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-white">การค้างชำระค่าเช่าล่าสุด (ค้างและยังไม่จ่าย)</h2>
          <DataTable
            data={recentUnpaidOverduePayments}
            columns={paymentColumns}
            loading={loading}
            emptyMessage="ไม่พบรายการค้างชำระค่าเช่าล่าสุด"
            itemsPerPage={5}
            showPagination={true}
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-medium text-white mb-4">การดำเนินการด่วน</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-4 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium transition-colors">
              เพิ่มคอนโดใหม่
            </button>
            <button className="p-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors">
              เพิ่มผู้เช่าใหม่
            </button>
            <button className="p-4 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium transition-colors">
              บันทึกการชำระเงิน
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
