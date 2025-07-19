"use client"

import type React from "react"
import { useState } from "react"
import { Plus, Edit, FileText, Upload, File, X, Eye } from "lucide-react"
import { MainLayout } from "@/components/layout/main-layout"
import { DataTable } from "@/components/ui/data-table"
import { Modal } from "@/components/ui/modal"
import { ConfirmationModal } from "@/components/ui/confirmation-modal"
import { Notification } from "@/components/ui/notification" // Import Notification
import { useAuth } from "@/lib/auth-context"
import type { Condo } from "@/lib/supabase"
import { useCondosDB, useDocumentsDB } from "@/lib/hooks/use-database"
import { uploadDocument, deleteDocumentAction } from "@/app/actions/document-actions" // Import Server Actions
import { NumericFormat } from 'react-number-format'

export default function CondosPage() {
  const { user } = useAuth()
  const { condos, loading, addCondo, updateCondo, deleteCondo } = useCondosDB(user?.id)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isFileModalOpen, setIsFileModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedCondo, setSelectedCondo] = useState<Condo | null>(null)
  const [editingCondo, setEditingCondo] = useState<Condo | null>(null)

  // Document states
  const { documents, loading: documentsLoading, refetch: refetchDocuments } = useDocumentsDB(selectedCondo?.id) // Use refetch
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [documentType, setDocumentType] = useState<string>("")
  const [isUploading, setIsUploading] = useState(false)

  // Notification state
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    room_number: "",
    description: "",
    purchase_price: "",
    purchase_date: "",
    seller: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const condoData = {
      ...formData,
      user_id: user?.id || "",
      purchase_price: formData.purchase_price ? Number.parseFloat(formData.purchase_price) : undefined,
      is_active: true,
    }

    try {
      if (editingCondo) {
        await updateCondo(editingCondo.id, condoData)
        setNotification({ message: "อัพเดทข้อมูลคอนโดสำเร็จ", type: "success" })
      } else {
        await addCondo(condoData)
        setNotification({ message: "เพิ่มคอนโดใหม่สำเร็จ", type: "success" })
      }
      resetForm()
    } catch (error) {
      console.error("Error saving condo:", error)
      setNotification({ message: "เกิดข้อผิดพลาดในการบันทึกข้อมูลคอนโด", type: "error" })
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      address: "",
      room_number: "",
      description: "",
      purchase_price: "",
      purchase_date: "",
      seller: "",
    })
    setEditingCondo(null)
    setIsModalOpen(false)
  }

  const handleEdit = (condo: Condo) => {
    setFormData({
      name: condo.name,
      address: condo.address,
      room_number: condo.room_number || "",
      description: condo.description || "",
      purchase_price: condo.purchase_price?.toString() || "",
      purchase_date: condo.purchase_date || "",
      seller: condo.seller || "",
    })
    setEditingCondo(condo)
    setIsModalOpen(true)
  }

  const handleDelete = (condo: Condo) => {
    setSelectedCondo(condo)
    setIsDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (selectedCondo) {
      try {
        await updateCondo(selectedCondo.id, { is_active: false })
        setNotification({ message: `คอนโด "${selectedCondo.name}" ถูกปิดใช้งานแล้ว`, type: "success" })
      } catch (error) {
        console.error("Error deactivating condo:", error)
        setNotification({ message: "เกิดข้อผิดพลาดในการปิดใช้งานคอนโด", type: "error" })
      } finally {
        setSelectedCondo(null)
        setIsDeleteModalOpen(false)
      }
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setUploadedFiles((prev) => [...prev, ...files])
  }

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const openFileModal = (condo: Condo) => {
    setSelectedCondo(condo)
    setUploadedFiles([])
    setDocumentType("")
    setIsFileModalOpen(true)
    refetchDocuments() // Refetch documents when opening modal
  }

  const handleFileSubmit = async () => {
    if (uploadedFiles.length === 0) {
      setNotification({ message: "กรุณาเลือกไฟล์ที่ต้องการอัปโหลด", type: "error" })
      return
    }
    if (!documentType) {
      setNotification({ message: "กรุณาเลือกประเภทเอกสาร", type: "error" })
      return
    }
    if (!selectedCondo) return

    setIsUploading(true)
    try {
      for (const file of uploadedFiles) {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("condoId", selectedCondo.id)
        formData.append("documentType", documentType)

        const result = await uploadDocument(formData)
        if (!result.success) {
          throw new Error(result.message)
        }
      }
      setNotification({ message: `อัปโหลดไฟล์สำเร็จ ${uploadedFiles.length} ไฟล์`, type: "success" })
      setUploadedFiles([])
      setDocumentType("")
      setIsFileModalOpen(false)
      refetchDocuments() // Refetch documents after successful upload
    } catch (error: any) {
      console.error("Error uploading files:", error)
      setNotification({ message: `เกิดข้อผิดพลาดในการอัปโหลดไฟล์: ${error.message}`, type: "error" })
    } finally {
      setIsUploading(false)
    }
  }

  const handleDocumentDelete = async (docId: string, fileUrl: string, docName: string) => {
    if (window.confirm(`คุณต้องการลบเอกสาร "${docName}" หรือไม่?`)) {
      try {
        const result = await deleteDocumentAction(docId, fileUrl)
        if (!result.success) {
          throw new Error(result.message)
        }
        setNotification({ message: `เอกสาร "${docName}" ถูกลบแล้ว`, type: "success" })
        refetchDocuments() // Refetch documents after successful deletion
      } catch (error: any) {
        console.error("Error deleting document:", error)
        setNotification({ message: `เกิดข้อผิดพลาดในการลบเอกสาร: ${error.message}`, type: "error" })
      }
    }
  }

  const columns = [
    {
      key: "name",
      header: "ชื่อคอนโด",
    },
    {
      key: "address",
      header: "ที่อยู่",
      render: (condo: Condo) => (
        <div className="max-w-xs truncate" title={condo.address}>
          {condo.address}
        </div>
      ),
    },
    {
      key: "room_number",
      header: "หมายเลขห้อง",
    },
    {
      key: "purchase_price",
      header: "ราคาซื้อ",
      render: (condo: Condo) => (condo.purchase_price ? `฿${condo.purchase_price.toLocaleString()}` : "ไม่ระบุ"),
    },
    {
      key: "purchase_date",
      header: "วันที่ซื้อ",
      render: (condo: Condo) =>
        condo.purchase_date ? new Date(condo.purchase_date).toLocaleDateString("th-TH") : "ไม่ระบุ",
    },
    {
      key: "actions",
      header: "การดำเนินการ",
      render: (condo: Condo) => (
        <div className="flex space-x-2">
          <button onClick={() => handleEdit(condo)} className="text-blue-400 hover:text-blue-300" title="แก้ไข">
            <Edit className="h-4 w-4" />
          </button>
          <button onClick={() => openFileModal(condo)} className="text-green-400 hover:text-green-300" title="แนบไฟล์">
            <FileText className="h-4 w-4" />
          </button>
          {/* <button onClick={() => handleDelete(condo)} className="text-red-400 hover:text-red-300" title="ปิดใช้งาน">
            <X className="h-4 w-4" />
          </button> */}
        </div>
      ),
    },
  ]

  const documentTypes = [
    { value: "condo_image", label: "รูปคอนโด" },
    { value: "purchase_contract", label: "สัญญาเช่าซื้อขาย" },
    { value: "land_deed", label: "โฉนด" },
    { value: "insurance", label: "ประกัน" },
    { value: "other", label: "อื่นๆ" },
  ]

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Notification */}
        {notification && (
          <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />
        )}

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">คอนโด</h1>
            <p className="text-gray-400">จัดการคอนโดของคุณ</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            เพิ่มคอนโด
          </button>
        </div>

        {/* Condos Table */}
        <DataTable
          data={condos.filter((c) => c.is_active)}
          columns={columns}
          loading={loading}
          emptyMessage="ไม่พบคอนโด เพิ่มคอนโดแรกของคุณเพื่อเริ่มต้น"
          itemsPerPage={10}
        />

        {/* Add/Edit Modal */}
        <Modal isOpen={isModalOpen} onClose={resetForm} title={editingCondo ? "แก้ไขคอนโด" : "เพิ่มคอนโดใหม่"} size="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">ชื่อคอนโด *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">หมายเลขห้อง</label>
                <input
                  type="text"
                  value={formData.room_number}
                  onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">ที่อยู่ *</label>
              <textarea
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">รายละเอียด</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">ราคาซื้อ (บาท)</label>
              <NumericFormat
                thousandSeparator=","
                decimalScale={2}
                allowNegative={false}
                value={formData.purchase_price}
                onValueChange={(values) => {
                  setFormData({ ...formData, purchase_price: values.value })
                }}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="0.00"
              />
            </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">วันที่ซื้อ</label>
                <input
                  type="date"
                  value={formData.purchase_date}
                  onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">ผู้ขาย</label>
                <input
                  type="text"
                  value={formData.seller}
                  onChange={(e) => setFormData({ ...formData, seller: e.target.value })}
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
                {editingCondo ? "อัพเดท" : "เพิ่ม"}คอนโด
              </button>
            </div>
          </form>
        </Modal>

        {/* File Upload Modal */}
        <Modal
          isOpen={isFileModalOpen}
          onClose={() => {
            setIsFileModalOpen(false)
            setSelectedCondo(null)
            setUploadedFiles([])
            setDocumentType("")
          }}
          title={`แนบไฟล์ - ${selectedCondo?.name}`}
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
                {documentTypes.map((type) => (
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
                  id="condo-file-upload"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                />
                <label
                  htmlFor="condo-file-upload"
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

            {documents.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">เอกสารที่มีอยู่ ({documents.length} ไฟล์):</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between bg-gray-700 p-3 rounded-lg">
                      <div className="flex items-center flex-1 min-w-0">
                        <File className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <span className="text-sm text-white truncate block">{doc.name}</span>
                          <span className="text-xs text-gray-400">
                            {documentTypes.find((t) => t.value === doc.document_type)?.label ||
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
                          onClick={() => handleDocumentDelete(doc.id, doc.file_url || "", doc.name)}
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
                  setIsFileModalOpen(false)
                  setSelectedCondo(null)
                  setUploadedFiles([])
                  setDocumentType("")
                }}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleFileSubmit}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={uploadedFiles.length === 0 || !documentType || isUploading}
              >
                {isUploading ? "กำลังอัปโหลด..." : `อัปโหลดไฟล์ (${uploadedFiles.length})`}
              </button>
            </div>
          </div>
        </Modal>

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={confirmDelete}
          title="ปิดใช้งานคอนโด"
          message={`คุณต้องการปิดใช้งานคอนโด "${selectedCondo?.name}" หรือไม่? คอนโดจะถูกซ่อนจากรายการแต่ข้อมูลจะยังคงอยู่`}
          confirmText="ปิดใช้งาน"
          cancelText="ยกเลิก"
          type="warning"
        />
      </div>
    </MainLayout>
  )
}
