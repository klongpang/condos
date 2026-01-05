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
  AlertCircle,
} from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";
import { DataTable } from "@/components/ui/data-table";
import { Notification } from "@/components/ui/notification";
import { StatsCard } from "@/components/ui/stats-card";
import { Modal } from "@/components/ui/modal";
import { ConfirmationModal } from "@/components/ui/confirmation-modal"; // Import ConfirmationModal
import { DocumentPreview } from "@/components/ui/document-preview"; // Import DocumentPreview
import { DatePicker } from "@/components/ui/date-picker";
import { useCondos, useTenants, useFinancialRecords } from "@/lib/hooks/use-queries";
import { useDocumentsDB } from "@/lib/hooks/use-database";
import { useAuth } from "@/lib/auth-context";
import type { IncomeRecord, ExpenseRecord } from "@/lib/supabase";
import {
  uploadDocument,
  deleteDocumentAction,
} from "@/app/actions/document-actions"; // Import Server Actions
import {
  createIncomeAction,
  updateIncomeAction,
  deleteIncomeAction,
  createExpenseAction,
  updateExpenseAction,
  deleteExpenseAction,
} from "@/app/actions/financial-actions";


export default function FinancialsPage() {
  const { user } = useAuth();
  const { condos } = useCondos(user?.id);
  const { tenants } = useTenants(user?.id);
  const {
    incomeRecords,
    expenseRecords,
    loading,
    refetch: refetchFinancials,
  } = useFinancialRecords(user?.id);

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
  // Category filter states for each table
  const [selectedIncomeCategory, setSelectedIncomeCategory] = useState<string>("");
  const [selectedExpenseCategory, setSelectedExpenseCategory] = useState<string>("");
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

  // Form validation errors
  const [formErrors, setFormErrors] = useState<{
    condo_id?: string;
    type?: string;
    category?: string;
    amount?: string;
    date?: string;
  }>({});

  const validateForm = () => {
    const errors: typeof formErrors = {};
    
    if (!formData.condo_id) {
      errors.condo_id = "กรุณาเลือกคอนโด";
    }
    if (!formData.type) {
      errors.type = "กรุณากรอกหัวข้อ";
    }
    if (!formData.category) {
      errors.category = "กรุณาเลือกหมวดหมู่";
    }
    if (!formData.amount) {
      errors.amount = "กรุณากรอกจำนวนเงิน";
    }
    if (!formData.date) {
      errors.date = "กรุณาเลือกวันที่";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form before submitting
    if (!validateForm()) {
      return;
    }

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
          const result = await updateIncomeAction(editingRecord.id, recordData);
          if (!result.success) throw new Error(result.message);
        } else {
          const result = await updateExpenseAction(editingRecord.id, recordData);
          if (!result.success) throw new Error(result.message);
        }
        setNotification({ message: `บันทึกสำเร็จ`, type: "success" });
        refetchFinancials();
      } else {
        if (recordType === "income") {
          const result = await createIncomeAction(recordData);
          if (!result.success) throw new Error(result.message);
        } else {
          const result = await createExpenseAction(recordData);
          if (!result.success) throw new Error(result.message);
        }
        setNotification({ message: `บันทึกสำเร็จ`, type: "success" });
        refetchFinancials();
      }
      resetForm();
    } catch (error: any) {
      console.error(`Error saving ${recordType} record:`, error);
      setNotification({ message: `บันทึกเกิดข้อผิดพลาด: ${error.message || ""}`, type: "error" });
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
    setFormErrors({});
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
      const categoryMatch =
        !selectedIncomeCategory || r.category === selectedIncomeCategory;
      return yearMatch && monthMatch && condoMatch && categoryMatch;
    });
  }, [incomeRecords, selectedCondoFilter, selectedYear, selectedMonth, selectedIncomeCategory]);

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
      const categoryMatch =
        !selectedExpenseCategory || r.category === selectedExpenseCategory;
      return yearMatch && monthMatch && condoMatch && categoryMatch;
    });
  }, [expenseRecords, selectedCondoFilter, selectedYear, selectedMonth, selectedExpenseCategory]);

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
          const result = await deleteIncomeAction(recordToDelete.id);
          if (!result.success) throw new Error(result.message);
        } else {
          const result = await deleteExpenseAction(recordToDelete.id);
          if (!result.success) throw new Error(result.message);
        }
        setNotification({ message: `ลบสำเร็จ`, type: "success" });
        refetchFinancials();
      } catch (error: any) {
        console.error("Error deleting record:", error);
        setNotification({ message: `การลบเกิดผิดพลาด: ${error.message || ""}`, type: "error" });
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

  // Calculate year options based on actual data
  const yearOptions = useMemo(() => {
    const allRecords = [...incomeRecords, ...expenseRecords];
    if (allRecords.length === 0) {
      // If no data, show only current year
      return [currentYear];
    }
    
    // Find years from data, filtering out invalid years (e.g., Buddhist Era years stored incorrectly)
    const validYears = allRecords
      .map((r) => new Date(r.date).getFullYear())
      .filter((year) => year >= 2000 && year <= currentYear + 1); // Only valid CE years
    
    if (validYears.length === 0) {
      return [currentYear];
    }
    
    const minYear = Math.min(...validYears);
    const maxYear = Math.max(currentYear, Math.max(...validYears)); // Ensure current year is included
    
    // Generate array from maxYear to minYear (descending)
    const yearRange: number[] = [];
    for (let year = maxYear; year >= minYear; year--) {
      yearRange.push(year);
    }
    return yearRange;
  }, [incomeRecords, expenseRecords, currentYear]);
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
    "ค่าประกันห้อง",
    "ค่าส่วนกลาง",
    "ค่าปรับ",
    "อื่นๆ",
  ];
  const expenseCategories = [
    "ค่าบำรุงรักษา",
    "ค่าส่วนกลาง",
    "ค่าตกแต่งห้อง",
    "ค่าน้ำ/ไฟ",
    "ค่าประกันห้อง",
    "ค่าประกันภัย",
    "ค่านายหน้า",
    "ค่าภาษี",
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
              className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-lg shadow-green-900/20"
            >
              <Plus className="h-4 w-4 mr-2" />
              เพิ่มรายการ
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
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-400">หมวดหมู่:</label>
                <select
                  value={selectedIncomeCategory}
                  onChange={(e) => setSelectedIncomeCategory(e.target.value)}
                  className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">ทั้งหมด</option>
                  {incomeCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <span className="text-sm text-gray-400">
                {filteredIncomeRecords.length} รายการ
              </span>
            </div>
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
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-400">หมวดหมู่:</label>
                <select
                  value={selectedExpenseCategory}
                  onChange={(e) => setSelectedExpenseCategory(e.target.value)}
                  className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">ทั้งหมด</option>
                  {expenseCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <span className="text-sm text-gray-400">
                {filteredExpenseRecords.length} รายการ
              </span>
            </div>
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
              : "บันทึกรายการ"
          }
          size="md"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {!editingRecord && (
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setRecordType("income");
                    // Reset category when switching type to avoid invalid selection
                    setFormData(prev => ({ ...prev, category: "" }));
                  }}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all duration-200 ${
                    recordType === "income"
                      ? "border-green-500 bg-green-500/10 text-green-400 shadow-md shadow-green-900/10"
                      : "border-gray-700 bg-gray-800/50 text-gray-500 hover:border-gray-600 hover:bg-gray-800"
                  }`}
                >
                  <div className={`p-2 rounded-full mb-2 ${recordType === "income" ? "bg-green-500/20" : "bg-gray-700"}`}>
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <span className="font-medium text-base">รายรับ</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRecordType("expense");
                    // Reset category when switching type to avoid invalid selection
                    setFormData(prev => ({ ...prev, category: "" }));
                  }}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all duration-200 ${
                    recordType === "expense"
                      ? "border-red-500 bg-red-500/10 text-red-400 shadow-md shadow-red-900/10"
                      : "border-gray-700 bg-gray-800/50 text-gray-500 hover:border-gray-600 hover:bg-gray-800"
                  }`}
                >
                  <div className={`p-2 rounded-full mb-2 ${recordType === "expense" ? "bg-red-500/20" : "bg-gray-700"}`}>
                    <TrendingDown className="h-5 w-5" />
                  </div>
                  <span className="font-medium text-base">รายจ่าย</span>
                </button>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                คอนโด <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.condo_id}
                onChange={(e) => {
                  const nextCondoId = e.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    condo_id: nextCondoId,
                    tenant_id: pickTenantIdForCondo(nextCondoId),
                  }));
                  if (formErrors.condo_id) setFormErrors({ ...formErrors, condo_id: undefined });
                }}
                className={`w-full px-3 py-2 bg-gray-700 border rounded-md text-white focus:outline-none focus:ring-2 ${formErrors.condo_id ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-green-500'}`}
              >
                <option value="">เลือกคอนโด</option>
                {condos.map((condo) => (
                  <option key={condo.id} value={condo.id}>
                    {condo.name} ({condo.room_number})
                  </option>
                ))}
              </select>
              {formErrors.condo_id && (
                <div className="flex items-center mt-1 text-red-400 text-xs">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {formErrors.condo_id}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  หัวข้อ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.type}
                  onChange={(e) => {
                    setFormData({ ...formData, type: e.target.value });
                    if (formErrors.type) setFormErrors({ ...formErrors, type: undefined });
                  }}
                  className={`w-full px-3 py-2 bg-gray-700 border rounded-md text-white focus:outline-none focus:ring-2 ${formErrors.type ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-green-500'}`}
                  placeholder={
                    recordType === "income"
                      ? "เช่น ค่าเช่ารายเดือน"
                      : "เช่น ค่าซ่อมแอร์"
                  }
                />
                {formErrors.type && (
                  <div className="flex items-center mt-1 text-red-400 text-xs">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {formErrors.type}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  หมวดหมู่ <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => {
                    setFormData({ ...formData, category: e.target.value });
                    if (formErrors.category) setFormErrors({ ...formErrors, category: undefined });
                  }}
                  className={`w-full px-3 py-2 bg-gray-700 border rounded-md text-white focus:outline-none focus:ring-2 ${formErrors.category ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-green-500'}`}
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
                {formErrors.category && (
                  <div className="flex items-center mt-1 text-red-400 text-xs">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {formErrors.category}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  จำนวนเงิน (บาท) <span className="text-red-500">*</span>
                </label>
                <NumericFormat
                  thousandSeparator=","
                  decimalScale={2}
                  allowNegative={false}
                  value={formData.amount}
                  onValueChange={(values) => {
                    setFormData({ ...formData, amount: values.value });
                    if (formErrors.amount) setFormErrors({ ...formErrors, amount: undefined });
                  }}
                  className={`w-full px-3 py-2 bg-gray-700 border rounded-md text-white focus:outline-none focus:ring-2 ${formErrors.amount ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-green-500'}`}
                  placeholder="0.00"
                />
                {formErrors.amount && (
                  <div className="flex items-center mt-1 text-red-400 text-xs">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {formErrors.amount}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  วันที่ <span className="text-red-500">*</span>
                </label>
                <DatePicker
                  id="date"
                  value={formData.date ? new Date(formData.date) : undefined}
                  onChange={(date) => {
                    const formattedDate = date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : '';
                    setFormData({ ...formData, date: formattedDate });
                    if (formErrors.date) setFormErrors({ ...formErrors, date: undefined });
                  }}
                  error={formErrors.date}
                  required
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
                className="px-4 py-2 text-white rounded-lg transition-colors bg-green-600 hover:bg-green-700"
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
              <label className="block text-sm font-medium text-gray-300 mb-1">
                เลือกไฟล์เอกสาร
              </label>
              <div className="flex items-center gap-3 p-3 border border-dashed border-gray-600 rounded-lg bg-gray-800/50">
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
                  className="inline-flex items-center px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg cursor-pointer transition-colors shrink-0"
                >
                  <Upload className="h-4 w-4 mr-1.5" />
                  เลือกไฟล์
                </label>
                <span className="text-xs text-gray-400">ลากไฟล์มาวางหรือคลิกเพื่อเลือก (PDF, DOC, JPG, PNG)</span>
              </div>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {uploadedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 bg-gray-700 px-2.5 py-1.5 rounded-lg text-sm"
                  >
                    <File className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-white truncate max-w-[120px]" title={file.name}>{file.name}</span>
                    <span className="text-xs text-gray-400">({(file.size / 1024).toFixed(0)}KB)</span>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-red-400 hover:text-red-300 ml-1"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
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
