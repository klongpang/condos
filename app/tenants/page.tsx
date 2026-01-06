"use client";

import type React from "react";
import { useState, useMemo } from "react";
import {
  Plus,
  Edit,
  Phone,
  MessageCircle,
  UserX,
  Filter,
  FileText,
  Upload,
  File,
  X,
  AlertCircle,
  Info,
  Loader2,
} from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";
import { DataTable } from "@/components/ui/data-table";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { Notification } from "@/components/ui/notification";
import { Modal } from "@/components/ui/modal";
import { DocumentPreview } from "@/components/ui/document-preview";
import { ImageCompressInput } from "@/components/ui/image-compress-input";
import { DatePicker } from "@/components/ui/date-picker";
import { useAuth } from "@/lib/auth-context";
import type { Tenant } from "@/lib/supabase";
import { useCondos, useTenants, queryKeys } from "@/lib/hooks/use-queries";
import { useQueryClient } from "@tanstack/react-query";
import { useDocumentsDB } from "@/lib/hooks/use-database";
import { tenantHistoryService } from "@/lib/database";
import {
  uploadDocument,
  deleteDocumentAction,
} from "@/app/actions/document-actions"; // Import Server Actions
import {
  createTenantAction,
  updateTenantAction,
  endTenantContractAction,
} from "@/app/actions/tenant-actions";


