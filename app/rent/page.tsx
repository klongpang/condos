"use client"

import type React from "react"
import { useState } from "react"
import { Plus, Check, AlertTriangle, Clock, Upload, File, X } from "lucide-react"
import { MainLayout } from "@/components/layout/main-layout"
import { DataTable } from "@/components/ui/data-table"
import { Modal } from "@/components/ui/modal"
import { useRentPayments } from "@/lib/hooks/use-data"
import type { RentPayment } from "@/lib/supabase"
import { mockTenants, mockCondos } from "@/lib/mock-data"

export default function RentPage() {
  const { payments, loading, addPayment, updatePayment } = useRentPayments()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCreatePaymentModalOpen, setIsCreatePaymentModalOpen] = useState(false)
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<RentPayment | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])

  // Form data for creating new payment record
  const [createFormData, setCreateFormData] = useState({
    tenant_id: "",
    due_date: "",
    month_number: "",
    notes: "",
  })

  // Form data for recording payment
  const [recordFormData, setRecordFormData] = useState({
    amount: "",
    payment_date: "",
    month_number: "",
    notes: "",
  })

  const handleRecordPayment = (payment: RentPayment) => {
    setSelectedPayment(payment)
    setRecordFormData({
      amount: payment.amount.toString(),
      payment_date: new Date().toISOString().split("T")[0],
      month_number: "",
      notes: "",
    })
    setUploadedFiles([])
    setIsRecordPaymentModalOpen(true)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setUploadedFiles((prev) => [...prev, ...files])
  }

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleCreatePayment = (e: React.FormEvent) => {
    e.preventDefault()

    if (!createFormData.tenant_id || !createFormData.due_date) {
      alert("กรุณาเลือกผู้เช่าและระบุวันครบกำหนด")
      return
    }

    const tenant = mockTenants.find((t) => t.id === createFormData.tenant_id)
    if (!tenant) return

    // Create new payment record with unpaid status
    addPayment({
      tenant_id: createFormData.tenant_id,
      amount: tenant.monthly_rent, // Use tenant's monthly rent as default
      due_date: createFormData.due_date,
      status: "unpaid",
      notes: createFormData.notes,
    })

    // Reset form
    setCreateFormData({
      tenant_id: "",
      due_date: "",
      month_number: "",
      notes: "",
    })
    setIsCreatePaymentModalOpen(false)
  }

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault()

    // Simplified validation - no required fields
    if (!selectedPayment) return

    // Update payment status to paid
    updatePayment(selectedPayment.id, {
      status: "paid",
      paid_date: recordFormData.payment_date || new Date().toISOString().split("T")[0],
      amount: recordFormData.amount ? Number.parseFloat(recordFormData.amount) : selectedPayment.amount,
      notes: recordFormData.notes,
    })

    // Reset form
    setRecordFormData({
      amount: "",
      payment_date: "",
      month_number: "",
      notes: "",
    })
    setUploadedFiles([])
    setSelectedPayment(null)
    setIsRecordPaymentModalOpen(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-900 text-green-300"
      case "overdue":
        return "bg-red-900 text-red-300"
      default:
        return "bg-yellow-900 text-yellow-300"
    }
  }

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

  const getStatusText = (status: string) => {
    switch (status) {
      case "paid":
        return "ชำระแล้ว"
      case "overdue":
        return "เกินกำหนด"
      default:
        return "ยังไม่ชำระ"
    }
  }

  const columns = [
    {
      key: "tenant_id",
      header: "ผู้เช่า",
      render: (payment: RentPayment) => {
        const tenant = mockTenants.find((t) => t.id === payment.tenant_id)
        const condo = tenant ? mockCondos.find((c) => c.id === tenant.condo_id) : null
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
      render: (payment: RentPayment) => `฿${payment.amount.toLocaleString()}`,
    },
    {
      key: "due_date",
      header: "วันครบกำหนด",
      render: (payment: RentPayment) => {
        const dueDate = new Date(payment.due_date)
        const today = new Date()
        const isOverdue = dueDate < today && payment.status !== "paid"

        return <div className={isOverdue ? "text-red-400" : ""}>{dueDate.toLocaleDateString("th-TH")}</div>
      },
    },
    {
      key: "paid_date",
      header: "วันที่ชำระ",
      render: (payment: RentPayment) =>
        payment.paid_date ? new Date(payment.paid_date).toLocaleDateString("th-TH") : "-",
    },
    {
      key: "status",
      header: "สถานะ",
      render: (payment: RentPayment) => (
        <div className="flex items-center">
          <span
            className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}
          >
            {getStatusIcon(payment.status)}
            <span className="ml-1">{getStatusText(payment.status)}</span>
          </span>
        </div>
      ),
    },
    {
      key: "actions",
      header: "การดำเนินการ",
      render: (payment: RentPayment) => (
        <div className="flex space-x-2">
          {payment.status !== "paid" && (
            <button
              onClick={() => handleRecordPayment(payment)}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
            >
              บันทึกการชำระ
            </button>
          )}
          <button
            onClick={() => {
              setSelectedPayment(payment)
              setIsModalOpen(true)
            }}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
          >
            รายละเอียด
          </button>
        </div>
      ),
    },
  ]

  // Filter payments by status
  const unpaidPayments = payments.filter((p) => p.status === "unpaid")
  const overduePayments = payments.filter((p) => p.status === "overdue")
  const paidPayments = payments.filter((p) => p.status === "paid")

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">จัดการค่าเช่า</h1>
            <p className="text-gray-400">ติดตามและจัดการการชำระค่าเช่า</p>
          </div>
          <button
            onClick={() => setIsCreatePaymentModalOpen(true)}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            สร้างรายการชำระเงิน
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-300">ยังไม่ชำระ</p>
                <p className="text-2xl font-bold text-white">{unpaidPayments.length}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-red-900/20 border border-red-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-300">เกินกำหนด</p>
                <p className="text-2xl font-bold text-white">{overduePayments.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </div>

          <div className="bg-green-900/20 border border-green-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-300">ชำระแล้วเดือนนี้</p>
                <p className="text-2xl font-bold text-white">{paidPayments.length}</p>
              </div>
              <Check className="h-8 w-8 text-green-500" />
            </div>
          </div>
        </div>

        {/* Payments Table */}
        <DataTable
          data={payments}
          columns={columns}
          loading={loading}
          emptyMessage="ไม่พบรายการชำระค่าเช่า"
          itemsPerPage={10}
        />

        {/* Payment Details Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedPayment(null)
          }}
          title="รายละเอียดการชำระเงิน"
          size="md"
        >
          {selectedPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300">ผู้เช่า</label>
                  <p className="text-white">
                    {mockTenants.find((t) => t.id === selectedPayment.tenant_id)?.full_name || "ไม่ทราบ"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300">จำนวนเงิน</label>
                  <p className="text-white">฿{selectedPayment.amount.toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300">วันครบกำหนด</label>
                  <p className="text-white">{new Date(selectedPayment.due_date).toLocaleDateString("th-TH")}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300">สถานะ</label>
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedPayment.status)}`}
                  >
                    {getStatusIcon(selectedPayment.status)}
                    <span className="ml-1">{getStatusText(selectedPayment.status)}</span>
                  </span>
                </div>
              </div>

              {selectedPayment.paid_date && (
                <div>
                  <label className="block text-sm font-medium text-gray-300">วันที่ชำระ</label>
                  <p className="text-white">{new Date(selectedPayment.paid_date).toLocaleDateString("th-TH")}</p>
                </div>
              )}

              {selectedPayment.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-300">หมายเหตุ</label>
                  <p className="text-white">{selectedPayment.notes}</p>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setIsModalOpen(false)
                    setSelectedPayment(null)
                  }}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                >
                  ปิด
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* Create Payment Record Modal */}
        <Modal
          isOpen={isCreatePaymentModalOpen}
          onClose={() => {
            setIsCreatePaymentModalOpen(false)
            setCreateFormData({
              tenant_id: "",
              due_date: "",
              month_number: "",
              notes: "",
            })
          }}
          title="สร้างรายการชำระเงิน"
          size="md"
        >
          <form onSubmit={handleCreatePayment} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">ผู้เช่า *</label>
              <select
                required
                value={createFormData.tenant_id}
                onChange={(e) => {
                  setCreateFormData({ ...createFormData, tenant_id: e.target.value })
                }}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">เลือกผู้เช่า</option>
                {mockTenants
                  .filter((t) => t.is_active)
                  .map((tenant) => {
                    const condo = mockCondos.find((c) => c.id === tenant.condo_id)
                    return (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.full_name} - {condo?.name} ({condo?.room_number}) - ฿
                        {tenant.monthly_rent.toLocaleString()}
                      </option>
                    )
                  })}
              </select>
              {createFormData.tenant_id && (
                <div className="mt-2 p-2 bg-gray-700 rounded text-sm">
                  <span className="text-gray-300">ค่าเช่าต่อเดือน: </span>
                  <span className="text-white font-medium">
                    ฿{mockTenants.find((t) => t.id === createFormData.tenant_id)?.monthly_rent.toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">วันครบกำหนด *</label>
                <input
                  type="date"
                  required
                  value={createFormData.due_date}
                  onChange={(e) => setCreateFormData({ ...createFormData, due_date: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">เดือนที่</label>
                <input
                  type="number"
                  min="1"
                  value={createFormData.month_number}
                  onChange={(e) => setCreateFormData({ ...createFormData, month_number: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="เช่น 1, 2, 3..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">หมายเหตุ</label>
              <textarea
                value={createFormData.notes}
                onChange={(e) => setCreateFormData({ ...createFormData, notes: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                rows={3}
                placeholder="หมายเหตุเพิ่มเติม..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsCreatePaymentModalOpen(false)
                  setCreateFormData({
                    tenant_id: "",
                    due_date: "",
                    month_number: "",
                    notes: "",
                  })
                }}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                สร้างรายการ
              </button>
            </div>
          </form>
        </Modal>

        {/* Record Payment Modal */}
        <Modal
          isOpen={isRecordPaymentModalOpen}
          onClose={() => {
            setIsRecordPaymentModalOpen(false)
            setSelectedPayment(null)
            setRecordFormData({
              amount: "",
              payment_date: "",
              month_number: "",
              notes: "",
            })
            setUploadedFiles([])
          }}
          title="บันทึกการชำระเงิน"
          size="lg"
        >
          <form onSubmit={handleSubmitPayment} className="space-y-4">
            {selectedPayment && (
              <div className="bg-gray-700 rounded-lg p-4 mb-4">
                <h4 className="text-white font-medium mb-2">ข้อมูลรายการ</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-300">ผู้เช่า: </span>
                    <span className="text-white">
                      {mockTenants.find((t) => t.id === selectedPayment.tenant_id)?.full_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-300">วันครบกำหนด: </span>
                    <span className="text-white">{new Date(selectedPayment.due_date).toLocaleDateString("th-TH")}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">จำนวนเงิน (บาท) </label>
                <input
                  type="number"
                  step="0.01"
                  value={recordFormData.amount}
                  onChange={(e) => setRecordFormData({ ...recordFormData, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">วันที่ชำระ </label>
                <input
                  type="date"
                  value={recordFormData.payment_date}
                  onChange={(e) => setRecordFormData({ ...recordFormData, payment_date: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">เดือนที่</label>
              <input
                type="number"
                min="1"
                value={recordFormData.month_number}
                onChange={(e) => setRecordFormData({ ...recordFormData, month_number: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="เช่น 1, 2, 3..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">แนบรูปภาพการจ่าย </label>
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400 mb-2">ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์</p>
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  id="payment-file-upload"
                  accept="image/*,.pdf"
                />
                <label
                  htmlFor="payment-file-upload"
                  className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg cursor-pointer transition-colors"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  เลือกไฟล์
                </label>
                <p className="text-xs text-gray-500 mt-2">รองรับไฟล์: JPG, PNG, PDF</p>
              </div>
            </div>

            {uploadedFiles.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">ไฟล์ที่เลือก:</h4>
                <div className="space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-700 p-3 rounded-lg">
                      <div className="flex items-center">
                        <File className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-white">{file.name}</span>
                        <span className="text-xs text-gray-400 ml-2">({(file.size / 1024).toFixed(1)} KB)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">หมายเหตุ</label>
              <textarea
                value={recordFormData.notes}
                onChange={(e) => setRecordFormData({ ...recordFormData, notes: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                rows={3}
                placeholder="หมายเหตุเพิ่มเติม..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsRecordPaymentModalOpen(false)
                  setSelectedPayment(null)
                  setRecordFormData({
                    amount: "",
                    payment_date: "",
                    month_number: "",
                    notes: "",
                  })
                  setUploadedFiles([])
                }}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                บันทึกการชำระ
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </MainLayout>
  )
}
