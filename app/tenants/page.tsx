"use client"

import type React from "react"
import { useState } from "react"
import { Plus, Edit, Phone, MessageCircle, UserX, Filter, FileText, Upload, File, X, Eye } from "lucide-react"
import { MainLayout } from "@/components/layout/main-layout"
import { DataTable } from "@/components/ui/data-table"
import { Modal } from "@/components/ui/modal"
import { useAuth } from "@/lib/auth-context"
import type { Tenant } from "@/lib/supabase"
import { useTenantsDB, useCondosDB, useDocumentsDB } from "@/lib/hooks/use-database"
import { tenantHistoryService } from "@/lib/database"
import { uploadDocument, deleteDocumentAction } from "@/app/actions/document-actions" // Import Server Actions

export default function TenantsPage() {
  const { user } = useAuth()
  const { tenants, loading, addTenant, updateTenant } = useTenantsDB(user?.id) // ดึงผู้เช่าที่เกี่ยวข้องกับ user
  const { condos } = useCondosDB(user?.id) // ดึงเฉพาะ condos ของ user นั้นๆ
  const [isEndContractModalOpen, setIsEndContractModalOpen] = useState(false)
  const [selectedTenantForEnd, setSelectedTenantForEnd] = useState<Tenant | null>(null)
  const [endContractData, setEndContractData] = useState({
    end_reason: "expired" as "expired" | "early_termination" | "changed_tenant",
    actual_end_date: "",
    notes: "",
  })

  // Filter states
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "vacant">("active")
  const [selectedCondoFilter, setSelectedCondoFilter] = useState<string>("")

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null)
  const [formData, setFormData] = useState({
    condo_id: "",
    full_name: "",
    phone: "",
    line_id: "",
    rental_start: "",
    rental_end: "",
    deposit: "",
    monthly_rent: "",
  })

  // Document states for tenant
  const [isTenantFileModalOpen, setIsTenantFileModalOpen] = useState(false) // New state for file modal
  const [selectedTenantForFile, setSelectedTenantForFile] = useState<Tenant | null>(null) // New state for selected tenant for file upload
  const {
    documents: tenantDocuments, // Rename to avoid conflict
    loading: tenantDocumentsLoading,
    refetch: refetchTenantDocuments,
  } = useDocumentsDB(undefined, selectedTenantForFile?.id) // Pass tenantId here

  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [documentType, setDocumentType] = useState<string>("")
  const [isUploading, setIsUploading] = useState(false)

  // Filter tenants based on status and condo - ใช้ tenants ที่ถูกกรองโดย useTenantsDB แล้ว
  const filteredTenants = tenants.filter((tenant) => {
    const statusMatch =
      statusFilter === "all" ||
      (statusFilter === "active" && tenant.is_active) ||
      (statusFilter === "vacant" && !tenant.is_active)

    const condoMatch = !selectedCondoFilter || tenant.condo_id === selectedCondoFilter

    return statusMatch && condoMatch
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const tenantData = {
      condo_id: formData.condo_id,
      full_name: formData.full_name,
      phone: formData.phone || undefined,
      line_id: formData.line_id || undefined,
      rental_start: formData.rental_start,
      rental_end: formData.rental_end,
      deposit: formData.deposit ? Number.parseFloat(formData.deposit) : undefined,
      monthly_rent: Number.parseFloat(formData.monthly_rent),
      is_active: true,
      status: "active" as const,
    }

    try {
      if (editingTenant) {
        await updateTenant(editingTenant.id, tenantData)
      } else {
        await addTenant(tenantData)
      }
      resetForm()
    } catch (error) {
      console.error("Error saving tenant:", error)
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล")
    }
  }

  const resetForm = () => {
    setFormData({
      condo_id: "",
      full_name: "",
      phone: "",
      line_id: "",
      rental_start: "",
      rental_end: "",
      deposit: "",
      monthly_rent: "",
    })
    setEditingTenant(null)
    setIsModalOpen(false)
  }

  const handleEdit = (tenant: Tenant) => {
    setFormData({
      condo_id: tenant.condo_id,
      full_name: tenant.full_name,
      phone: tenant.phone || "",
      line_id: tenant.line_id || "",
      rental_start: tenant.rental_start,
      rental_end: tenant.rental_end,
      deposit: tenant.deposit?.toString() || "",
      monthly_rent: tenant.monthly_rent.toString(),
    })
    setEditingTenant(tenant)
    setIsModalOpen(true)
  }

  const handleEndContract = (tenant: Tenant) => {
    setSelectedTenantForEnd(tenant)
    setEndContractData({
      end_reason: "expired",
      actual_end_date: new Date().toISOString().split("T")[0],
      notes: "",
    })
    setIsEndContractModalOpen(true)
  }

  const submitEndContract = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTenantForEnd) return

    try {
      // สร้างประวัติผู้เช่าใน tenant_history table
      await tenantHistoryService.create({
        condo_id: selectedTenantForEnd.condo_id,
        full_name: selectedTenantForEnd.full_name,
        phone: selectedTenantForEnd.phone,
        line_id: selectedTenantForEnd.line_id,
        rental_start: selectedTenantForEnd.rental_start,
        rental_end: selectedTenantForEnd.rental_end,
        actual_end_date: endContractData.actual_end_date,
        deposit: selectedTenantForEnd.deposit,
        monthly_rent: selectedTenantForEnd.monthly_rent,
        end_reason: endContractData.end_reason as any,
        notes: endContractData.notes,
      })

      // อัพเดทสถานะผู้เช่าให้เป็น inactive
      await updateTenant(selectedTenantForEnd.id, {
        is_active: false,
        status: "ended",
        end_reason: endContractData.end_reason,
        actual_end_date: endContractData.actual_end_date,
        notes: endContractData.notes,
      })

      // รีเซ็ตฟอร์ม
      setIsEndContractModalOpen(false)
      setSelectedTenantForEnd(null)
      setEndContractData({
        end_reason: "expired",
        actual_end_date: "",
        notes: "",
      })

      alert("สิ้นสุดสัญญาเรียบร้อยแล้ว")
    } catch (error) {
      console.error("Error ending contract:", error)
      alert("เกิดข้อผิดพลาดในการสิ้นสุดสัญญา")
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setUploadedFiles((prev) => [...prev, ...files])
  }

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const openTenantFileModal = (tenant: Tenant) => {
    setSelectedTenantForFile(tenant)
    setUploadedFiles([])
    setDocumentType("")
    setIsTenantFileModalOpen(true)
    refetchTenantDocuments() // Refetch documents when opening modal
  }

  const handleTenantFileSubmit = async () => {
    if (uploadedFiles.length === 0) {
      alert("กรุณาเลือกไฟล์ที่ต้องการอัปโหลด")
      return
    }
    if (!documentType) {
      alert("กรุณาเลือกประเภทเอกสาร")
      return
    }
    if (!selectedTenantForFile) return

    setIsUploading(true)
    try {
      for (const file of uploadedFiles) {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("tenantId", selectedTenantForFile.id) // Link to tenant_id
        formData.append("condoId", selectedTenantForFile.condo_id) // Also link to condo_id for broader access
        formData.append("documentType", documentType)

        const result = await uploadDocument(formData)
        if (!result.success) {
          throw new Error(result.message)
        }
      }
      alert(`อัปโหลดไฟล์สำเร็จ ${uploadedFiles.length} ไฟล์`)
      setUploadedFiles([])
      setDocumentType("")
      setIsTenantFileModalOpen(false)
      refetchTenantDocuments() // Refetch documents after successful upload
    } catch (error: any) {
      console.error("Error uploading files:", error)
      alert(`เกิดข้อผิดพลาดในการอัปโหลดไฟล์: ${error.message}`)
    } finally {
      setIsUploading(false)
    }
  }

  const handleTenantDocumentDelete = async (docId: string, fileUrl: string, docName: string) => {
    if (window.confirm(`คุณต้องการลบเอกสาร "${docName}" หรือไม่?`)) {
      try {
        const result = await deleteDocumentAction(docId, fileUrl)
        if (!result.success) {
          throw new Error(result.message)
        }
        alert(`เอกสาร "${docName}" ถูกลบแล้ว`)
        refetchTenantDocuments() // Refetch documents after successful deletion
      } catch (error: any) {
        console.error("Error deleting document:", error)
        alert(`เกิดข้อผิดพลาดในการลบเอกสาร: ${error.message}`)
      }
    }
  }

  const tenantDocumentTypes = [
    { value: "id_card", label: "สำเนาบัตรประชาชน" },
    { value: "rental_agreement", label: "สัญญาเช่า" },
    { value: "bank_account", label: "สำเนาบัญชีธนาคาร" },
    { value: "other", label: "อื่นๆ" },
  ]

  const columns = [
    {
      key: "full_name",
      header: "ชื่อผู้เช่า",
    },
    {
      key: "condo_id",
      header: "คอนโด",
      render: (tenant: Tenant) => {
        const condo = condos.find((c) => c.id === tenant.condo_id)
        return condo ? `${condo.name} (${condo.room_number})` : "ไม่ทราบ"
      },
    },
    {
      key: "phone",
      header: "ติดต่อ",
      render: (tenant: Tenant) => (
        <div className="flex items-center space-x-2">
          {tenant.phone && (
            <div className="flex items-center text-sm">
              <Phone className="h-3 w-3 mr-1" />
              {tenant.phone}
            </div>
          )}
          {tenant.line_id && (
            <div className="flex items-center text-sm">
              <MessageCircle className="h-3 w-3 mr-1" />
              {tenant.line_id}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "monthly_rent",
      header: "ค่าเช่า/เดือน",
      render: (tenant: Tenant) => `฿${tenant.monthly_rent.toLocaleString()}`,
    },
    {
      key: "rental_period",
      header: "ระยะเวลาเช่า",
      render: (tenant: Tenant) => (
        <div className="text-sm">
          <div>{new Date(tenant.rental_start).toLocaleDateString("th-TH")}</div>
          <div className="text-gray-400">ถึง {new Date(tenant.rental_end).toLocaleDateString("th-TH")}</div>
        </div>
      ),
    },
    {
      key: "status",
      header: "สถานะ",
      render: (tenant: Tenant) => {
        const endDate = new Date(tenant.rental_end)
        const today = new Date()
        const isExpiring = endDate <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)

        return (
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              tenant.is_active
                ? isExpiring
                  ? "bg-yellow-900 text-yellow-300"
                  : "bg-green-900 text-green-300"
                : "bg-red-900 text-red-300"
            }`}
          >
            {tenant.is_active ? (isExpiring ? "ใกล้หมดอายุ" : "ใช้งาน") : "ไม่ใช้งาน"}
          </span>
        )
      },
    },
    {
      key: "actions",
      header: "การดำเนินการ",
      render: (tenant: Tenant) => (
        <div className="flex space-x-2">
          <button onClick={() => handleEdit(tenant)} className="text-blue-400 hover:text-blue-300" title="แก้ไข">
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => openTenantFileModal(tenant)}
            className="text-green-400 hover:text-green-300"
            title="แนบไฟล์"
          >
            <FileText className="h-4 w-4" />
          </button>
          {tenant.is_active && (
            <button
              onClick={() => handleEndContract(tenant)}
              className="text-orange-400 hover:text-orange-300"
              title="สิ้นสุดสัญญา"
            >
              <UserX className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">ผู้เช่า</h1>
            <p className="text-gray-400">จัดการผู้เช่าและสัญญาเช่า</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            เพิ่มผู้เช่า
          </button>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <div className="flex items-center space-x-4">
            <Filter className="h-5 w-5 text-gray-400" />
            <div className="flex items-center space-x-4">
              <div>
                <label className="text-sm font-medium text-gray-300 mr-2">สถานะ:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "vacant")}
                  className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="active">มีผู้เช่า</option>
                  <option value="vacant">ห้องว่าง</option>
                  <option value="all">ทั้งหมด</option>
                </select>
              </div>
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
            </div>
            <span className="text-sm text-gray-400">พบ {filteredTenants.length} รายการ</span>
          </div>
        </div>

        {/* Tenants Table */}
        <DataTable
          data={filteredTenants}
          columns={columns}
          loading={loading}
          emptyMessage="ไม่พบผู้เช่า เพิ่มผู้เช่าแรกของคุณเพื่อเริ่มต้น"
          itemsPerPage={5}
        />

        {/* Add/Edit Modal */}
        <Modal isOpen={isModalOpen} onClose={resetForm} title={editingTenant ? "แก้ไขผู้เช่า" : "เพิ่มผู้เช่าใหม่"} size="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">ชื่อ-นามสกุล *</label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">คอนโด *</label>
                <select
                  required
                  value={formData.condo_id}
                  onChange={(e) => setFormData({ ...formData, condo_id: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">เลือกคอนโด</option>
                  {condos.map((condo) => (
                    <option key={condo.id} value={condo.id}>
                      {condo.name} ({condo.room_number})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">เบอร์โทรศัพท์</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Line ID</label>
                <input
                  type="text"
                  value={formData.line_id}
                  onChange={(e) => setFormData({ ...formData, line_id: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">วันที่เริ่มเช่า *</label>
                <input
                  type="date"
                  required
                  value={formData.rental_start}
                  onChange={(e) => setFormData({ ...formData, rental_start: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">วันที่สิ้นสุดสัญญา *</label>
                <input
                  type="date"
                  required
                  value={formData.rental_end}
                  onChange={(e) => setFormData({ ...formData, rental_end: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">เงินประกัน (บาท)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.deposit}
                  onChange={(e) => setFormData({ ...formData, deposit: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">ค่าเช่าต่อเดือน (บาท) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.monthly_rent}
                  onChange={(e) => setFormData({ ...formData, monthly_rent: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                {editingTenant ? "อัพเดท" : "เพิ่ม"}ผู้เช่า
              </button>
            </div>
          </form>
        </Modal>

        {/* End Contract Modal */}
        <Modal
          isOpen={isEndContractModalOpen}
          onClose={() => {
            setIsEndContractModalOpen(false)
            setSelectedTenantForEnd(null)
          }}
          title="สิ้นสุดสัญญาเช่า"
          size="md"
        >
          <form onSubmit={submitEndContract} className="space-y-4">
            <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
              <p className="text-yellow-300 text-sm">
                การดำเนินการนี้จะย้ายผู้เช่า "{selectedTenantForEnd?.full_name}" ไปยังประวัติผู้เช่า
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">สาเหตุการสิ้นสุดสัญญา *</label>
              <select
                required
                value={endContractData.end_reason}
                onChange={(e) =>
                  setEndContractData({
                    ...endContractData,
                    end_reason: e.target.value as "expired" | "early_termination" | "changed_tenant",
                  })
                }
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="expired">หมดอายุสัญญา</option>
                <option value="early_termination">ยกเลิกก่อนกำหนด</option>
                <option value="changed_tenant">เปลี่ยนผู้เช่า</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">วันที่ย้ายออกจริง *</label>
              <input
                type="date"
                required
                value={endContractData.actual_end_date}
                onChange={(e) => setEndContractData({ ...endContractData, actual_end_date: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">หมายเหตุ</label>
              <textarea
                value={endContractData.notes}
                onChange={(e) => setEndContractData({ ...endContractData, notes: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                rows={3}
                placeholder="เช่น: ผู้เช่าย้ายงาน, ไม่พอใจบริการ, เปลี่ยนเป็นผู้เช่าใหม่ ฯลฯ"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsEndContractModalOpen(false)
                  setSelectedTenantForEnd(null)
                }}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
              >
                สิ้นสุดสัญญา
              </button>
            </div>
          </form>
        </Modal>

        {/* File Upload Modal for Tenants */}
        <Modal
          isOpen={isTenantFileModalOpen}
          onClose={() => {
            setIsTenantFileModalOpen(false)
            setSelectedTenantForFile(null)
            setUploadedFiles([])
            setDocumentType("")
          }}
          title={`แนบไฟล์ - ${selectedTenantForFile?.full_name}`}
          size="lg"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">ประเภทเอกสาร *</label>
              <select
                required
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">เลือกประเภทเอกสาร</option>
                {tenantDocumentTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">เลือกไฟล์เอกสาร</label>
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400 mb-2">ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์</p>
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  id="tenant-file-upload"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                />
                <label
                  htmlFor="tenant-file-upload"
                  className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg cursor-pointer transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  เพิ่มไฟล์
                </label>
                <p className="text-xs text-gray-500 mt-2">รองรับไฟล์: PDF, DOC, DOCX, JPG, PNG, TXT</p>
              </div>
            </div>

            {uploadedFiles.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">ไฟล์ที่เลือก ({uploadedFiles.length} ไฟล์):</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-700 p-3 rounded-lg">
                      <div className="flex items-center flex-1 min-w-0">
                        <File className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <span className="text-sm text-white truncate block">{file.name}</span>
                          <span className="text-xs text-gray-400">
                            {(file.size / 1024).toFixed(1)} KB • {file.type || "Unknown type"}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-red-400 hover:text-red-300 ml-2 flex-shrink-0"
                        title="ลบไฟล์"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tenantDocuments.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">เอกสารที่มีอยู่ ({tenantDocuments.length} ไฟล์):</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {tenantDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between bg-gray-700 p-3 rounded-lg">
                      <div className="flex items-center flex-1 min-w-0">
                        <File className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <span className="text-sm text-white truncate block">{doc.name}</span>
                          <span className="text-xs text-gray-400">
                            {tenantDocumentTypes.find((t) => t.value === doc.document_type)?.label ||
                              doc.document_type ||
                              "ไม่ระบุประเภท"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-2 flex-shrink-0">
                        {doc.file_url && (
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300"
                            title="ดู/ดาวน์โหลด"
                          >
                            <Eye className="h-4 w-4" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleTenantDocumentDelete(doc.id, doc.file_url || "", doc.name)}
                          className="text-red-400 hover:text-red-300"
                          title="ลบเอกสาร"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsTenantFileModalOpen(false)
                  setSelectedTenantForFile(null)
                  setUploadedFiles([])
                  setDocumentType("")
                }}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleTenantFileSubmit}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={uploadedFiles.length === 0 || !documentType || isUploading}
              >
                {isUploading ? "กำลังอัปโหลด..." : `อัปโหลดไฟล์ (${uploadedFiles.length})`}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </MainLayout>
  )
}