export default function TenantsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { tenants, loading, refetch: refetchTenants } = useTenants(user?.id);
  const { condos } = useCondos(user?.id);
  const [isEndContractModalOpen, setIsEndContractModalOpen] = useState(false);
  const [selectedTenantForEnd, setSelectedTenantForEnd] =
    useState<Tenant | null>(null);
  const [endContractData, setEndContractData] = useState({
    end_reason: "expired" as "expired" | "early_termination" | "changed_tenant",
    actual_end_date: "",
    notes: "",
  });

  // Filter states
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "vacant">(
    "active"
  );
  const [selectedCondoFilter, setSelectedCondoFilter] = useState<string>("");

  const [notification, setNotification] = useState<{
      message: string;
      type: "success" | "error";
    } | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [formData, setFormData] = useState({
    condo_id: "",
    full_name: "",
    phone: "",
    line_id: "",
    rental_start: "",
    rental_end: "",
    deposit: "",
    monthly_rent: "",
  });

  // Form validation errors
  const [formErrors, setFormErrors] = useState<{
    condo_id?: string;
    full_name?: string;
    rental_start?: string;
    rental_end?: string;
    monthly_rent?: string;
  }>({});

  const validateForm = () => {
    const errors: typeof formErrors = {};
    
    if (!formData.full_name.trim()) {
      errors.full_name = "กรุณากรอกชื่อ-นามสกุล";
    }
    if (!formData.condo_id) {
      errors.condo_id = "กรุณาเลือกคอนโด";
    }
    if (!formData.rental_start) {
      errors.rental_start = "กรุณาเลือกวันที่เริ่มเช่า";
    }
    if (!formData.rental_end) {
      errors.rental_end = "กรุณาเลือกวันที่สิ้นสุดสัญญา";
    }
    if (!formData.monthly_rent) {
      errors.monthly_rent = "กรุณากรอกค่าเช่าต่อเดือน";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Document states for tenant
  const [isTenantFileModalOpen, setIsTenantFileModalOpen] = useState(false); // New state for file modal
  const [selectedTenantForFile, setSelectedTenantForFile] =
    useState<Tenant | null>(null); // New state for selected tenant for file upload
  const {
    documents: tenantDocuments,
    loading: tenantDocumentsLoading,
    refetch: refetchTenantDocuments,
  } = useDocumentsDB({
    tenantId: selectedTenantForFile?.id,
    scope: "tenant",
  });


  const [isTenantDocDeleteModalOpen, setIsTenantDocDeleteModalOpen] = useState(false);
  const [tenantDocToDelete, setTenantDocToDelete] = useState<{
    id: string;
    fileUrl: string;  // บังคับเป็น string เสมอ (เหมือนของเก่า)
    name: string;
  } | null>(null);


  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [documentType, setDocumentType] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEndingContract, setIsEndingContract] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Installment modal states
  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
  const [selectedTenantForInstallment, setSelectedTenantForInstallment] = useState<Tenant | null>(null);

  // Calculate installments for a tenant
  const installments = useMemo(() => {
    if (!selectedTenantForInstallment) return [];
    
    const startDate = new Date(selectedTenantForInstallment.rental_start);
    const endDate = new Date(selectedTenantForInstallment.rental_end);
    const result: { installmentNo: number; startDate: Date; endDate: Date }[] = [];
    
    // Calculate total number of months (this gives the correct count)
    const totalMonths = (endDate.getFullYear() - startDate.getFullYear()) * 12 
      + (endDate.getMonth() - startDate.getMonth());
    
    const startDay = startDate.getDate(); // วันที่เริ่มสัญญา (เช่น 21)
    
    for (let i = 0; i < totalMonths; i++) {
      // Period start: same day of the start date for each month
      const periodStart = new Date(startDate.getFullYear(), startDate.getMonth() + i, startDay);
      
      // Period end: same day of next month (or contract end for last installment)
      let periodEnd = new Date(startDate.getFullYear(), startDate.getMonth() + i + 1, startDay);
      
      // For the last installment, use contract end date
      if (i === totalMonths - 1) {
        periodEnd = new Date(endDate);
      }
      
      result.push({
        installmentNo: i + 1,
        startDate: periodStart,
        endDate: periodEnd,
      });
    }
    
    return result;
  }, [selectedTenantForInstallment]);

  const openInstallmentModal = (tenant: Tenant) => {
    setSelectedTenantForInstallment(tenant);
    setIsInstallmentModalOpen(true);
  };

  // Filter tenants based on status and condo - ใช้ tenants ที่ถูกกรองโดย useTenantsDB แล้ว
  const filteredTenants = tenants.filter((tenant) => {
    const statusMatch =
      statusFilter === "all" ||
      (statusFilter === "active" && tenant.is_active) ||
      (statusFilter === "vacant" && !tenant.is_active);

    const condoMatch =
      !selectedCondoFilter || tenant.condo_id === selectedCondoFilter;

    return statusMatch && condoMatch;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form before submitting
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    const tenantData = {
      condo_id: formData.condo_id,
      full_name: formData.full_name,
      phone: formData.phone || undefined,
      line_id: formData.line_id || undefined,
      rental_start: formData.rental_start,
      rental_end: formData.rental_end,
      deposit: formData.deposit
        ? Number.parseFloat(formData.deposit)
        : undefined,
      monthly_rent: Number.parseFloat(formData.monthly_rent),
      is_active: true,
      status: "active" as const,
    };

    try {
      if (editingTenant) {
        const result = await updateTenantAction(editingTenant.id, tenantData);
        if (result.success) {
           setNotification({
            message: `บันทึกสำเร็จ`,
            type: "success",
          });
          refetchTenants();
        } else {
           throw new Error(result.message);
        }
      } else {
        const result = await createTenantAction(tenantData);
        if (result.success) {
          setNotification({
             message: `บันทึกสำเร็จ`,
             type: "success",
           });
           refetchTenants();
        } else {
           throw new Error(result.message);
        }
      }
      resetForm();
    } catch (error: any) {
      console.error("Error saving tenant:", error);
      setNotification({
        message: `เกิดข้อผิดพลาดในการบันทึกข้อมูล`,
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };


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
    });
    setFormErrors({});
    setEditingTenant(null);
    setIsModalOpen(false);
  };

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
    });
    setEditingTenant(tenant);
    setIsModalOpen(true);
  };

  const handleEndContract = (tenant: Tenant) => {
    setSelectedTenantForEnd(tenant);
    setEndContractData({
      end_reason: "expired",
      actual_end_date: new Date().toISOString().split("T")[0],
      notes: "",
    });
    setIsEndContractModalOpen(true);
  };

  const submitEndContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantForEnd) return;

    setIsEndingContract(true);
    try {
      // สร้างประวัติผู้เช่าใน tenant_history table
      const result = await endTenantContractAction(
        selectedTenantForEnd.id,
        selectedTenantForEnd, // Send full tenant object for history creation
        {
          end_reason: endContractData.end_reason,
          actual_end_date: endContractData.actual_end_date,
          notes: endContractData.notes,
        }
      );

      if (!result.success) {
        throw new Error(result.message);
      }
      
      refetchTenants(); // Refresh data
      // Invalidate tenant history cache to ensure immediate update on the history page
      queryClient.invalidateQueries({ queryKey: queryKeys.tenantHistory(user?.id) });

      // รีเซ็ตฟอร์ม
      setIsEndContractModalOpen(false);
      setSelectedTenantForEnd(null);
      setEndContractData({
        end_reason: "expired",
        actual_end_date: "",
        notes: "",
      });

      setNotification({ message: "สิ้นสุดสัญญาเรียบร้อยแล้ว", type: "success" });
    } catch (error: any) {
      console.error("Error ending contract:", error);
      setNotification({ message: `เกิดข้อผิดพลาดในการสิ้นสุดสัญญา: ${error.message}`, type: "error" });
    } finally {
      setIsEndingContract(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const openTenantFileModal = (tenant: Tenant) => {
    setSelectedTenantForFile(tenant);
    setUploadedFiles([]);
    setDocumentType("");
    setIsTenantFileModalOpen(true);
    refetchTenantDocuments(); // Refetch documents when opening modal
  };

  const handleTenantFileSubmit = async () => {
    if (uploadedFiles.length === 0) {
      alert("กรุณาเลือกไฟล์ที่ต้องการอัปโหลด");
      return;
    }
    if (!documentType) {
      alert("กรุณาเลือกประเภทเอกสาร");
      return;
    }
    if (!selectedTenantForFile) return;

    setIsUploading(true);
    try {
      for (const file of uploadedFiles) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("tenantId", selectedTenantForFile.id); // Link to tenant_id
        formData.append("condoId", selectedTenantForFile.condo_id); // Also link to condo_id for broader access
        formData.append("documentType", documentType);

        const result = await uploadDocument(formData);
        if (!result.success) {
          throw new Error(result.message);
        }
      }
      setNotification({ message: `อัปโหลดไฟล์สำเร็จ ${uploadedFiles.length} ไฟล์`, type: "success" });
      setUploadedFiles([]);
      setDocumentType("");
      setIsTenantFileModalOpen(false);
      refetchTenantDocuments(); // Refetch documents after successful upload
    } catch (error: any) {
      console.error("Error uploading files:", error);
      alert(`เกิดข้อผิดพลาดในการอัปโหลดไฟล์: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleTenantDocumentDelete = (
    docId: string,
    fileUrl: string,
    docName: string
  ) => {
    setTenantDocToDelete({ id: docId, fileUrl, name: docName });
    setIsTenantDocDeleteModalOpen(true);
  };

  const confirmTenantDocDelete = async () => {
    if (!tenantDocToDelete) return;
    setIsDeleting(true);
    try {
      const result = await deleteDocumentAction(
        tenantDocToDelete.id,
        tenantDocToDelete.fileUrl || "" // ส่ง string เสมอ ตาม behavior เดิม
      );
      if (!result.success) {
        throw new Error(result.message);
      }
      setNotification({message: `ลบเอกสารสำเร็จ`, type: "success",});
      refetchTenantDocuments();
    } catch (error: any) {
      console.error("Error deleting document:", error);
      alert(`เกิดข้อผิดพลาดในการลบเอกสาร`);
    } finally {
      setIsDeleting(false);
      setIsTenantDocDeleteModalOpen(false);
      setTenantDocToDelete(null);
    }
  };



  const tenantDocumentTypes = [
    { value: "id_card", label: "สำเนาบัตรประชาชน" },
    { value: "rental_agreement", label: "สัญญาเช่า" },
    { value: "bank_account", label: "สำเนาบัญชีธนาคาร" },
    { value: "other", label: "อื่นๆ" },
  ];

  const columns = [
    {
      key: "full_name",
      header: "ชื่อผู้เช่า",
    },
    {
      key: "condo_id",
      header: "คอนโด",
      render: (tenant: Tenant) => {
        const condo = condos.find((c) => c.id === tenant.condo_id);
        return condo ? `${condo.name} (${condo.room_number})` : "ไม่ทราบ";
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
        render: (tenant: Tenant) => {
            // ไม่ต้องใช้ฟังก์ชัน monthDiff อีกต่อไป

            const today = new Date();
            const rentalEnd = new Date(tenant.rental_end);
            
            // 1. คำนวณส่วนต่างของเวลาเป็นมิลลิวินาที (วันสิ้นสุด - วันนี้)
            const timeDiff = rentalEnd.getTime() - today.getTime();
            
            // 2. แปลงส่วนต่างของเวลาเป็น 'จำนวนวัน' ที่เหลือ (ปัดขึ้น)
            const MS_PER_DAY = 24 * 60 * 60 * 1000;
            const daysRemaining = Math.ceil(timeDiff / MS_PER_DAY);

            // 3. กำหนดเกณฑ์จำนวนวัน (4 เดือน ≈ 120 วัน, 2 เดือน ≈ 60 วัน)
            const DAYS_RED_THRESHOLD = 60;   // 2 เดือน
            const DAYS_YELLOW_THRESHOLD = 90; // 4 เดือน

            // 4. กำหนด CSS Class ตามเงื่อนไข (ใช้ daysRemaining แทน monthsRemaining)
            let endClass = "text-gray-400"; // สีเทา (ค่าเริ่มต้น)

            if (daysRemaining <= DAYS_RED_THRESHOLD && daysRemaining > 0) {
                // ใกล้ 2 เดือน (60 วัน) หรือน้อยกว่า: สีแดงอ่อน
                endClass = "text-red-400 font-medium";
            } else if (daysRemaining <= DAYS_YELLOW_THRESHOLD && daysRemaining > 0) {
                // ใกล้ 4 เดือน (120 วัน) หรือน้อยกว่า: สีเหลือง (ใช้ text-yellow-300 เพื่อให้ตรงกับ Badge)
                endClass = "text-yellow-300";
            } else if (daysRemaining <= 0) {
                // วันที่เลยกำหนดไปแล้ว
                endClass = "text-red-600 font-bold italic"; // ใช้ text-red-300 เพื่อให้ตรงกับ Badge
            }
            
            // 5. แสดงผลลัพธ์
            const rentalStartTH = new Date(tenant.rental_start).toLocaleDateString("th-TH");
            const rentalEndTH = rentalEnd.toLocaleDateString("th-TH");

            return (
                <div className="flex items-center gap-2">
                    <div className="text-sm">
                        <div>{rentalStartTH}</div>
                        <div className={endClass}>
                            ถึง {rentalEndTH}
                        </div>
                    </div>
                    <button
                        onClick={() => openInstallmentModal(tenant)}
                        className="p-1 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 rounded transition-colors"
                        title="ดูงวดการเช่า"
                    >
                        <Info className="h-4 w-4" />
                    </button>
                </div>
            );
        },
    },
    {
        key: "status",
        header: "สถานะ",
        render: (tenant: Tenant) => {
            const endDate = new Date(tenant.rental_end);
            const today = new Date();

            // 1. คำนวณวันคงเหลือ
            const MS_PER_DAY = 24 * 60 * 60 * 1000;
            const timeDiff = endDate.getTime() - today.getTime();
            const daysRemaining = Math.ceil(timeDiff / MS_PER_DAY);
            
            // 2. กำหนดเกณฑ์วันที่ (เป็นมิลลิวินาที)
            const deadlineRed = new Date(today.getTime() + 60 * MS_PER_DAY);
            const deadlineYellow = new Date(today.getTime() + 90 * MS_PER_DAY);

            // 3. ตรวจสอบเงื่อนไข
            const isVeryNearExpiring = endDate <= deadlineRed;
            const isExpiring = endDate <= deadlineYellow;
            const isExpired = daysRemaining < 0;

            let statusText: string;
            let classNames: string;

            if (!tenant.is_active) {
                statusText = "ไม่ใช้งาน";
                classNames = "bg-red-900 text-red-300";
            } else if (isExpired) {
                statusText = "หมดสัญญา";
                classNames = "bg-red-900 text-red-600";
            } else if (isVeryNearExpiring) {
                statusText = "จะหมดสัญญา"; 
                classNames = "bg-red-900/60 text-red-400"; 
            } else if (isExpiring) {
                statusText = "ใกล้หมดสัญญา";
                classNames = "bg-yellow-900 text-yellow-300";
            } else {
                statusText = "ใช้งาน";
                classNames = "bg-green-900 text-green-300";
            }

            return (
                <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${classNames}`}
                >
                    {statusText}
                </span>
            );
        },
    },
    {
      key: "actions",
      header: "การดำเนินการ",
      render: (tenant: Tenant) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleEdit(tenant)}
            className="text-blue-400 hover:text-blue-300"
            title="แก้ไข"
          >
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
  ];

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Notification */}
        {notification && (
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">ผู้เช่า</h1>
            <p className="text-sm sm:text-base text-gray-400">จัดการผู้เช่าและสัญญาเช่า</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center px-3 py-2 sm:px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
          >
            <Plus className="h-4 w-4 mr-1 sm:mr-2" />
            เพิ่มผู้เช่า
          </button>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <Filter className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 hidden sm:block" />
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2">
                <label className="text-xs sm:text-sm font-medium text-gray-300">
                  สถานะ:
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(
                      e.target.value as "all" | "active" | "vacant"
                    )
                  }
                  className="px-2 py-1 sm:px-3 bg-gray-700 border border-gray-600 rounded text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="active">มีผู้เช่า</option>
                  <option value="vacant">ห้องว่าง</option>
                  <option value="all">ทั้งหมด</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs sm:text-sm font-medium text-gray-300">
                  คอนโด:
                </label>
                <select
                  value={selectedCondoFilter}
                  onChange={(e) => setSelectedCondoFilter(e.target.value)}
                  className="px-2 py-1 sm:px-3 bg-gray-700 border border-gray-600 rounded text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-green-500 max-w-[120px] sm:max-w-none"
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
            <span className="text-xs sm:text-sm text-gray-400">
              พบ {filteredTenants.length} รายการ
            </span>
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
        <Modal
          isOpen={isModalOpen}
          onClose={resetForm}
          title={editingTenant ? "แก้ไขผู้เช่า" : "เพิ่มผู้เช่าใหม่"}
          size="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  ชื่อ-นามสกุล <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => {
                    setFormData({ ...formData, full_name: e.target.value });
                    if (formErrors.full_name) setFormErrors({ ...formErrors, full_name: undefined });
                  }}
                  className={`w-full px-3 py-2 bg-gray-700 border rounded-md text-white focus:outline-none focus:ring-2 ${formErrors.full_name ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-green-500'}`}
                />
                {formErrors.full_name && (
                  <div className="flex items-center mt-1 text-red-400 text-xs">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {formErrors.full_name}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  คอนโด <span className="text-red-500">*</span>
                </label>
                  <select
                    value={formData.condo_id}
                    onChange={(e) => {
                      setFormData({ ...formData, condo_id: e.target.value });
                      if (formErrors.condo_id) setFormErrors({ ...formErrors, condo_id: undefined });
                    }}
                    className={`w-full px-3 py-2 bg-gray-700 border rounded-md text-white focus:outline-none focus:ring-2 ${formErrors.condo_id ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-green-500'}`}
                  >
                    <option value="">เลือกคอนโด</option>
                    {condos.map((condo) => {
                      // Check if condo is occupied
                      const isOccupied = tenants.some(
                        (t) => t.is_active && t.condo_id === condo.id && t.id !== editingTenant?.id
                      );
                      
                      return (
                        <option key={condo.id} value={condo.id} disabled={isOccupied}>
                          {condo.name} ({condo.room_number}) {isOccupied ? "(ไม่ว่าง)" : ""}
                        </option>
                      );
                    })}
                  </select>
                {formErrors.condo_id && (
                  <div className="flex items-center mt-1 text-red-400 text-xs">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {formErrors.condo_id}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  เบอร์โทรศัพท์
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Line ID
                </label>
                <input
                  type="text"
                  value={formData.line_id}
                  onChange={(e) =>
                    setFormData({ ...formData, line_id: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  วันที่เริ่มเช่า <span className="text-red-500">*</span>
                </label>
                <DatePicker
                  id="rental_start"
                  value={formData.rental_start ? new Date(formData.rental_start) : undefined}
                  onChange={(date) => {
                    if (date) {
                      const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                      
                      // Calculate +1 Year
                      const endDate = new Date(date);
                      endDate.setFullYear(date.getFullYear() + 1);
                      const formattedEndDate = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

                      setFormData({ 
                        ...formData, 
                        rental_start: formattedDate,
                        rental_end: formattedEndDate 
                      });
                    } else {
                       setFormData({ ...formData, rental_start: '' });
                    }
                    if (formErrors.rental_start) setFormErrors({ ...formErrors, rental_start: undefined });
                  }}
                  error={formErrors.rental_start}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  วันที่สิ้นสุดสัญญา <span className="text-red-500">*</span>
                </label>
                <DatePicker
                  id="rental_end"
                  value={formData.rental_end ? new Date(formData.rental_end) : undefined}
                  onChange={(date) => {
                    const formattedDate = date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : '';
                    setFormData({ ...formData, rental_end: formattedDate });
                    if (formErrors.rental_end) setFormErrors({ ...formErrors, rental_end: undefined });
                  }}
                  error={formErrors.rental_end}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  เงินประกัน (บาท)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.deposit}
                  onChange={(e) =>
                    setFormData({ ...formData, deposit: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  ค่าเช่าต่อเดือน (บาท) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.monthly_rent}
                  onChange={(e) => {
                    setFormData({ ...formData, monthly_rent: e.target.value });
                    if (formErrors.monthly_rent) setFormErrors({ ...formErrors, monthly_rent: undefined });
                  }}
                  className={`w-full px-3 py-2 bg-gray-700 border rounded-md text-white focus:outline-none focus:ring-2 ${formErrors.monthly_rent ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-green-500'}`}
                />
                {formErrors.monthly_rent && (
                  <div className="flex items-center mt-1 text-red-400 text-xs">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {formErrors.monthly_rent}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={resetForm}
                disabled={isSaving}
                className="px-4 py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    กำลังบันทึก...
                  </>
                ) : (
                  "บันทึก"
                )}
              </button>
            </div>
          </form>
        </Modal>

        {/* End Contract Modal */}
        <Modal
          isOpen={isEndContractModalOpen}
          onClose={() => {
            setIsEndContractModalOpen(false);
            setSelectedTenantForEnd(null);
          }}
          title="สิ้นสุดสัญญาเช่า"
          size="md"
        >
          <form onSubmit={submitEndContract} className="space-y-4">
            <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
              <p className="text-yellow-300 text-sm">
                การดำเนินการนี้จะย้ายผู้เช่า "{selectedTenantForEnd?.full_name}"
                ไปยังประวัติผู้เช่า
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                สาเหตุการสิ้นสุดสัญญา *
              </label>
              <select
                required
                value={endContractData.end_reason}
                onChange={(e) =>
                  setEndContractData({
                    ...endContractData,
                    end_reason: e.target.value as
                      | "expired"
                      | "early_termination"
                      | "changed_tenant",
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
              <label className="block text-sm font-medium text-gray-300 mb-1">
                วันที่ย้ายออกจริง *
              </label>
              <DatePicker
                id="actual_end_date"
                value={endContractData.actual_end_date ? new Date(endContractData.actual_end_date) : undefined}
                onChange={(date) => {
                  const formattedDate = date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : '';
                  setEndContractData({
                    ...endContractData,
                    actual_end_date: formattedDate,
                  })
                }}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                หมายเหตุ
              </label>
              <textarea
                value={endContractData.notes}
                onChange={(e) =>
                  setEndContractData({
                    ...endContractData,
                    notes: e.target.value,
                  })
                }
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                rows={3}
                placeholder="เช่น: ผู้เช่าย้ายงาน, ไม่พอใจบริการ, เปลี่ยนเป็นผู้เช่าใหม่ ฯลฯ"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsEndContractModalOpen(false);
                  setSelectedTenantForEnd(null);
                }}
                disabled={isEndingContract}
                className="px-4 py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isEndingContract}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isEndingContract ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    กำลังดำเนินการ...
                  </>
                ) : (
                  "บันทึก"
                )}
              </button>
            </div>
          </form>
        </Modal>

        {/* File Upload Modal for Tenants */}
        <Modal
          isOpen={isTenantFileModalOpen}
          onClose={() => {
            setIsTenantFileModalOpen(false);
            setSelectedTenantForFile(null);
            setUploadedFiles([]);
            setDocumentType("");
          }}
          title={`แนบไฟล์ - ${selectedTenantForFile?.full_name}`}
          size="lg"
        >
          <div className="space-y-4">
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
                {tenantDocumentTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <ImageCompressInput
              files={uploadedFiles}
              onFilesChange={setUploadedFiles}
              label="เลือกไฟล์เอกสาร"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
              maxSizeKB={100}
              disabled={isUploading}
              showCompressInfo={true}
            />

            <DocumentPreview
              documents={tenantDocuments}
              documentTypes={tenantDocumentTypes}
              loading={tenantDocumentsLoading}
              onDeleteDocument={handleTenantDocumentDelete}
              title="เอกสารที่มีอยู่"
              maxColumns={2}
            />

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsTenantFileModalOpen(false);
                  setSelectedTenantForFile(null);
                  setUploadedFiles([]);
                  setDocumentType("");
                }}
                className="px-4 py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleTenantFileSubmit}
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
          isOpen={isTenantDocDeleteModalOpen}
          onClose={() => {
            setIsTenantDocDeleteModalOpen(false);
            setTenantDocToDelete(null);
          }}
          onConfirm={confirmTenantDocDelete}
          title="ยืนยันการลบเอกสาร"
          message={`คุณแน่ใจหรือไม่ว่าต้องการลบเอกสาร "${
            tenantDocToDelete?.name || ""
          }"? การดำเนินการนี้ไม่สามารถย้อนกลับได้`}
          confirmText="ยืนยัน"
          cancelText="ยกเลิก"
          type="danger"
          isLoading={isDeleting}
          loadingText="กำลังลบ..."
        />

        {/* Installment Schedule Modal */}
        <Modal
          isOpen={isInstallmentModalOpen}
          onClose={() => {
            setIsInstallmentModalOpen(false);
            setSelectedTenantForInstallment(null);
          }}
          title={`งวดการเช่า - ${selectedTenantForInstallment?.full_name || ""}`}
          size="md"
        >
          <div className="space-y-4">
            {selectedTenantForInstallment && (
              <div className="bg-gray-700/50 rounded-lg p-3 mb-4">
                <div className="text-sm text-gray-300">
                  <span className="font-medium">ระยะเวลาสัญญา:</span>{" "}
                  {new Date(selectedTenantForInstallment.rental_start).toLocaleDateString("th-TH")} -{" "}
                  {new Date(selectedTenantForInstallment.rental_end).toLocaleDateString("th-TH")}
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  รวม {installments.length} งวด
                </div>
              </div>
            )}
            
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-700 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-gray-300 font-medium">งวดที่</th>
                    <th className="px-4 py-3 text-left text-gray-300 font-medium">วันที่ - สิ้นเดือน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {installments.map((inst) => (
                    <tr key={inst.installmentNo} className="hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-white font-medium">{inst.installmentNo}</td>
                      <td className="px-4 py-3 text-gray-300">
                        {inst.startDate.toLocaleDateString("th-TH")} - {inst.endDate.toLocaleDateString("th-TH")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-700">
              <button
                onClick={() => {
                  setIsInstallmentModalOpen(false);
                  setSelectedTenantForInstallment(null);
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
              >
                ปิด
              </button>
            </div>
          </div>
        </Modal>

      </div>
    </MainLayout>
  );
}
