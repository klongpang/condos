"use client";
import { NumericFormat } from "react-number-format";
import type React from "react";
import { useState, useMemo, useCallback } from "react";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Filter,
  Edit,
  FileText,
  X,
  Eye,
  Upload,
  File,
} from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";
import { DataTable } from "@/components/ui/data-table";
import { Notification } from "@/components/ui/notification";
import { StatsCard } from "@/components/ui/stats-card";
import { Modal } from "@/components/ui/modal";
import { ConfirmationModal } from "@/components/ui/confirmation-modal"; // Import ConfirmationModal
import { DocumentPreview } from "@/components/ui/document-preview"; // Import DocumentPreview
import {
  useFinancialRecordsDB,
  useCondosDB,
  useDocumentsDB,
  useTenantsDB,
} from "@/lib/hooks/use-database";
import { useAuth } from "@/lib/auth-context";
import type { IncomeRecord, ExpenseRecord } from "@/lib/supabase";
import {
  uploadDocument,
  deleteDocumentAction,
} from "@/app/actions/document-actions"; // Import Server Actions

export default function FinancialsPage() {
  const { user } = useAuth();
  const { condos } = useCondosDB(user?.id); // ดึงเฉพาะ condos ของ user นั้นๆ
  const { tenants } = useTenantsDB(user?.id);
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
  } = useFinancialRecordsDB(user?.id); // ดึงข้อมูลการเงินที่เกี่ยวข้องกับ user
  const pickTenantIdForCondo = useCallback(
    (condoId?: string) => {
      if (!condoId) return "";
      const active = tenants.find(
        (t) => t.condo_id === condoId && (t as any).is_active
      );
      if (active) return active.id;
      const anyone = tenants.find((t) => t.condo_id === condoId);
      return anyone?.id || "";
    },
    [tenants]
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recordType, setRecordType] = useState<"income" | "expense">("income");
  const [selectedCondoFilter, setSelectedCondoFilter] = useState<string>(""); // Filter state for condo
  const [editingRecord, setEditingRecord] = useState<
    IncomeRecord | ExpenseRecord | null
  >(null);

  // New filter states for year and month
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<string>(
    currentYear.toString()
  );
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  // Document states (for financial records - though schema limitation exists)
  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const [selectedFinancialRecordForFile, setSelectedFinancialRecordForFile] =
    useState<IncomeRecord | ExpenseRecord | null>(null);
  // ช่วยคำนวณ flag ให้อ่านง่าย (optional)
  const isIncome = recordType === "income" && !!selectedFinancialRecordForFile;
  const isExpense =
    recordType === "expense" && !!selectedFinancialRecordForFile;

  const {
    documents,
    loading: documentsLoading,
    refetch: refetchDocuments,
  } = useDocumentsDB({
    incomeId: isIncome
      ? (selectedFinancialRecordForFile as IncomeRecord).id
      : undefined,
    expenseId: isExpense
      ? (selectedFinancialRecordForFile as ExpenseRecord).id
      : undefined,
    scope: isIncome ? "income" : isExpense ? "expense" : "any",
    // ถ้าต้องการให้ลิสต์ใน modal ตรงกับประเภทที่เลือกเท่านั้น ให้กรองด้วย:
    // documentType: documentType || undefined,   // (ใส่เฉพาะเวลาที่ผู้ใช้เลือกแล้ว)
  });

  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [documentType, setDocumentType] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);

  // Delete confirmation state
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] =
    useState(false);
  const [recordToDelete, setRecordToDelete] = useState<{
    id: string;
    type: "income" | "expense";
    name: string;
  } | null>(null);

  const [isDocDeleteModalOpen, setIsDocDeleteModalOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<{
    id: string;
    fileUrl: string; // ส่งเป็น string เสมอ ตามพฤติกรรมเดิม
    name: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    id: "", // For editing
    condo_id: "",
    tenant_id: "",
    type: "",
    amount: "",
    date: "",
    description: "",
    category: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const recordData = {
      condo_id: formData.condo_id,
      tenant_id: formData.tenant_id || undefined,
      type: formData.type,
      amount: Number.parseFloat(formData.amount),
      date: formData.date,
      description: formData.description || undefined,
      category: formData.category || undefined,
    };

    try {
      if (editingRecord) {
        if (recordType === "income") {
          await updateIncomeRecord(editingRecord.id, recordData);
        } else {
          await updateExpenseRecord(editingRecord.id, recordData);
        }
        setNotification({ message: `บันทึกสำเร็จ`, type: "success" });
      } else {
        if (recordType === "income") {
          await addIncomeRecord(recordData);
        } else {
          await addExpenseRecord(recordData);
        }
        setNotification({ message: `บันทึกสำเร็จ`, type: "success" });
      }
      resetForm();
    } catch (error) {
      console.error(`Error saving ${recordType} record:`, error);
      setNotification({ message: `บันทึกเกิดข้อผิดพลาด`, type: "error" });
    }
  };

  const resetForm = () => {
    setFormData({
      id: "",
      condo_id: "",
      tenant_id: "",
      type: "",
      amount: "",
      date: "",
      description: "",
      category: "",
    });
    setEditingRecord(null);
    setIsModalOpen(false);
  };

  const openModal = (
    type: "income" | "expense",
    record?: IncomeRecord | ExpenseRecord
  ) => {
    setRecordType(type);

    if (record) {
      // แก้ไข: ใช้ tenant_id จาก record เดิม (ถ้ามี)
      setEditingRecord(record);
      setFormData({
        id: record.id,
        condo_id: record.condo_id,
        tenant_id:
          (record as any).tenant_id || pickTenantIdForCondo(record.condo_id), // ✅ auto fill
        type: record.type,
        amount: record.amount.toString(),
        date: record.date,
        description: record.description || "",
        category: record.category || "",
      });
    } else {
      // เพิ่มใหม่: auto เลือก condo+tenant เริ่มต้น
      const defaultCondoId = condos.length > 0 ? condos[0].id : "";
      setEditingRecord(null);
      setFormData({
        id: "",
        condo_id: defaultCondoId,
        tenant_id: pickTenantIdForCondo(defaultCondoId), // ✅ auto fill
        type: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        description: "",
        category: "",
      });
    }

    setIsModalOpen(true);
  };

  // Filter records based on selected condo, year, and month
  const filteredIncomeRecords = useMemo(() => {
    return incomeRecords.filter((r) => {
      const recordDate = new Date(r.date);
      const yearMatch =
        selectedYear === "" ||
        recordDate.getFullYear().toString() === selectedYear;
      const monthMatch =
        selectedMonth === "" ||
        (recordDate.getMonth() + 1).toString() === selectedMonth;
      const condoMatch =
        !selectedCondoFilter || r.condo_id === selectedCondoFilter;
      return yearMatch && monthMatch && condoMatch;
    });
  }, [incomeRecords, selectedCondoFilter, selectedYear, selectedMonth]);

  const filteredExpenseRecords = useMemo(() => {
    return expenseRecords.filter((r) => {
      const recordDate = new Date(r.date);
      const yearMatch =
        selectedYear === "" ||
        recordDate.getFullYear().toString() === selectedYear;
      const monthMatch =
        selectedMonth === "" ||
        (recordDate.getMonth() + 1).toString() === selectedMonth;
      const condoMatch =
        !selectedCondoFilter || r.condo_id === selectedCondoFilter;
      return yearMatch && monthMatch && condoMatch;
    });
  }, [expenseRecords, selectedCondoFilter, selectedYear, selectedMonth]);

  // Calculate totals based on filtered records
  const totalIncome = filteredIncomeRecords.reduce(
    (sum, record) => sum + record.amount,
    0
  );
  const totalExpenses = filteredExpenseRecords.reduce(
    (sum, record) => sum + record.amount,
    0
  );
  const netIncome = totalIncome - totalExpenses;

  // Document upload for financial records (illustrative due to schema limitation)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const openFileModal = (
    record: IncomeRecord | ExpenseRecord,
    type: "income" | "expense"
  ) => {
    setRecordType(type); // ✅ สำคัญ: เซ็ตชนิดให้ตรง
    setSelectedFinancialRecordForFile(record);
    setUploadedFiles([]);
    setDocumentType("");
    setIsFileModalOpen(true);
    refetchDocuments();
  };

  const handleFileSubmit = async () => {
    if (uploadedFiles.length === 0) {
      alert("กรุณาเลือกไฟล์ที่ต้องการอัปโหลด");
      return;
    }
    if (!documentType) {
      alert("กรุณาเลือกประเภทเอกสาร");
      return;
    }
    if (!selectedFinancialRecordForFile) return;

    const isIncome = recordType === "income";

    setIsUploading(true);
    try {
      for (const file of uploadedFiles) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("documentType", documentType);

        // เก็บ condo_id เสมอ (มีใน record)
        fd.append("condoId", selectedFinancialRecordForFile.condo_id);

        // ✅ tenant_id มาจาก record ตรง ๆ
        const tid = (selectedFinancialRecordForFile as any).tenant_id;
        if (tid) fd.append("tenantId", tid);

        // ✅ สำคัญ: แยกตามประเภท
        if (isIncome) {
          fd.append("incomeId", selectedFinancialRecordForFile.id);
        } else {
          fd.append("expenseId", selectedFinancialRecordForFile.id);
        }

        const result = await uploadDocument(fd);
        if (!result.success) {
          throw new Error(result.message);
        }
      }

      setNotification({
        message: `อัปโหลดไฟล์สำเร็จ ${uploadedFiles.length} ไฟล์`,
        type: "success",
      });
      setUploadedFiles([]);
      setDocumentType("");
      setIsFileModalOpen(false);
      refetchDocuments();
    } catch (error: any) {
      console.error("Error uploading files:", error);
      setNotification({
        message: `เกิดข้อผิดพลาดในการอัปโหลดไฟล์: ${error.message}`,
        type: "error",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDocumentDelete = (
    docId: string,
    fileUrl: string,
    docName: string
  ) => {
    setDocToDelete({ id: docId, fileUrl, name: docName });
    setIsDocDeleteModalOpen(true);
  };

  const confirmDocDelete = async () => {
    if (!docToDelete) return;
    try {
      const result = await deleteDocumentAction(
        docToDelete.id,
        docToDelete.fileUrl || "" // บังคับส่ง string เสมอ
      );
      if (!result.success) {
        throw new Error(result.message);
      }
      setNotification({
        message: `เอกสาร "${docToDelete.name}" ถูกลบแล้ว`,
        type: "success",
      });
      refetchDocuments();
    } catch (error: any) {
      console.error("Error deleting document:", error);
      setNotification({
        message: `เกิดข้อผิดพลาดในการลบเอกสาร`,
        type: "error",
      });
    } finally {
      setIsDocDeleteModalOpen(false);
      setDocToDelete(null);
    }
  };

  const handleDeleteConfirm = (
    id: string,
    type: "income" | "expense",
    name: string
  ) => {
    setRecordToDelete({ id, type, name });
    setIsDeleteConfirmModalOpen(true);
  };

  const confirmDeleteRecord = async () => {
    if (recordToDelete) {
      try {
        if (recordToDelete.type === "income") {
          await deleteIncomeRecord(recordToDelete.id);
        } else {
          await deleteExpenseRecord(recordToDelete.id);
        }
        setNotification({ message: `ลบสำเร็จ`, type: "success" });
      } catch (error) {
        console.error("Error deleting record:", error);
        setNotification({ message: `การลบเกิดผิดพลาด`, type: "error" });
      } finally {
        setIsDeleteConfirmModalOpen(false);
        setRecordToDelete(null);
      }
    }
  };

  const documentTypes = [
    { value: "receipt", label: "ใบเสร็จ" },
    { value: "invoice", label: "ใบแจ้งหนี้" },
    { value: "bank_statement", label: "รายการเดินบัญชี" },
    { value: "other", label: "อื่นๆ" },
  ];

  const yearOptions = Array.from({ length: 3 }, (_, i) => currentYear - i); // Current year and 2 years back
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
  ];

  // Income columns
  const incomeColumns = [
    {
      key: "date",
      header: "วันที่",
      render: (record: ExpenseRecord) => {
        const condo = condos.find((c) => c.id === record.condo_id);
        return (
          <div>
            <div className="font-medium">
              {new Date(record.date).toLocaleDateString("th-TH")}
            </div>
            <div className="text-sm text-gray-400">
              {condo ? `${condo.name} (${condo.room_number})` : "ไม่ทราบคอนโด"}
            </div>
          </div>
        );
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
        <span className="text-green-400 font-medium">
          ฿{record.amount.toLocaleString()}
        </span>
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
          <button
            onClick={() => openFileModal(record, "income")} // ✅ ส่ง "income"
            className="text-green-400 hover:text-green-300"
            title="แนบไฟล์"
          >
            <FileText className="h-4 w-4" />
          </button>
          <button
            onClick={() =>
              handleDeleteConfirm(record.id, "income", record.type)
            }
            className="text-red-400 hover:text-red-300"
            title="ลบ"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  // Expense columns
  const expenseColumns = [
    {
      key: "date",
      header: "วันที่",
      render: (record: ExpenseRecord) => {
        const condo = condos.find((c) => c.id === record.condo_id);
        return (
          <div>
            <div className="font-medium">
              {new Date(record.date).toLocaleDateString("th-TH")}
            </div>
            <div className="text-sm text-gray-400">
              {condo ? `${condo.name} (${condo.room_number})` : "ไม่ทราบคอนโด"}
            </div>
          </div>
        );
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
        <span className="text-red-400 font-medium">
          ฿{record.amount.toLocaleString()}
        </span>
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
          <button
            onClick={() => openFileModal(record, "expense")} // ✅ ส่ง "expense"
            className="text-green-400 hover:text-green-300"
            title="แนบไฟล์"
          >
            <FileText className="h-4 w-4" />
          </button>

          <button
            onClick={() =>
              handleDeleteConfirm(record.id, "expense", record.type)
            }
            className="text-red-400 hover:text-red-300"
            title="ลบ"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const incomeCategories = [
    "ค่าเช่า",
    "ค่าที่จอดรถ",
    "ค่าประกัน",
    "ค่าปรับ",
    "อื่นๆ",
  ];
  const expenseCategories = [
    "ค่าบำรุงรักษา",
    "ตกแต่งห้อง",
    "ค่าน้ำ/ไฟ",
    "ค่าประกัน",
    "ค่านายหน้า",
    "อื่นๆ",
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Notification */}
        {notification && (
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        )}

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">การเงิน</h1>
            <p className="text-gray-400">
              ติดตามรายรับและรายจ่ายสำหรับอสังหาริมทรัพย์ของคุณ
            </p>
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
          <StatsCard
            title="รายได้รวม"
            value={`฿${totalIncome.toLocaleString()}`}
            icon={TrendingUp}
          />
          <StatsCard
            title="ค่าใช้จ่ายรวม"
            value={`฿${totalExpenses.toLocaleString()}`}
            icon={TrendingDown}
          />
          <StatsCard
            title="กำไรสุทธิ"
            value={`฿${netIncome.toLocaleString()}`}
            icon={DollarSign}
            trend={
              netIncome >= 0
                ? { value: 0, isPositive: true }
                : { value: 0, isPositive: false }
            } // Icon based on positive/negative
          />
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <div className="flex items-center space-x-4">
            <Filter className="h-5 w-5 text-gray-400" />
            <div>
              <label className="text-sm font-medium text-gray-300 mr-2">
                คอนโด:
              </label>
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
              <label className="text-sm font-medium text-gray-300 mr-2">
                ปี:
              </label>
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
              <label className="text-sm font-medium text-gray-300 mr-2">
                เดือน:
              </label>
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
              พบ {filteredIncomeRecords.length + filteredExpenseRecords.length}{" "}
              รายการ
            </span>
          </div>
        </div>

        {/* Income Records */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">รายการรายรับ</h2>
            <span className="text-sm text-gray-400">
              {filteredIncomeRecords.length} รายการ
            </span>
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
            <span className="text-sm text-gray-400">
              {filteredExpenseRecords.length} รายการ
            </span>
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
              <label className="block text-sm font-medium text-gray-300 mb-1">
                คอนโด *
              </label>
              <select
                required
                value={formData.condo_id}
                onChange={(e) => {
                  const nextCondoId = e.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    condo_id: nextCondoId,
                    tenant_id: pickTenantIdForCondo(nextCondoId), // ✅ auto fill ผู้เช่า
                  }));
                }}
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
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  หัวข้อ *
                </label>{" "}
                {/* Changed label */}
                <input
                  type="text"
                  required
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder={
                    recordType === "income"
                      ? "เช่น ค่าเช่ารายเดือน"
                      : "เช่น ค่าซ่อมแอร์"
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  หมวดหมู่ *
                </label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">เลือกหมวดหมู่</option>
                  {(recordType === "income"
                    ? incomeCategories
                    : expenseCategories
                  ).map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  จำนวนเงิน (บาท) *
                </label>
                <NumericFormat
                  thousandSeparator=","
                  decimalScale={2}
                  allowNegative={false}
                  value={formData.amount}
                  onValueChange={(values) => {
                    setFormData({ ...formData, amount: values.value });
                  }}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  วันที่ *
                </label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                รายละเอียด
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                rows={3}
                placeholder="รายละเอียดเพิ่มเติม..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className={`px-4 py-2 text-white rounded-lg transition-colors ${
                  recordType === "income"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {editingRecord ? "บันทึก" : "บันทึก"}
              </button>
            </div>
          </form>
        </Modal>

        {/* File Upload Modal for Financial Records */}
        <Modal
          isOpen={isFileModalOpen}
          onClose={() => {
            setIsFileModalOpen(false);
            setSelectedFinancialRecordForFile(null);
            setUploadedFiles([]);
            setDocumentType("");
          }}
          title={`แนบไฟล์สำหรับ ${
            selectedFinancialRecordForFile?.type || "รายการ"
          }`}
          size="lg"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              เอกสารจะถูกผูกกับ
              {recordType === "income" ? "รายการรายรับ" : "รายการรายจ่าย"}นี้
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                ประเภทเอกสาร *
              </label>
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
              <label className="block text-sm font-medium text-gray-300 mb-2">
                เลือกไฟล์เอกสาร
              </label>
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400 mb-2">
                  ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์
                </p>
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
                <p className="text-xs text-gray-500 mt-2">
                  รองรับไฟล์: PDF, DOC, DOCX, JPG, PNG, TXT
                </p>
              </div>
            </div>

            {uploadedFiles.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">
                  เอกสารของ
                  {recordType === "income" ? "รายการรายรับ" : "รายการรายจ่าย"}
                  นี้ ({documents.length} ไฟล์
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-gray-700 p-3 rounded-lg"
                    >
                      <div className="flex items-center flex-1 min-w-0">
                        <File className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <span className="text-sm text-white truncate block">
                            {file.name}
                          </span>
                          <span className="text-xs text-gray-400">
                            {(file.size / 1024).toFixed(1)} KB •{" "}
                            {file.type || "Unknown type"}
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
                <DocumentPreview
                  documents={documents}
                  documentTypes={documentTypes}
                  loading={documentsLoading}
                  onDeleteDocument={handleDocumentDelete}
                  title="เอกสารที่มีอยู่สำหรับรายการนี้"
                  maxColumns={2}
                />
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsFileModalOpen(false);
                  setSelectedFinancialRecordForFile(null);
                  setUploadedFiles([]);
                  setDocumentType("");
                }}
                className="px-4 py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleFileSubmit}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={
                  uploadedFiles.length === 0 || !documentType || isUploading
                }
              >
                {isUploading
                  ? "กำลังอัปโหลด..."
                  : `บันทึก (${uploadedFiles.length})`}
              </button>
            </div>
          </div>
        </Modal>
        <ConfirmationModal
          isOpen={isDocDeleteModalOpen}
          onClose={() => {
            setIsDocDeleteModalOpen(false);
            setDocToDelete(null);
          }}
          onConfirm={confirmDocDelete}
          title="ยืนยันการลบเอกสาร"
          message={`คุณแน่ใจหรือไม่ว่าต้องการลบเอกสาร "${
            docToDelete?.name || ""
          }"? การดำเนินการนี้ไม่สามารถย้อนกลับได้`}
          confirmText="ยืนยัน"
          cancelText="ยกเลิก"
          type="danger"
        />

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={isDeleteConfirmModalOpen}
          onClose={() => setIsDeleteConfirmModalOpen(false)}
          onConfirm={confirmDeleteRecord}
          title={`ยืนยันการลบรายการ${
            recordToDelete?.type === "income" ? "รายรับ" : "รายจ่าย"
          }`}
          message={`คุณต้องการลบรายการ "${recordToDelete?.name}" นี้หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้`}
          confirmText="ยืนยัน"
          cancelText="ยกเลิก"
          type="danger"
        />
      </div>
    </MainLayout>
  );
}
