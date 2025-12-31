"use client"
import { Building2, Users, DollarSign, AlertTriangle, TrendingUp, TrendingDown, Check, Clock } from "lucide-react"
import { MainLayout } from "@/components/layout/main-layout"
import { StatsCard } from "@/components/ui/stats-card"
import { DataTable } from "@/components/ui/data-table"
import { useAuth } from "@/lib/auth-context"
import { useCondos, useTenants, useRentPayments, useFinancialRecords } from "@/lib/hooks/use-queries"

export default function DashboardPage() {
  const { user } = useAuth()
  const { condos, loading } = useCondos(user?.id)
  const { tenants } = useTenants(user?.id)
  const { payments } = useRentPayments(user?.id)
  const { incomeRecords, expenseRecords } = useFinancialRecords(user?.id)

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
    // {
    //   key: "condo",
    //   header: "คอนโด",
    //   render: (payment: any) => {
    //     const tenant = tenants.find((t) => t.id === payment.tenant_id)
    //     const condo = tenant ? condos.find((c) => c.id === tenant.condo_id) : null
    //     return condo ? `${condo.name} (${condo.room_number})` : "ไม่ทราบ"
    //   },
    // },
    {
      key: "tenant_id",
      header: "หมายเหตุ",
      render: (payment: any) => {
        const tenant = tenants.find((t) => t.id === payment.tenant_id)
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
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-white">รายการรอชำระและคงค้าง</h2>
          <DataTable
            data={recentUnpaidOverduePayments}
            columns={paymentColumns}
            loading={loading}
            emptyMessage="ไม่พบรายการค้างชำระค่าเช่าล่าสุด"
            itemsPerPage={5}
            showPagination={true}
          />
        </div>

        {/* Recent Paid Payments Table */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-white">รายการชำระค่าเช่า</h2>
          <DataTable
            data={recentPaidPayments}
            columns={paymentColumns}
            loading={loading}
            emptyMessage="ไม่พบรายการชำระค่าเช่าที่ชำระแล้วล่าสุด"
            itemsPerPage={5}
            showPagination={true}
          />
        </div>

        

        {/* Quick Actions */}
        
      </div>
    </MainLayout>
  )
}
