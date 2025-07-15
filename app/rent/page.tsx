"use client"

import type React from "react"
import { useState, useMemo } from "react"
import { Plus, Check, AlertTriangle, Clock, Upload, File, X, Filter, Edit } from "lucide-react"
import { MainLayout } from "@/components/layout/main-layout"
import { DataTable } from "@/components/ui/data-table"
import { Modal } from "@/components/ui/modal"
import { useRentPaymentsDB, useCondosDB, useTenantsDB } from "@/lib/hooks/use-database"
import { useAuth } from "@/lib/auth-context"
import type { RentPayment } from "@/lib/supabase"
import { uploadDocument } from "@/app/actions/document-actions" // Import Server Actions

export default function RentPage() {
  const { user } = useAuth()
  const { payments, loading, addPayment, updatePayment, refetch: refetchPayments } = useRentPaymentsDB(user?.id)
  const { condos } = useCondosDB(user?.id)
  const { tenants } = useTenantsDB(user?.id)
  const [isCreatePaymentModalOpen, setIsCreatePaymentModalOpen] = useState(false)
  const [isEditPaymentModalOpen, setIsEditPaymentModalOpen] = useState(false) // New state for edit modal
  const [selectedPayment, setSelectedPayment] = useState<RentPayment | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)

  // Filter states
  const [selectedCondoFilter, setSelectedCondoFilter] = useState<string>("")
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<"all" | "unpaid" | "paid" | "overdue">("all")

  // Form data for creating/editing payment record
  const [formData, setFormData] = useState({
    tenant_id: "",
    amount: "",
    due_date: "",
    paid_date: "",
    status: "unpaid" as "unpaid" | "paid" | "overdue",
    notes: "",
  })

  // Filter payments based on selected condo and status
  const filteredPayments = useMemo(() => {
    let filtered = payments
    if (selectedCondoFilter) {
      filtered = filtered.filter((p) => p.tenant?.condo_id === selectedCondoFilter)
    }
    if (paymentStatusFilter !== "all") {
      filtered = filtered.filter((p) => p.status === paymentStatusFilter)
    }
    return filtered
  }, [payments, selectedCondoFilter, paymentStatusFilter])

  const handleOpenCreateModal = () => {
    setFormData({
      tenant_id: "",
      amount: "",
      due_date: "",
      paid_date: "",
      status: "unpaid",
      notes: "",
    })
    setUploadedFiles([])
    setIsCreatePaymentModalOpen(true)
  }

  const handleOpenEditModal = (payment: RentPayment) => {
    setSelectedPayment(payment)
    setFormData({
      tenant_id: payment.tenant_id,
      amount: payment.amount.toString(),
      due_date: payment.due_date,
      paid_date: payment.paid_date || "",
      status: payment.status,
      notes: payment.notes || "",
    })
    setUploadedFiles([]) // Clear files for edit, user will re-upload if needed
    setIsEditPaymentModalOpen(true)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setUploadedFiles((prev) => [...prev, ...files])
  }

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.tenant_id || !formData.due_date || !formData.amount) {
      alert("กรุณากรอกข้อมูลที่จำเป็น: ผู้เช่า, จำนวนเงิน, และวันครบกำหนด")
      return
    }

    if (formData.status === "paid" && !formData.paid_date) {
      alert("กรุณากรอกวันที่ชำระ หากสถานะเป็น 'ชำระแล้ว'")
      return
    }

    const paymentData = {
      tenant_id: formData.tenant_id,
      amount: Number.parseFloat(formData.amount),
      due_date: formData.due_date,
      paid_date: formData.paid_date || undefined,
      status: formData.status,
      notes: formData.notes || undefined,
    }

    try {
      let savedPayment: RentPayment | null = null
      if (selectedPayment) {
        // Editing existing payment
        savedPayment = await updatePayment(selectedPayment.id, paymentData)
      } else {
        // Creating new payment
        savedPayment = await addPayment(paymentData)
      }

      if (savedPayment) {
        // Handle file uploads if any
        if (uploadedFiles.length > 0) {
          setIsUploading(true)
          for (const file of uploadedFiles) {
            const uploadFormData = new FormData()
            uploadFormData.append("file", file)
            uploadFormData.append("condoId", savedPayment.tenant?.condo_id || "") // Link to condo of the tenant
            uploadFormData.append("documentType", "payment_receipt") // Specific document type for payment receipts
            // Optionally, you could add a recordId if the documents table supported it directly
            // uploadFormData.append("recordId", savedPayment.id);

            const result = await uploadDocument(uploadFormData)
            if (!result.success) {
              throw new Error(result.message)
            }
          }
          alert(`อัปโหลดไฟล์สำเร็จ ${uploadedFiles.length} ไฟล์`)
        }
        alert(`บันทึกรายการชำระเงินสำเร็จ`)
        refetchPayments() // Refresh data after save
      } else {
        alert("เกิดข้อผิดพลาดในการบันทึกรายการชำระเงิน")
      }
    } catch (error: any) {
      console.error("Error saving payment record:", error)
      alert(`เกิดข้อผิดพลาดในการบันทึกรายการชำระเงิน: ${error.message}`)
    } finally {
      setIsUploading(false)
      setIsCreatePaymentModalOpen(false)
      setIsEditPaymentModalOpen(false)
      setSelectedPayment(null)
      setUploadedFiles([])
    }
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
          <button
            onClick={() => handleOpenEditModal(payment)}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
            title="แก้ไขรายการ"
          >
            <Edit className="h-4 w-4 mr-1" />
            แก้ไข
          </button>
        </div>
      ),
    },
  ]

  // Filter payments by status for summary cards
  const unpaidPaymentsCount = filteredPayments.filter((p) => p.status === "unpaid").length
  const overduePaymentsCount = filteredPayments.filter((p) => p.status === "overdue").length
  const paidPaymentsCount = filteredPayments.filter((p) => p.status === "paid").length

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
            onClick={handleOpenCreateModal}
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
                <p className="text-2xl font-bold text-white">{unpaidPaymentsCount}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-red-900/20 border border-red-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-300">เกินกำหนด</p>
                <p className="text-2xl font-bold text-white">{overduePaymentsCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </div>

          <div className="bg-green-900/20 border border-green-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-300">ชำระแล้ว</p>
                <p className="text-2xl font-bold text-white">{paidPaymentsCount}</p>
              </div>
              <Check className="h-8 w-8 text-green-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <div className="flex items-center space-x-4">
            <Filter className="h-5 w-5 text-gray-400" />
            <div>
              <label className="text-sm font-medium text-gray-300 mr-2">คอนโด:</label>
              <select
                value={selectedCondoFilter}
                onChange={(e) => setSelectedCondoFilter(e.target.value)}
                className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">ทั้งหมด</option>
                {condos.map((condo) => (
                  <option key={condo.id} value={condo.id}>
                    {condo.name} ({condo.room_number})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-300 mr-2">สถานะ:</label>
              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value as "all" | "unpaid" | "paid" | "overdue")}
                className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="all">ทั้งหมด</option>
                <option value="unpaid">ยังไม่ชำระ</option>
                <option value="overdue">เกินกำหนด</option>
                <option value="paid">ชำระแล้ว</option>
              </select>
            </div>
            <span className="text-sm text-gray-400">พบ {filteredPayments.length} รายการ</span>
          </div>
        </div>

        {/* Payments Table */}
        <DataTable
          data={filteredPayments}
          columns={columns}
          loading={loading}
          emptyMessage="ไม่พบรายการชำระค่าเช่า"
          itemsPerPage={10}
        />

        {/* Create/Edit Payment Modal */}
        <Modal
          isOpen={isCreatePaymentModalOpen || isEditPaymentModalOpen}
          onClose={() => {
            setIsCreatePaymentModalOpen(false)
            setIsEditPaymentModalOpen(false)
            setSelectedPayment(null)
            setUploadedFiles([])
          }}
          title={selectedPayment ? "แก้ไขรายการชำระเงิน" : "สร้างรายการชำระเงิน"}
          size="lg"
        >
          <form onSubmit={handleSavePayment} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">ผู้เช่า *</label>
              <select
                required
                value={formData.tenant_id}
                onChange={(e) => {
                  const selectedTenant = tenants.find((t) => t.id === e.target.value)
                  setFormData({
                    ...formData,
                    tenant_id: e.target.value,
                    amount: selectedTenant?.monthly_rent.toString() || "", // Auto-fill amount
                  })
                }}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={!!selectedPayment} // Disable tenant selection when editing
              >
                <option value="">เลือกผู้เช่า</option>
                {tenants // ใช้ tenants จาก useTenantsDB
                  .filter((t) => t.is_active || t.id === formData.tenant_id) // Include current tenant if inactive
                  .map((tenant) => {
                    const condo = condos.find((c) => c.id === tenant.condo_id)
                    return (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.full_name} - {condo?.name} ({condo?.room_number}) - ฿
                        {tenant.monthly_rent.toLocaleString()}
                      </option>
                    )
                  })}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">จำนวนเงิน (บาท) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">วันครบกำหนด *</label>
                <input
                  type="date"
                  required
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">สถานะ *</label>
                <select
                  required
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as "unpaid" | "paid" | "overdue" })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="unpaid">ยังไม่ชำระ</option>
                  <option value="paid">ชำระแล้ว</option>
                  <option value="overdue">เกินกำหนด</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  วันที่ชำระ {formData.status === "paid" && "*"}
                </label>
                <input
                  type="date"
                  value={formData.paid_date}
                  onChange={(e) => setFormData({ ...formData, paid_date: e.target.value })}
                  required={formData.status === "paid"}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">แนบรูปภาพการจ่าย</label>
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
                <h4 className="text-sm font-medium text-gray-300 mb-2">ไฟล์ที่เลือก ({uploadedFiles.length} ไฟล์):</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
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
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
                  setIsEditPaymentModalOpen(false)
                  setSelectedPayment(null)
                  setUploadedFiles([])
                }}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isUploading}
              >
                {isUploading ? "กำลังอัปโหลด..." : selectedPayment ? "อัพเดทรายการ" : "สร้างรายการ"}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </MainLayout>
  )
}
