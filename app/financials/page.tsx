"use client"

import type React from "react"
import { useState, useMemo } from "react"
import { Plus, TrendingUp, TrendingDown, DollarSign, Filter, Edit, FileText, X, Eye, Upload, File } from "lucide-react"
import { MainLayout } from "@/components/layout/main-layout"
import { DataTable } from "@/components/ui/data-table"
import { Notification } from "@/components/ui/notification" 
import { StatsCard } from "@/components/ui/stats-card"
import { Modal } from "@/components/ui/modal"
import { ConfirmationModal } from "@/components/ui/confirmation-modal" // Import ConfirmationModal
import { useFinancialRecordsDB, useCondosDB, useDocumentsDB } from "@/lib/hooks/use-database"
import { useAuth } from "@/lib/auth-context"
import type { IncomeRecord, ExpenseRecord } from "@/lib/supabase"
import { uploadDocument, deleteDocumentAction } from "@/app/actions/document-actions" // Import Server Actions

export default function FinancialsPage() {
  const { user } = useAuth()
  const { condos } = useCondosDB(user?.id) // ดึงเฉพาะ condos ของ user นั้นๆ
  const {
    incomeRecords,
    expenseRecords,
    loading,
    addIncomeRecord,
    addExpenseRecord,
    updateIncomeRecord,
    updateExpenseRecord,
    deleteIncomeRecord,
    deleteExpenseRecord,
  } = useFinancialRecordsDB(user?.id) // ดึงข้อมูลการเงินที่เกี่ยวข้องกับ user
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [recordType, setRecordType] = useState<"income" | "expense">("income")
  const [selectedCondoFilter, setSelectedCondoFilter] = useState<string>("") // Filter state for condo
  const [editingRecord, setEditingRecord] = useState<IncomeRecord | ExpenseRecord | null>(null)
  

  // New filter states for year and month
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString())
  const [selectedMonth, setSelectedMonth] = useState<string>("")
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null)
  // Document states (for financial records - though schema limitation exists)
  const [isFileModalOpen, setIsFileModalOpen] = useState(false)
  const [selectedFinancialRecordForFile, setSelectedFinancialRecordForFile] = useState<
    IncomeRecord | ExpenseRecord | null
  >(null)
  const {
    documents,
    loading: documentsLoading,
    refetch: refetchDocuments,
  } = useDocumentsDB(selectedFinancialRecordForFile?.condo_id)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [documentType, setDocumentType] = useState<string>("")
  const [isUploading, setIsUploading] = useState(false)

  // Delete confirmation state
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState<{ id: string; type: "income" | "expense"; name: string } | null>(
    null,
  )

  const [formData, setFormData] = useState({
    id: "", // For editing
    condo_id: "",
    type: "",
    amount: "",
    date: "",
    description: "",
    category: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const recordData = {
      condo_id: formData.condo_id,
      type: formData.type,
      amount: Number.parseFloat(formData.amount),
      date: formData.date,
      description: formData.description || undefined,
      category: formData.category || undefined,
    }

    try {
      if (editingRecord) {
        if (recordType === "income") {
          await updateIncomeRecord(editingRecord.id, recordData)
        } else {
          await updateExpenseRecord(editingRecord.id, recordData)
        }
        alert(`อัพเดท${recordType === "income" ? "รายรับ" : "รายจ่าย"}สำเร็จ`)
      } else {
        if (recordType === "income") {
          await addIncomeRecord(recordData)
        } else {
          await addExpenseRecord(recordData)
        }
        alert(`บันทึก${recordType === "income" ? "รายรับ" : "รายจ่าย"}สำเร็จ`)
      }
      resetForm()
    } catch (error) {
      console.error(`Error saving ${recordType} record:`, error)
      alert(`เกิดข้อผิดพลาดในการบันทึก${recordType === "income" ? "รายรับ" : "รายจ่าย"}`)
    }
  }

  const resetForm = () => {
    setFormData({
      id: "",
      condo_id: "",
      type: "",
      amount: "",
      date: "",
      description: "",
      category: "",
    })
    setEditingRecord(null)
    setIsModalOpen(false)
  }

  const openModal = (type: "income" | "expense", record?: IncomeRecord | ExpenseRecord) => {
    setRecordType(type)
    if (record) {
      setEditingRecord(record)
      setFormData({
        id: record.id,
        condo_id: record.condo_id,
        type: record.type,
        amount: record.amount.toString(),
        date: record.date,
        description: record.description || "",
        category: record.category || "",
      })
    } else {
      setEditingRecord(null)
      setFormData({
        id: "",
        condo_id: condos.length > 0 ? condos[0].id : "", // Set default condo if available
        type: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        description: "",
        category: "",
      })
    }
    setIsModalOpen(true)
  }

  // Filter records based on selected condo, year, and month
  const filteredIncomeRecords = useMemo(() => {
    return incomeRecords.filter((r) => {
      const recordDate = new Date(r.date)
      const yearMatch = selectedYear === "" || recordDate.getFullYear().toString() === selectedYear
      const monthMatch = selectedMonth === "" || (recordDate.getMonth() + 1).toString() === selectedMonth
      const condoMatch = !selectedCondoFilter || r.condo_id === selectedCondoFilter
      return yearMatch && monthMatch && condoMatch
    })
  }, [incomeRecords, selectedCondoFilter, selectedYear, selectedMonth])

  const filteredExpenseRecords = useMemo(() => {
    return expenseRecords.filter((r) => {
      const recordDate = new Date(r.date)
      const yearMatch = selectedYear === "" || recordDate.getFullYear().toString() === selectedYear
      const monthMatch = selectedMonth === "" || (recordDate.getMonth() + 1).toString() === selectedMonth
      const condoMatch = !selectedCondoFilter || r.condo_id === selectedCondoFilter
      return yearMatch && monthMatch && condoMatch
    })
  }, [expenseRecords, selectedCondoFilter, selectedYear, selectedMonth])

  // Calculate totals based on filtered records
  const totalIncome = filteredIncomeRecords.reduce((sum, record) => sum + record.amount, 0)
  const totalExpenses = filteredExpenseRecords.reduce((sum, record) => sum + record.amount, 0)
  const netIncome = totalIncome - totalExpenses

  // Document upload for financial records (illustrative due to schema limitation)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setUploadedFiles((prev) => [...prev, ...files])
  }

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const openFileModal = (record: IncomeRecord | ExpenseRecord) => {
    setSelectedFinancialRecordForFile(record)
    setUploadedFiles([])
    setDocumentType("")
    setIsFileModalOpen(true)
    refetchDocuments() // Refetch documents when opening modal
  }

  const handleFileSubmit = async () => {
    if (uploadedFiles.length === 0) {
      alert("กรุณาเลือกไฟล์ที่ต้องการอัปโหลด")
      return
    }
    if (!documentType) {
      alert("กรุณาเลือกประเภทเอกสาร")
      return
    }
    if (!selectedFinancialRecordForFile) return

    setIsUploading(true)
    try {
      // IMPORTANT: The current 'documents' table schema only links to condo_id or tenant_id.
      // To link directly to financial records, the 'documents' table would need new columns
      // like 'income_record_id' or 'expense_record_id'.
      // For this demo, we'll link to the condo_id of the financial record.
      for (const file of uploadedFiles) {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("condoId", selectedFinancialRecordForFile.condo_id) // Linking to condo_id as per current schema
        formData.append("documentType", documentType)
        // If documents table supported record_id, you'd add:
        // formData.append("recordId", selectedFinancialRecordForFile.id);

        const result = await uploadDocument(formData)
        if (!result.success) {
          throw new Error(result.message)
        }
      }
      alert(`อัปโหลดไฟล์สำเร็จ ${uploadedFiles.length} ไฟล์ไปยังคอนโดที่เกี่ยวข้อง`)
      setUploadedFiles([])
      setDocumentType("")
      setIsFileModalOpen(false)
      refetchDocuments() // Refetch documents after successful upload
    } catch (error: any) {
      console.error("Error uploading files:", error)
      alert(`เกิดข้อผิดพลาดในการอัปโหลดไฟล์: ${error.message}`)
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
        alert(`เอกสาร "${docName}" ถูกลบแล้ว`)
        refetchDocuments() // Refetch documents after successful deletion
      } catch (error: any) {
        console.error("Error deleting document:", error)
        alert(`เกิดข้อผิดพลาดในการลบเอกสาร: ${error.message}`)
      }
    }
  }

  const handleDeleteConfirm = (id: string, type: "income" | "expense", name: string) => {
    setRecordToDelete({ id, type, name })
    setIsDeleteConfirmModalOpen(true)
  }

  const confirmDeleteRecord = async () => {
    if (recordToDelete) {
      try {
        if (recordToDelete.type === "income") {
          await deleteIncomeRecord(recordToDelete.id)
        } else {
          await deleteExpenseRecord(recordToDelete.id)
        }
        alert(`ลบรายการ "${recordToDelete.name}" สำเร็จ`)
      } catch (error) {
        console.error("Error deleting record:", error)
        alert("เกิดข้อผิดพลาดในการลบรายการ")
      } finally {
        setIsDeleteConfirmModalOpen(false)
        setRecordToDelete(null)
      }
    }
  }

  const documentTypes = [
    { value: "receipt", label: "ใบเสร็จ" },
    { value: "invoice", label: "ใบแจ้งหนี้" },
    { value: "bank_statement", label: "รายการเดินบัญชี" },
    { value: "other", label: "อื่นๆ" },
  ]

  const yearOptions = Array.from({ length: 3 }, (_, i) => currentYear - i) // Current year and 2 years back
  const monthOptions = [
    { value: "1", label: "มกราคม" },
    { value: "2", label: "กุมภาพันธ์" },
    { value: "3", label: "มีนาคม" },
    { value: "4", label: "เมษายน" },
    { value: "5", label: "พฤษภาคม" },
    { value: "6", label: "มิถุนายน" },
    { value: "7", label: "กรกฎาคม" },
    { value: "8", label: "สิงหาคม" },
    { value: "9", label: "กันยายน" },
    { value: "10", label: "ตุลาคม" },
    { value: "11", label: "พฤศจิกายน" },
    { value: "12", label: "ธันวาคม" },
  ]

  // Income columns
  const incomeColumns = [
    {
      key: "date",
      header: "วันที่",
      render: (record: ExpenseRecord) => {
        const condo = condos.find((c) => c.id === record.condo_id)
        return (
          <div>
            <div className="font-medium">{new Date(record.date).toLocaleDateString("th-TH")}</div>
            <div className="text-sm text-gray-400">
              {condo ? `${condo.name} (${condo.room_number})` : "ไม่ทราบคอนโด"}
            </div>
          </div>
        )
      },
    },
    {
      key: "type",
      header: "หัวข้อ", // Changed from "Type" to "หัวข้อ"
    },
    {
      key: "amount",
      header: "จำนวนเงิน",
      render: (record: IncomeRecord) => (
        <span className="text-green-400 font-medium">฿{record.amount.toLocaleString()}</span>
      ),
    },
    {
      key: "category",
      header: "หมวดหมู่",
    },
    {
      key: "description",
      header: "รายละเอียด",
      render: (payment: any) => payment.description || "-",
    },
    {
      key: "actions",
      header: "การดำเนินการ",
      render: (record: IncomeRecord) => (
        <div className="flex space-x-2">
          <button
            onClick={() => openModal("income", record)}
            className="text-blue-400 hover:text-blue-300"
            title="แก้ไข"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button onClick={() => openFileModal(record)} className="text-green-400 hover:text-green-300" title="แนบไฟล์">
            <FileText className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDeleteConfirm(record.id, "income", record.type)}
            className="text-red-400 hover:text-red-300"
            title="ลบ"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ]

  // Expense columns
  const expenseColumns = [
    {
      key: "date",
      header: "วันที่",
      render: (record: ExpenseRecord) => {
        const condo = condos.find((c) => c.id === record.condo_id)
        return (
          <div>
            <div className="font-medium">{new Date(record.date).toLocaleDateString("th-TH")}</div>
            <div className="text-sm text-gray-400">
              {condo ? `${condo.name} (${condo.room_number})` : "ไม่ทราบคอนโด"}
            </div>
          </div>
        )
      },
    },
    {
      key: "type",
      header: "หัวข้อ", // Changed from "Type" to "หัวข้อ"
    },
    {
      key: "amount",
      header: "จำนวนเงิน",
      render: (record: ExpenseRecord) => (
        <span className="text-red-400 font-medium">฿{record.amount.toLocaleString()}</span>
      ),
    },
    {
      key: "category",
      header: "หมวดหมู่",
    },
    {
      key: "description",
      header: "รายละเอียด",
      render: (payment: any) => payment.description || "-",
    },
    {
      key: "actions",
      header: "การดำเนินการ",
      render: (record: ExpenseRecord) => (
        <div className="flex space-x-2">
          <button
            onClick={() => openModal("expense", record)}
            className="text-blue-400 hover:text-blue-300"
            title="แก้ไข"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button onClick={() => openFileModal(record)} className="text-green-400 hover:text-green-300" title="แนบไฟล์">
            <FileText className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDeleteConfirm(record.id, "expense", record.type)}
            className="text-red-400 hover:text-red-300"
            title="ลบ"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ]

  const incomeCategories = ["ค่าเช่า", "ค่าที่จอดรถ", "ค่าปรับ", "อื่นๆ"]
  const expenseCategories = ["ค่าบำรุงรักษา", "ค่าน้ำ/ไฟ", "ค่าประกัน", "ภาษีทรัพย์สิน", "ค่าบริหารจัดการ", "อื่นๆ"]

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">การเงิน</h1>
            <p className="text-gray-400">ติดตามรายรับและรายจ่ายสำหรับอสังหาริมทรัพย์ของคุณ</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => openModal("income")}
              className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              เพิ่มรายรับ
            </button>
            <button
              onClick={() => openModal("expense")}
              className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              เพิ่มรายจ่าย
            </button>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCard title="รายได้รวม" value={`฿${totalIncome.toLocaleString()}`} icon={TrendingUp} />
          <StatsCard title="ค่าใช้จ่ายรวม" value={`฿${totalExpenses.toLocaleString()}`} icon={TrendingDown} />
          <StatsCard
            title="กำไรสุทธิ"
            value={`฿${netIncome.toLocaleString()}`}
            icon={DollarSign}
            trend={netIncome >= 0 ? { value: 0, isPositive: true } : { value: 0, isPositive: false }} // Icon based on positive/negative
          />
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
              <label className="text-sm font-medium text-gray-300 mr-2">ปี:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">ทุกปี</option>
                {yearOptions.map((year) => (
                  <option key={year} value={year.toString()}>
                    {year + 543}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-300 mr-2">เดือน:</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">ทุกเดือน</option>
                {monthOptions.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>
            <span className="text-sm text-gray-400">
              พบ {filteredIncomeRecords.length + filteredExpenseRecords.length} รายการ
            </span>
          </div>
        </div>

        {/* Income Records */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">รายการรายรับ</h2>
            <span className="text-sm text-gray-400">{filteredIncomeRecords.length} รายการ</span>
          </div>
          <DataTable
            data={filteredIncomeRecords}
            columns={incomeColumns}
            loading={loading}
            emptyMessage="ไม่พบรายการรายรับ"
            itemsPerPage={5}
          />
        </div>

        {/* Expense Records */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">รายการรายจ่าย</h2>
            <span className="text-sm text-gray-400">{filteredExpenseRecords.length} รายการ</span>
          </div>
          <DataTable
            data={filteredExpenseRecords}
            columns={expenseColumns}
            loading={loading}
            emptyMessage="ไม่พบรายการรายจ่าย"
            itemsPerPage={5}
          />
        </div>

        {/* Add/Edit Record Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={resetForm}
          title={
            editingRecord
              ? `แก้ไข${recordType === "income" ? "รายรับ" : "รายจ่าย"}`
              : `เพิ่ม${recordType === "income" ? "รายรับ" : "รายจ่าย"}`
          }
          size="md"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">หัวข้อ *</label> {/* Changed label */}
                <input
                  type="text"
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder={recordType === "income" ? "เช่น ค่าเช่ารายเดือน" : "เช่น ค่าซ่อมแอร์"}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">หมวดหมู่ *</label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">เลือกหมวดหมู่</option>
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
                <label className="block text-sm font-medium text-gray-300 mb-1">จำนวนเงิน *</label>
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
                <label className="block text-sm font-medium text-gray-300 mb-1">วันที่ *</label>
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
              <label className="block text-sm font-medium text-gray-300 mb-1">รายละเอียด</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                rows={3}
                placeholder="รายละเอียดเพิ่มเติม..."
              />
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
                className={`px-4 py-2 text-white rounded-lg transition-colors ${
                  recordType === "income" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {editingRecord ? "อัพเดท" : "เพิ่ม"}
                {recordType === "income" ? "รายรับ" : "รายจ่าย"}
              </button>
            </div>
          </form>
        </Modal>

        {/* File Upload Modal for Financial Records */}
        <Modal
          isOpen={isFileModalOpen}
          onClose={() => {
            setIsFileModalOpen(false)
            setSelectedFinancialRecordForFile(null)
            setUploadedFiles([])
            setDocumentType("")
          }}
          title={`แนบไฟล์สำหรับ ${selectedFinancialRecordForFile?.type || "รายการ"}`}
          size="lg"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              **หมายเหตุ:** เนื่องจากโครงสร้างฐานข้อมูลปัจจุบัน เอกสารจะถูกแนบกับคอนโดที่เกี่ยวข้องกับรายการนี้
              หากต้องการแนบเอกสารโดยตรงกับรายการรายรับ/รายจ่าย จะต้องมีการปรับปรุงโครงสร้างตาราง `documents`
            </p>
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
                  id="financial-file-upload"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                />
                <label
                  htmlFor="financial-file-upload"
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
                <h4 className="text-sm font-medium text-gray-300 mb-2">
                  เอกสารที่มีอยู่สำหรับคอนโดนี้ ({documents.length} ไฟล์):
                </h4>
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
                  setSelectedFinancialRecordForFile(null)
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
          isOpen={isDeleteConfirmModalOpen}
          onClose={() => setIsDeleteConfirmModalOpen(false)}
          onConfirm={confirmDeleteRecord}
          title={`ยืนยันการลบรายการ${recordToDelete?.type === "income" ? "รายรับ" : "รายจ่าย"}`}
          message={`คุณต้องการลบรายการ "${recordToDelete?.name}" นี้หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้`}
          confirmText="ลบ"
          cancelText="ยกเลิก"
          type="danger"
        />
      </div>
    </MainLayout>
  )
}
