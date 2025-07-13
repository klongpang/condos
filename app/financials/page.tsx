"use client"

import type React from "react"
import { useState } from "react"
import { Plus, TrendingUp, TrendingDown, DollarSign } from "lucide-react"
import { MainLayout } from "@/components/layout/main-layout"
import { DataTable } from "@/components/ui/data-table"
import { StatsCard } from "@/components/ui/stats-card"
import { Modal } from "@/components/ui/modal"
import { useFinancialRecordsDB, useCondosDB } from "@/lib/hooks/use-database"
import { useAuth } from "@/lib/auth-context"
import type { IncomeRecord, ExpenseRecord } from "@/lib/supabase"

export default function FinancialsPage() {
  const { user } = useAuth()
  const { condos } = useCondosDB(user?.id)
  const { incomeRecords, expenseRecords, loading, addIncomeRecord, addExpenseRecord } = useFinancialRecordsDB()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [recordType, setRecordType] = useState<"income" | "expense">("income")
  const [formData, setFormData] = useState({
    condo_id: "",
    type: "",
    amount: "",
    date: "",
    description: "",
    category: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const recordData = {
      ...formData,
      amount: Number.parseFloat(formData.amount),
    }

    if (recordType === "income") {
      addIncomeRecord(recordData)
    } else {
      addExpenseRecord(recordData)
    }

    resetForm()
  }

  const resetForm = () => {
    setFormData({
      condo_id: "",
      type: "",
      amount: "",
      date: "",
      description: "",
      category: "",
    })
    setIsModalOpen(false)
  }

  const openModal = (type: "income" | "expense") => {
    setRecordType(type)
    setFormData({
      ...formData,
      date: new Date().toISOString().split("T")[0],
    })
    setIsModalOpen(true)
  }

  // Calculate totals
  const totalIncome = incomeRecords.reduce((sum, record) => sum + record.amount, 0)
  const totalExpenses = expenseRecords.reduce((sum, record) => sum + record.amount, 0)
  const netIncome = totalIncome - totalExpenses

  // Income columns
  const incomeColumns = [
    {
      key: "date",
      header: "Date",
      render: (record: IncomeRecord) => new Date(record.date).toLocaleDateString(),
    },
    {
      key: "type",
      header: "Type",
    },
    {
      key: "amount",
      header: "Amount",
      render: (record: IncomeRecord) => (
        <span className="text-green-400 font-medium">+${record.amount.toLocaleString()}</span>
      ),
    },
    {
      key: "category",
      header: "Category",
    },
    {
      key: "description",
      header: "Description",
    },
  ]

  // Expense columns
  const expenseColumns = [
    {
      key: "date",
      header: "Date",
      render: (record: ExpenseRecord) => new Date(record.date).toLocaleDateString(),
    },
    {
      key: "type",
      header: "Type",
    },
    {
      key: "amount",
      header: "Amount",
      render: (record: ExpenseRecord) => (
        <span className="text-red-400 font-medium">-${record.amount.toLocaleString()}</span>
      ),
    },
    {
      key: "category",
      header: "Category",
    },
    {
      key: "description",
      header: "Description",
    },
  ]

  const incomeCategories = ["Rental Income", "Parking Fee", "Late Fee", "Other"]
  const expenseCategories = ["Maintenance", "Utilities", "Insurance", "Property Tax", "Management Fee", "Other"]

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Financial Management</h1>
            <p className="text-gray-400">Track income and expenses for your properties</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => openModal("income")}
              className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Income
            </button>
            <button
              onClick={() => openModal("expense")}
              className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </button>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCard
            title="Total Income"
            value={`$${totalIncome.toLocaleString()}`}
            icon={TrendingUp}
            trend={{ value: 15, isPositive: true }}
          />
          <StatsCard
            title="Total Expenses"
            value={`$${totalExpenses.toLocaleString()}`}
            icon={TrendingDown}
            trend={{ value: 8, isPositive: false }}
          />
          <StatsCard
            title="Net Income"
            value={`$${netIncome.toLocaleString()}`}
            icon={DollarSign}
            trend={{ value: 22, isPositive: netIncome >= 0 }}
          />
        </div>

        {/* Income Records */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Income Records</h2>
            <span className="text-sm text-gray-400">{incomeRecords.length} records</span>
          </div>
          <DataTable
            data={incomeRecords}
            columns={incomeColumns}
            loading={loading}
            emptyMessage="No income records found."
          />
        </div>

        {/* Expense Records */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Expense Records</h2>
            <span className="text-sm text-gray-400">{expenseRecords.length} records</span>
          </div>
          <DataTable
            data={expenseRecords}
            columns={expenseColumns}
            loading={loading}
            emptyMessage="No expense records found."
          />
        </div>

        {/* Add Record Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={resetForm}
          title={`Add ${recordType === "income" ? "Income" : "Expense"} Record`}
          size="md"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Condo *</label>
              <select
                required
                value={formData.condo_id}
                onChange={(e) => setFormData({ ...formData, condo_id: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select a condo</option>
                {condos.map((condo) => (
                  <option key={condo.id} value={condo.id}>
                    {condo.name} ({condo.room_number})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Type *</label>
                <input
                  type="text"
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder={recordType === "income" ? "e.g., Monthly Rent" : "e.g., HVAC Repair"}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Category *</label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select category</option>
                  {(recordType === "income" ? incomeCategories : expenseCategories).map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                rows={3}
                placeholder="Additional details..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-4 py-2 text-white rounded-lg transition-colors ${
                  recordType === "income" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                }`}
              >
                Add {recordType === "income" ? "Income" : "Expense"}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </MainLayout>
  )
}
