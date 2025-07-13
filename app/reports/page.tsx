"use client"

import { useState } from "react"
import { BarChart3, PieChart, TrendingUp, Calendar, Download, Filter } from "lucide-react"
import { MainLayout } from "@/components/layout/main-layout"
import { StatsCard } from "@/components/ui/stats-card"
import { DataTable } from "@/components/ui/data-table"
import { useAuth } from "@/lib/auth-context"
import { useCondosDB, useTenantsDB, useRentPaymentsDB, useFinancialRecordsDB } from "@/lib/hooks/use-database"

export default function ReportsPage() {
  const { user } = useAuth()
  const [selectedPeriod, setSelectedPeriod] = useState("current-month")
  const [selectedReport, setSelectedReport] = useState("income-expense")

  const { condos } = useCondosDB(user?.id)
  const { tenants } = useTenantsDB()
  const { payments } = useRentPaymentsDB()
  const { incomeRecords, expenseRecords } = useFinancialRecordsDB()

  // Calculate financial data
  const totalIncome = incomeRecords.reduce((sum, record) => sum + record.amount, 0)
  const totalExpenses = expenseRecords.reduce((sum, record) => sum + record.amount, 0)
  const netIncome = totalIncome - totalExpenses

  // Payment statistics
  const paidPayments = payments.filter((p) => p.status === "paid")
  const unpaidPayments = payments.filter((p) => p.status === "unpaid")
  const overduePayments = payments.filter((p) => p.status === "overdue")

  // Occupancy rate
  const totalUnits = condos.length
  const occupiedUnits = tenants.filter((t) => t.is_active).length
  const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0

  // Monthly income report
  const monthlyIncomeData = [
    { month: "ม.ค.", income: 45000, expenses: 12000, net: 33000 },
    { month: "ก.พ.", income: 47000, expenses: 15000, net: 32000 },
    { month: "มี.ค.", income: 45000, expenses: 8000, net: 37000 },
    { month: "เม.ย.", income: 48000, expenses: 18000, net: 30000 },
    { month: "พ.ค.", income: 45000, expenses: 10000, net: 35000 },
    { month: "มิ.ย.", income: 50000, expenses: 14000, net: 36000 },
  ]

  // Tenant payment history
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

  // Property performance data
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
            trend={{ value: 15, isPositive: true }}
          />
          <StatsCard
            title="ค่าใช้จ่ายรวม"
            value={`฿${totalExpenses.toLocaleString()}`}
            icon={BarChart3}
            trend={{ value: 8, isPositive: false }}
          />
          <StatsCard
            title="กำไรสุทธิ"
            value={`฿${netIncome.toLocaleString()}`}
            icon={PieChart}
            trend={{ value: 22, isPositive: true }}
          />
          <StatsCard
            title="อัตราการเช่า"
            value={`${occupancyRate.toFixed(1)}%`}
            icon={Calendar}
            trend={{ value: 5, isPositive: true }}
          />
        </div>

        {/* Payment Status Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-green-900/20 border border-green-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-300">ชำระแล้ว</p>
                <p className="text-2xl font-bold text-white">{paidPayments.length}</p>
                <p className="text-sm text-gray-400">
                  ฿{paidPayments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
                </p>
              </div>
              <div className="h-12 w-12 bg-green-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-300">ยังไม่ชำระ</p>
                <p className="text-2xl font-bold text-white">{unpaidPayments.length}</p>
                <p className="text-sm text-gray-400">
                  ฿{unpaidPayments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
                </p>
              </div>
              <div className="h-12 w-12 bg-yellow-600 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-red-900/20 border border-red-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-300">เกินกำหนด</p>
                <p className="text-2xl font-bold text-white">{overduePayments.length}</p>
                <p className="text-sm text-gray-400">
                  ฿{overduePayments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
                </p>
              </div>
              <div className="h-12 w-12 bg-red-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Income Chart */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-medium text-white mb-4">รายได้รายเดือน</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 text-gray-300">เดือน</th>
                  <th className="text-right py-2 text-gray-300">รายได้</th>
                  <th className="text-right py-2 text-gray-300">ค่าใช้จ่าย</th>
                  <th className="text-right py-2 text-gray-300">กำไรสุทธิ</th>
                </tr>
              </thead>
              <tbody>
                {monthlyIncomeData.map((data, index) => (
                  <tr key={index} className="border-b border-gray-700">
                    <td className="py-2 text-white">{data.month}</td>
                    <td className="py-2 text-right text-green-400">���{data.income.toLocaleString()}</td>
                    <td className="py-2 text-right text-red-400">฿{data.expenses.toLocaleString()}</td>
                    <td className="py-2 text-right text-white font-medium">฿{data.net.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

          {selectedReport === "payment-history" && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white">ประวัติการชำระเงิน</h3>
              <DataTable
                data={payments}
                columns={tenantPaymentColumns}
                emptyMessage="ไม่พบประวัติการชำระเงิน"
                itemsPerPage={10}
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
