"use client";

import type React from "react";
import { useState, useMemo } from "react";
// Import Trash icon
import {
  Plus,
  Check,
  AlertTriangle,
  Clock,
  Upload,
  File,
  X,
  Filter,
  Edit,
  Eye,
  Trash,
} from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { Notification } from "@/components/ui/notification"; // Import Notification
// Import ConfirmationModal
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import {
  useRentPaymentsDB,
  useCondosDB,
  useTenantsDB,
  useDocumentsDB,
} from "@/lib/hooks/use-database"; // Import useDocumentsDB
import { useAuth } from "@/lib/auth-context";
import type { RentPayment } from "@/lib/supabase";
import {
  uploadDocument,
  deleteDocumentAction,
} from "@/app/actions/document-actions"; // Import Server Actions
import { NumericFormat } from "react-number-format";

export default function RentPage() {
  const { user } = useAuth();
  const {
    payments,
    loading,
    addPayment,
    updatePayment,
    deletePayment,
    refetch: refetchPayments,
  } = useRentPaymentsDB(user?.id);
  const { condos } = useCondosDB(user?.id);
  const { tenants } = useTenantsDB(user?.id);
  const [isCreatePaymentModalOpen, setIsCreatePaymentModalOpen] =
    useState(false);
  const [isEditPaymentModalOpen, setIsEditPaymentModalOpen] = useState(false); // New state for edit modal
  const [selectedPayment, setSelectedPayment] = useState<RentPayment | null>(
    null
  );
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Document states for payment receipts
  const {
    documents: paymentDocuments, // Rename to avoid conflict
    loading: paymentDocumentsLoading,
    refetch: refetchPaymentDocuments,
  } = useDocumentsDB(selectedPayment?.tenant?.condo_id); // Fetch documents related to the condo of the selected payment's tenant

  // Filter states
  const [selectedCondoFilter, setSelectedCondoFilter] = useState<string>("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<
    "all" | "unpaid" | "paid" | "overdue"
  >("all");
  const [selectedYearFilter, setSelectedYearFilter] = useState("");
  const [selectedMonthFilter, setSelectedMonthFilter] = useState("");

  // ข้อมูลเดือนภาษาไทย
  const months = [
    "มกราคม",
    "กุมภาพันธ์",
    "มีนาคม",
    "เมษายน",
    "พฤษภาคม",
    "มิถุนายน",
    "กรกฎาคม",
    "สิงหาคม",
    "กันยายน",
    "ตุลาคม",
    "พฤศจิกายน",
    "ธันวาคม",
  ];

  // เพิ่มรายการปีจากข้อมูล payments
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 5; // ย้อนหลัง 5 ปี
    const endYear = currentYear + 1; // หน้า 1 ปี

    const yearList = [];
    for (let year = endYear; year >= startYear; year--) {
      yearList.push(year);
    }
    return yearList;
  }, []);

  // Notification state
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Form data for creating/editing payment record
  const [formData, setFormData] = useState({
    tenant_id: "",
    amount: "",
    due_date: "",
    paid_date: "",
    status: "unpaid" as "unpaid" | "paid" | "overdue",
    notes: "",
  });

  // Add new states for delete functionality
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<RentPayment | null>(
    null
  );

  // Add handleDeleteClick function
  const handleDeleteClick = (payment: RentPayment) => {
    setPaymentToDelete(payment);
    setIsDeleteModalOpen(true);
  };

  // Add confirmDelete function
  const confirmDelete = async () => {
    if (paymentToDelete) {
      try {
        const success = await deletePayment(paymentToDelete.id);
        if (success) {
          setNotification({
            message: "ลบรายการชำระเงินสำเร็จ",
            type: "success",
          });
          refetchPayments(); // Refetch data after deletion
        } else {
          setNotification({
            message: "เกิดข้อผิดพลาดในการลบรายการชำระเงิน",
            type: "error",
          });
        }
      } catch (error: any) {
        console.error("Error deleting payment:", error);
        setNotification({
          message: `เกิดข้อผิดพลาดในการลบรายการชำระเงิน: ${error.message}`,
          type: "error",
        });
      } finally {
        setIsDeleteModalOpen(false);
        setPaymentToDelete(null);
      }
    }
  };

  // Updated Filter payments based on selected filters including year and month
  const filteredPayments = useMemo(() => {
    let filtered = payments;

    // กรองตามคอนโด
    if (selectedCondoFilter) {
      filtered = filtered.filter(
        (p) => p.tenant?.condo_id === selectedCondoFilter
      );
    }

    // กรองตามสถานะ
    if (paymentStatusFilter !== "all") {
      filtered = filtered.filter((p) => p.status === paymentStatusFilter);
    }

    // กรองตามปี
    if (selectedYearFilter) {
      filtered = filtered.filter((p) => {
        if (!p.due_date) return false;
        const paymentYear = new Date(p.due_date).getFullYear();
        return paymentYear === parseInt(selectedYearFilter);
      });
    }

    // กรองตามเดือน
    if (selectedMonthFilter) {
      filtered = filtered.filter((p) => {
        if (!p.due_date) return false;
        const paymentMonth = new Date(p.due_date).getMonth() + 1;
        return paymentMonth === parseInt(selectedMonthFilter);
      });
    }

    return filtered;
  }, [
    payments,
    selectedCondoFilter,
    paymentStatusFilter,
    selectedYearFilter,
    selectedMonthFilter,
  ]);

  // ฟังก์ชันล้างตัวกรองทั้งหมด
  const clearAllFilters = () => {
    setSelectedCondoFilter("");
    setPaymentStatusFilter("all");
    setSelectedYearFilter("");
    setSelectedMonthFilter("");
  };

  const handleOpenCreateModal = () => {
    setFormData({
      tenant_id: "",
      amount: "",
      due_date: "",
      paid_date: "",
      status: "unpaid",
      notes: "",
    });
    setUploadedFiles([]);
    setIsCreatePaymentModalOpen(true);
  };

  const handleOpenEditModal = (payment: RentPayment) => {
    setSelectedPayment(payment);
    setFormData({
      ...formData,
      tenant_id: payment.tenant_id,
      amount: payment.amount.toString(),
      due_date: payment.due_date,
      paid_date: payment.paid_date || "",
      status: payment.status,
      notes: payment.notes || "",
    });
    setUploadedFiles([]); // Clear files for edit, user will re-upload if needed
    setIsEditPaymentModalOpen(true);
    refetchPaymentDocuments(); // Refetch documents for the selected payment's condo
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.tenant_id || !formData.due_date || !formData.amount) {
      setNotification({
        message: "กรุณากรอกข้อมูลที่จำเป็น: ผู้เช่า, จำนวนเงิน, และวันครบกำหนด",
        type: "error",
      });
      return;
    }

    if (formData.status === "paid" && !formData.paid_date) {
      setNotification({
        message: "กรุณากรอกวันที่ชำระ หากสถานะเป็น 'ชำระแล้ว'",
        type: "error",
      });
      return;
    }

    const paymentData = {
      tenant_id: formData.tenant_id,
      amount: Number.parseFloat(formData.amount),
      due_date: formData.due_date,
      paid_date: formData.paid_date || undefined,
      status: formData.status,
      notes: formData.notes || undefined,
    };

    try {
      let savedPayment: RentPayment | null = null;
      if (selectedPayment) {
        // Editing existing payment
        savedPayment = await updatePayment(selectedPayment.id, paymentData);
      } else {
        // Creating new payment
        savedPayment = await addPayment(paymentData);
      }

      if (savedPayment) {
        // Handle file uploads if any
        if (uploadedFiles.length > 0) {
          setIsUploading(true);
          for (const file of uploadedFiles) {
            const uploadFormData = new FormData();
            uploadFormData.append("file", file);
            // Link to condo of the tenant for this payment
            uploadFormData.append(
              "condoId",
              savedPayment.tenant?.condo_id || ""
            );
            uploadFormData.append("documentType", "payment_receipt"); // Specific document type for payment receipts

            const result = await uploadDocument(uploadFormData);
            if (!result.success) {
              throw new Error(result.message);
            }
          }
          setNotification({
            message: `บันทึกสำเร็จ ${uploadedFiles.length} ไฟล์`,
            type: "success",
          });
        }
        setNotification({ message: `บันทึกสำเร็จ`, type: "success" });
        refetchPayments(); // Refresh data after save
      } else {
        setNotification({
          message: "เกิดข้อผิดพลาดในการบันทึกรายการชำระเงิน",
          type: "error",
        });
      }
    } catch (error: any) {
      console.error("Error saving payment record:", error);
      setNotification({
        message: `เกิดข้อผิดพลาดในการบันทึกรายการชำระเงิน: ${error.message}`,
        type: "error",
      });
    } finally {
      setIsUploading(false);
      setIsCreatePaymentModalOpen(false);
      setIsEditPaymentModalOpen(false);
      setSelectedPayment(null);
      setUploadedFiles([]);
    }
  };

  const handleDocumentDelete = async (
    docId: string,
    fileUrl: string,
    docName: string
  ) => {
    if (window.confirm(`คุณต้องการลบเอกสาร "${docName}" หรือไม่?`)) {
      try {
        const result = await deleteDocumentAction(docId, fileUrl);
        if (!result.success) {
          throw new Error(result.message);
        }
        setNotification({
          message: `เอกสาร "${docName}" ถูกลบแล้ว`,
          type: "success",
        });
        refetchPaymentDocuments(); // Refetch documents after successful deletion
      } catch (error: any) {
        console.error("Error deleting document:", error);
        setNotification({
          message: `เกิดข้อผิดพลาดในการลบเอกสาร: ${error.message}`,
          type: "error",
        });
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-900 text-green-300";
      case "overdue":
        return "bg-red-900 text-red-300";
      default:
        return "bg-yellow-900 text-yellow-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <Check className="h-4 w-4" />;
      case "overdue":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "paid":
        return "ชำระแล้ว";
      case "overdue":
        return "เกินกำหนด";
      default:
        return "ยังไม่ชำระ";
    }
  };

  const columns = [
    {
      key: "tenant_id",
      header: "ผู้เช่า",
      render: (payment: RentPayment) => {
        const tenant = payment.tenant;
        const condo = tenant?.condo;
        return (
          <div>
            <div className="font-medium">{tenant?.full_name || "ไม่ทราบ"}</div>
            <div className="text-sm text-gray-400">
              {condo ? `${condo.name} (${condo.room_number})` : "ไม่ทราบคอนโด"}
            </div>
          </div>
        );
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
        const dueDate = new Date(payment.due_date);
        const today = new Date();
        const timeDiff = dueDate.getTime() - today.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

        const isOverdue = dueDate < today && payment.status !== "paid";
        const isNearDue =
          daysDiff <= 7 && daysDiff > 0 && payment.status !== "paid";

        let textColor = "";
        if (isOverdue) {
          textColor = "text-red-400";
        } else if (isNearDue) {
          textColor = "text-yellow-400";
        }

        return (
          <div className={textColor}>{dueDate.toLocaleDateString("th-TH")}</div>
        );
      },
    },
    {
      key: "paid_date",
      header: "วันที่ชำระ",
      render: (payment: RentPayment) =>
        payment.paid_date
          ? new Date(payment.paid_date).toLocaleDateString("th-TH")
          : "-",
    },
    {
      key: "notes",
      header: "หมายเหตุ",
      render: (payment: RentPayment) => (payment.notes ? payment.notes : "-"),
    },
    {
      key: "status",
      header: "สถานะ",
      render: (payment: RentPayment) => (
        <div className="flex items-center">
          <span
            className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
              payment.status
            )}`}
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
            className="text-blue-400 hover:text-blue-300"
            title="แก้ไข"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDeleteClick(payment)}
            className="text-red-400 hover:text-red-300"
            title="ลบ"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        // <div className="flex space-x-2">
        //   <button
        //     onClick={() => handleOpenEditModal(payment)}
        //     className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
        //     title="แก้ไขรายการ"
        //   >
        //     <Edit className="h-4 w-4 mr-1" />
        //     แก้ไข
        //   </button>
        //   {/* Add Delete Button */}
        //   <button
        //     onClick={() => handleDeleteClick(payment)}
        //     className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
        //     title="ลบรายการ"
        //   >
        //     <Trash className="h-4 w-4 mr-1" />
        //     ลบ
        //   </button>
        // </div>
      ),
    },
  ];

  // Filter payments by status for summary cards
  const unpaidPaymentsCount = filteredPayments.filter(
    (p) => p.status === "unpaid"
  ).length;
  const overduePaymentsCount = filteredPayments.filter(
    (p) => p.status === "overdue"
  ).length;
  const paidPaymentsCount = filteredPayments.filter(
    (p) => p.status === "paid"
  ).length;

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
            <h1 className="text-2xl font-bold text-white">จัดการค่าเช่า</h1>
            <p className="text-gray-400">ติดตามและจัดการการชำระค่าเช่า</p>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            เพิ่มรายการค่าเช่า
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-300">
                  ยังไม่ชำระ
                </p>
                <p className="text-2xl font-bold text-white">
                  {unpaidPaymentsCount}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-red-900/20 border border-red-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-300">เกินกำหนด</p>
                <p className="text-2xl font-bold text-white">
                  {overduePaymentsCount}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </div>

          <div className="bg-green-900/20 border border-green-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-300">ชำระแล้ว</p>
                <p className="text-2xl font-bold text-white">
                  {paidPaymentsCount}
                </p>
              </div>
              <Check className="h-8 w-8 text-green-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <div className="flex items-center flex-wrap gap-4">
            <Filter className="h-5 w-5 text-gray-400" />

            {/* คอนโดฟิลเตอร์ */}
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

            {/* ปีฟิลเตอร์ */}
            <div>
              <label className="text-sm font-medium text-gray-300 mr-2">
                ปี:
              </label>
              <select
                value={selectedYearFilter}
                onChange={(e) => setSelectedYearFilter(e.target.value)}
                className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">ทั้งหมด</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year + 543} {/* แสดงปี พ.ศ. */}
                  </option>
                ))}
              </select>
            </div>

            {/* เดือนฟิลเตอร์ */}
            <div>
              <label className="text-sm font-medium text-gray-300 mr-2">
                เดือน:
              </label>
              <select
                value={selectedMonthFilter}
                onChange={(e) => setSelectedMonthFilter(e.target.value)}
                className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">ทั้งหมด</option>
                {months.map((month, index) => (
                  <option key={index} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>
            </div>

            {/* สถานะฟิลเตอร์ */}
            <div>
              <label className="text-sm font-medium text-gray-300 mr-2">
                สถานะ:
              </label>
              <select
                value={paymentStatusFilter}
                onChange={(e) =>
                  setPaymentStatusFilter(
                    e.target.value as "all" | "unpaid" | "paid" | "overdue"
                  )
                }
                className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="all">ทั้งหมด</option>
                <option value="unpaid">ยังไม่ชำระ</option>
                <option value="overdue">เกินกำหนด</option>
                <option value="paid">ชำระแล้ว</option>
              </select>
            </div>

            <span className="text-sm text-gray-400">
              พบ {filteredPayments.length} รายการ
            </span>
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

        <Modal
          isOpen={isCreatePaymentModalOpen || isEditPaymentModalOpen}
          onClose={() => {
            setIsCreatePaymentModalOpen(false);
            setIsEditPaymentModalOpen(false);
            setSelectedPayment(null);
            setUploadedFiles([]);
          }}
          title={selectedPayment ? "แก้ไขรายการค่าเช่า" : "เพิ่มรายการค่าเช่า"}
          size="lg"
        >
          <form onSubmit={handleSavePayment} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                ผู้เช่า *
              </label>
              <select
                required
                value={formData.tenant_id}
                onChange={(e) => {
                  const selectedTenant = tenants.find(
                    (t) => t.id === e.target.value
                  );
                  setFormData({
                    ...formData,
                    tenant_id: e.target.value,
                    amount: selectedTenant?.monthly_rent.toString() || "", // Auto-fill amount
                  });
                }}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={!!selectedPayment} // Disable tenant selection when editing\
              >
                <option value="">เลือกผู้เช่า</option>
                {tenants // ใช้ tenants จาก useTenantsDB
                  .filter((t) => t.is_active || t.id === formData.tenant_id) // Include current tenant if inactive
                  .map((tenant) => {
                    const condo = condos.find((c) => c.id === tenant.condo_id);
                    return (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.full_name} - {condo?.name} ({condo?.room_number}
                        ) - ฿{tenant.monthly_rent.toLocaleString()}
                      </option>
                    );
                  })}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  จำนวนเงิน (บาท) *
                </label>
                <NumericFormat
                  thousandSeparator=","
                  decimalScale={2}
                  fixedDecimalScale={true}
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
                  วันครบกำหนด *
                </label>
                <input
                  type="date"
                  required
                  value={formData.due_date}
                  onChange={(e) =>
                    setFormData({ ...formData, due_date: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  สถานะ *
                </label>
                <select
                  required
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as "unpaid" | "paid" | "overdue",
                    })
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
                  onChange={(e) =>
                    setFormData({ ...formData, paid_date: e.target.value })
                  }
                  required={formData.status === "paid"}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                แนบรูปภาพการจ่าย
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
                <p className="text-xs text-gray-500 mt-2">
                  รองรับไฟล์: JPG, PNG, PDF
                </p>
              </div>
            </div>

            {uploadedFiles.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">
                  ไฟล์ที่เลือก ({uploadedFiles.length} ไฟล์):
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-gray-700 p-3 rounded-lg"
                    >
                      <div className="flex items-center">
                        <File className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-white">{file.name}</span>
                        <span className="text-xs text-gray-400 ml-2">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
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

            {selectedPayment && paymentDocuments.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">
                  เอกสารที่แนบสำหรับคอนโดนี้ ({paymentDocuments.length} ไฟล์):
                </h4>
                <p className="text-xs text-gray-400 mb-2">
                  **หมายเหตุ:** เอกสารเหล่านี้เชื่อมโยงกับคอนโดของผู้เช่า
                  และถูกกรองให้แสดงเฉพาะประเภท 'payment_receipt'
                </p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {paymentDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between bg-gray-700 p-3 rounded-lg"
                    >
                      <div className="flex items-center flex-1 min-w-0">
                        <File className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <span className="text-sm text-white truncate block">
                            {doc.name}
                          </span>
                          <span className="text-xs text-gray-400">
                            {doc.document_type || "ไม่ระบุประเภท"}
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
                          onClick={() =>
                            handleDocumentDelete(
                              doc.id,
                              doc.file_url || "",
                              doc.name
                            )
                          } // Need a delete function for payment documents
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

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                หมายเหตุ
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                rows={3}
                placeholder="หมายเหตุเพิ่มเติม..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsCreatePaymentModalOpen(false);
                  setIsEditPaymentModalOpen(false);
                  setSelectedPayment(null);
                  setUploadedFiles([]);
                }}
                className="px-4 py-2 bg-red-500 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isUploading}
              >
                {isUploading
                  ? "กำลังอัปโหลด..."
                  : selectedPayment
                  ? "แก้ไข"
                  : "เพิ่ม"}
              </button>
            </div>
          </form>
        </Modal>
        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={confirmDelete}
          title="ยืนยันการลบรายการชำระเงิน"
          message={`คุณแน่ใจหรือไม่ว่าต้องการลบรายการชำระเงินของ ${
            paymentToDelete?.tenant?.full_name || "นี้"
          } จำนวน ฿${
            paymentToDelete?.amount.toLocaleString() || "N/A"
          }? การดำเนินการนี้ไม่สามารถย้อนกลับได้`}
          confirmText="ลบ"
          cancelText="ยกเลิก"
          type="danger"
        />
      </div>
    </MainLayout>
  );
}
