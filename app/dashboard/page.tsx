"use client"
import { Building2, Users, DollarSign, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react"
import { MainLayout } from "@/components/layout/main-layout"
import { StatsCard } from "@/components/ui/stats-card"
import { DataTable } from "@/components/ui/data-table"
import { useAuth } from "@/lib/auth-context"
import { useCondosDB, useTenantsDB, useRentPaymentsDB, useFinancialRecordsDB } from "@/lib/hooks/use-database"

export default function DashboardPage() {
  const { user } = useAuth()
  const { condos, loading } = useCondosDB(user?.id)
  const { tenants } = useTenantsDB()
  const { payments } = useRentPaymentsDB()
  const { incomeRecords, expenseRecords } = useFinancialRecordsDB()

  // Calculate stats
  const totalCondos = condos.length
  const totalTenants = tenants.filter((t) => t.is_active).length
  const vacantRooms = totalCondos - totalTenants
  const unpaidRents = payments.filter((p) => p.status === "unpaid").length

  const totalIncome = incomeRecords.reduce((sum, record) => sum + record.amount, 0)
  const totalExpenses = expenseRecords.reduce((sum, record) => sum + record.amount, 0)
  const netIncome = totalIncome - totalExpenses

  // Recent activities
  const recentPayments = payments
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  const paymentColumns = [
    {
      key: "tenant_id",
      header: "Tenant",
      render: (payment: any) => {
        const tenant = tenants.find((t) => t.id === payment.tenant_id)
        return tenant?.full_name || "Unknown"
      },
    },
    {
      key: "amount",
      header: "Amount",
      render: (payment: any) => `฿${payment.amount.toLocaleString()}`,
    },
    {
      key: "due_date",
      header: "Due Date",
      render: (payment: any) => new Date(payment.due_date).toLocaleDateString(),
    },
    {
      key: "status",
      header: "Status",
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
          {payment.status}
        </span>
      ),
    },
    {
      key: "condo",
      header: "Condo",
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
          <StatsCard title="คอนโดทั้งหมด" value={totalCondos} icon={Building2} trend={{ value: 12, isPositive: true }} />
          <StatsCard title="ผู้เช่าปัจจุบัน" value={totalTenants} icon={Users} trend={{ value: 8, isPositive: true }} />
          <StatsCard title="ห้องว่าง" value={vacantRooms} icon={AlertTriangle} />
          <StatsCard title="ค่าเช่าค้างชำระ" value={unpaidRents} icon={DollarSign} />
        </div>

        {/* Financial Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <StatsCard
            title="รายได้รวม"
            value={`฿${totalIncome.toLocaleString()}`}
            icon={TrendingUp}
            trend={{ value: 15, isPositive: true }}
          />
          <StatsCard
            title="ค่าใช้จ่ายรวม"
            value={`฿${totalExpenses.toLocaleString()}`}
            icon={TrendingDown}
            trend={{ value: 5, isPositive: false }}
          />
          <StatsCard
            title="กำไรสุทธิ"
            value={`฿${netIncome.toLocaleString()}`}
            icon={DollarSign}
            trend={{ value: 22, isPositive: true }}
          />
        </div>

        {/* Recent Activities */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-white">การชำระค่าเช่าล่าสุด</h2>
          <DataTable
            data={recentPayments}
            columns={paymentColumns}
            loading={loading}
            emptyMessage="No recent payments"
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
