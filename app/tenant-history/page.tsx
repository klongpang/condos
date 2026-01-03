"use client";

import { useState, useEffect } from "react";
import {
  History,
  Calendar,
  User,
  Phone,
  MessageCircle,
  FileText,
  DollarSign,
  CreditCard,
  Download,
  ExternalLink,
  Eye, 
} from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";

import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentPreview } from "@/components/ui/document-preview";
import { ImagePreviewModal } from "@/components/ui/image-preview-modal";
import { useCondos, useTenantHistory, useRentPayments } from "@/lib/hooks/use-queries";
import { useDocumentsDB } from "@/lib/hooks/use-database"; // Import documents hook
import { tenantService } from "@/lib/database"; // Import tenantService
import { useAuth } from "@/lib/auth-context";
import type { TenantHistory } from "@/lib/supabase";

export default function TenantHistoryPage() {
  const { user } = useAuth();
  const { condos } = useCondos(user?.id);
  const { tenantHistory, loading, error, refresh } = useTenantHistory(user?.id);
  const { payments } = useRentPayments(user?.id); // Fetch all payments
  
  const [selectedHistory, setSelectedHistory] = useState<TenantHistory | null>(
    null
  );
  // State for matched inactive tenant ID
  const [matchedTenantId, setMatchedTenantId] = useState<string | undefined>(undefined);
  
  // Fetch documents for the matched tenant
  const { documents, loading: loadingDocs } = useDocumentsDB({ tenantId: matchedTenantId });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCondo, setSelectedCondo] = useState<string>("");

  const [previewImage, setPreviewImage] = useState<{
    url: string;
    name: string;
    type: string;
  } | null>(null);

  // Find the original tenant ID when history is selected
  // Find the original tenant ID when history is selected
  
  const DOCUMENT_TYPES = [
    { value: "contract", label: "สัญญาเช่า" },
    { value: "id_card", label: "สำเนาบัตรประชาชน" },
    { value: "house_registration", label: "สำเนาทะเบียนบ้าน" },
    { value: "other", label: "อื่นๆ" },
  ];

  useEffect(() => {
    const findTenant = async () => {
      if (selectedHistory) {
        const tenant = await tenantService.getArchivedTenant(
          selectedHistory.condo_id,
          selectedHistory.full_name
        );
        if (tenant) {
          setMatchedTenantId(tenant.id);
        } else {
          setMatchedTenantId(undefined);
        }
      } else {
        setMatchedTenantId(undefined);
      }
    };
    findTenant();
  }, [selectedHistory]);

  // Calculate stats
  const tenantPayments = matchedTenantId 
    ? payments
        .filter(p => p.tenant_id === matchedTenantId)
        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    : [];
  
  const paidPayments = tenantPayments.filter(p => p.status === 'paid');
  
  const totalRentPaid = paidPayments.reduce((sum, p) => sum + p.amount, 0);

  const filteredDocuments = documents?.filter(doc => !doc.payment_id) || [];

  const filteredHistory = selectedCondo
    ? tenantHistory.filter((h) => h.condo_id === selectedCondo)
    : tenantHistory;

  const getEndReasonText = (reason?: string) => {
    switch (reason) {
      case "expired":
        return "หมดอายุสัญญา";
      case "early_termination":
        return "ยกเลิกก่อนกำหนด";
      case "changed_tenant":
        return "เปลี่ยนผู้เช่า";
      default:
        return "ไม่ระบุ";
    }
  };

  const getEndReasonColor = (reason?: string) => {
    switch (reason) {
      case "expired":
        return "bg-blue-900 text-blue-300";
      case "early_termination":
        return "bg-red-900 text-red-300";
      case "changed_tenant":
        return "bg-yellow-900 text-yellow-300";
      default:
        return "bg-gray-900 text-gray-300";
    }
  };

  const columns = [
    {
      key: "full_name",
      header: "ชื่อผู้เช่า",
      render: (history: TenantHistory) => (
        <div className="flex items-center">
          <User className="h-4 w-4 mr-2 text-gray-400" />
          {history.full_name}
        </div>
      ),
    },
    {
      key: "condo_id",
      header: "ห้อง",
      render: (history: TenantHistory) => {
        // แทนที่ mockCondos.find ด้วย condos.find ในทุกที่
        const condo = condos?.find((c) => c.id === history.condo_id);
        return condo ? `${condo.name} (${condo.room_number})` : "ไม่ทราบ";
      },
    },
    {
      key: "rental_period",
      header: "ระยะเวลาเช่า",
      render: (history: TenantHistory) => (
        <div className="text-sm">
          <div className="flex items-center">
            <Calendar className="h-3 w-3 mr-1" />
            {new Date(history.rental_start).toLocaleDateString("th-TH")}
          </div>
          <div className="text-gray-400">
            ถึง {new Date(history.rental_end).toLocaleDateString("th-TH")}
          </div>
        </div>
      ),
    },
    {
      key: "moved_out_at",
      header: "วันที่ย้ายออก",
      render: (history: TenantHistory) =>
        new Date(history.moved_out_at).toLocaleDateString("th-TH"),
    },
    {
      key: "monthly_rent",
      header: "ค่าเช่า/เดือน",
      render: (history: TenantHistory) =>
        `฿${history.monthly_rent.toLocaleString()}`,
    },
    {
      key: "end_reason",
      header: "สาเหตุสิ้นสุด",
      render: (history: TenantHistory) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${getEndReasonColor(
            history.end_reason
          )}`}
        >
          {getEndReasonText(history.end_reason)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "การดำเนินการ",
      render: (history: TenantHistory) => (
        <button
          onClick={() => {
            setSelectedHistory(history);
            setIsModalOpen(true);
          }}
          className="flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
        >
          <FileText className="h-3 w-3 mr-1" />
          ดูรายละเอียด
        </button>
      ),
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center">
              ประวัติผู้เช่า
            </h1>
            <p className="text-gray-400">
              ประวัติผู้เช่าทั้งหมดที่เคยอาศัยในคอนโดของคุณ
            </p>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-300">
              กรองตามห้อง:
            </label>
            <select
              value={selectedCondo}
              onChange={(e) => setSelectedCondo(e.target.value)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">ทุกห้อง</option>
              {condos?.map((condo) => (
                <option key={condo.id} value={condo.id}>
                  {condo.name} ({condo.room_number})
                </option>
              ))}
            </select>
            <span className="text-sm text-gray-400">
              พบ {filteredHistory.length} รายการ
            </span>
          </div>
        </div>

        {/* History Table */}
        <DataTable
          data={filteredHistory}
          columns={columns}
          loading={loading}
          emptyMessage="ไม่พบประวัติผู้เช่า"
        />

        {/* Detail Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedHistory(null);
          }}
          title="รายละเอียดประวัติผู้เช่า"
          size="lg"
        >
          {selectedHistory && (
            <div className="space-y-6">
              {/* Header Section */}
              {/* Minimal Header */}
              <div className="flex items-start justify-between border-b border-gray-700 pb-4 mb-4">
                <div>
                   <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold text-white">{selectedHistory.full_name}</h2>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getEndReasonColor(
                        selectedHistory.end_reason
                      )}`}
                    >
                      {getEndReasonText(selectedHistory.end_reason)}
                    </span>
                   </div>
                  <div className="flex items-center text-gray-400 text-sm">
                    {(() => {
                      const condo = condos?.find((c) => c.id === selectedHistory.condo_id);
                      return condo ? `${condo.name} (${condo.room_number})` : "ไม่ทราบห้อง";
                    })()}
                  </div>
                </div>
              </div>

              <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-gray-800 p-1 border border-gray-600 rounded-lg">
                  <TabsTrigger 
                    value="general"
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    ข้อมูลทั่วไป
                  </TabsTrigger>
                  <TabsTrigger 
                    value="documents"
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    เอกสาร ({filteredDocuments.length})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="financials"
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    การเงิน
                  </TabsTrigger>
                </TabsList>

                {/* Tab 1: General Info */}
                <TabsContent value="general" className="mt-4 space-y-4">
                  {selectedHistory.notes && (
                    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                       <h3 className="text-sm font-medium text-gray-400 mb-2 flex items-center">
                          <FileText className="w-4 h-4 mr-2" />
                          หมายเหตุ
                       </h3>
                       <p className="text-gray-300 text-sm leading-relaxed">{selectedHistory.notes}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Contact Card */}
                    <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50">
                      <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center border-b border-gray-700/50 pb-2">
                        <User className="w-4 h-4 mr-2" />
                        ข้อมูลติดต่อ
                      </h3>
                      <div className="space-y-3">
                        {selectedHistory.phone && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">เบอร์โทรศัพท์</span>
                            <span className="text-gray-200 bg-gray-700/30 px-2 py-1 rounded">{selectedHistory.phone}</span>
                          </div>
                        )}
                        {selectedHistory.line_id && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Line ID</span>
                            <span className="text-gray-200 bg-gray-700/30 px-2 py-1 rounded">{selectedHistory.line_id}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-500">วันที่ย้ายออก</span>
                          <span className="text-gray-200">{new Date(selectedHistory.moved_out_at).toLocaleDateString("th-TH")}</span>
                        </div>
                      </div>
                    </div>

                    {/* Contract Card */}
                    <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50">
                      <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center border-b border-gray-700/50 pb-2">
                        <Calendar className="w-4 h-4 mr-2" />
                        รายละเอียดสัญญา
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">ระยะเวลาเช่า</span>
                          <span className="text-gray-200">
                            {new Date(selectedHistory.rental_start).toLocaleDateString("th-TH")} - {new Date(selectedHistory.rental_end).toLocaleDateString("th-TH")}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-500">ค่าเช่า/เดือน</span>
                          <span className="text-white font-medium bg-green-900/20 text-green-400 px-2 py-1 rounded">฿{selectedHistory.monthly_rent.toLocaleString()}</span>
                        </div>
                        {selectedHistory.deposit && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-500">เงินประกัน</span>
                          <span className="text-white font-medium">฿{selectedHistory.deposit.toLocaleString()}</span>
                        </div>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Tab 2: Documents */}
                <TabsContent value="documents" className="mt-4">
                  {matchedTenantId ? (
                    <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-4">
                      <DocumentPreview
                        documents={filteredDocuments}
                        documentTypes={DOCUMENT_TYPES}
                        loading={loadingDocs}
                        maxColumns={3}
                        title=""
                      />
                    </div>
                  ) : (
                    <div className="flex h-[200px] items-center justify-center text-gray-500 bg-gray-800/30 rounded-xl border border-dashed border-gray-700">
                      ไม่พบข้อมูลเอกสาร
                    </div>
                  )}
                </TabsContent>

                {/* Tab 3: Financials */}
                <TabsContent value="financials" className="space-y-4 mt-4">
                  {matchedTenantId ? (
                    <>
                      {/* Financial Summary Card */}
                      {/* Financial Summary Card */}
                      <div className="bg-gray-800/60 border border-green-900/40 rounded-lg px-4 py-3 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                           <div className="p-1.5 bg-green-900/20 rounded-md text-green-400">
                              <DollarSign className="w-4 h-4" />
                           </div>
                           <div className="flex flex-col">
                             <span className="text-sm text-green-400 font-medium leading-none mb-1">รวมค่าเช่าที่จ่ายแล้ว</span>
                             <div className="flex items-baseline gap-2 leading-none">
                                <span className="text-lg font-bold text-white">฿{totalRentPaid.toLocaleString()}</span>
                                <span className="text-[10px] text-gray-500">({paidPayments.length} งวด)</span>
                             </div>
                           </div>
                         </div>
                      </div>

                      {/* Payment History Table */}
                      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden flex flex-col max-h-[400px]">
                        <div className="p-3 border-b border-gray-700 bg-gray-700/50 shrink-0">
                           <h3 className="text-sm font-medium text-white flex items-center">
                              <History className="w-4 h-4 mr-2 text-blue-400"/>
                              ประวัติการชำระเงิน
                           </h3>
                        </div>
                        <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                           <table className="w-full text-sm text-left">
                              <thead className="bg-gray-700/30 text-xs uppercase text-gray-400 sticky top-0 backdrop-blur-sm z-10">
                                 <tr>
                                    <th className="px-4 py-3 text-center w-16">งวดที่</th>
                                    <th className="px-4 py-3">งวดเดือน</th>
                                    <th className="px-4 py-3">วันที่จ่าย</th>
                                    <th className="px-4 py-3 text-right">จำนวนเงิน</th>
                                    <th className="px-4 py-3 text-center">สถานะ</th>
                                    <th className="px-4 py-3 text-center">สลิป</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-700/50">
                                 {tenantPayments.length > 0 ? (
                                    tenantPayments.map((payment, index) => {
                                       // Find slip for this payment
                                       const slip = documents.find(d => d.payment_id === payment.id);
                                       return (
                                          <tr key={payment.id} className="hover:bg-gray-700/30 transition-colors">
                                             <td className="px-4 py-3 text-center text-gray-500 text-xs">
                                                {index + 1}
                                             </td>
                                             <td className="px-4 py-3 text-gray-200">
                                                {new Date(payment.due_date).toLocaleDateString("th-TH", { month: 'long', year: 'numeric' })}
                                             </td>
                                             <td className="px-4 py-3 text-gray-400">
                                                {payment.paid_date ? new Date(payment.paid_date).toLocaleDateString("th-TH") : "-"}
                                             </td>
                                             <td className="px-4 py-3 text-right font-medium text-white">
                                                ฿{payment.amount.toLocaleString()}
                                             </td>
                                             <td className="px-4 py-3 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                                                   payment.status === 'paid' ? 'bg-green-900/50 text-green-400' : 
                                                   payment.status === 'overdue' ? 'bg-red-900/50 text-red-400' : 'bg-yellow-900/50 text-yellow-400'
                                                }`}>
                                                   {payment.status === 'paid' ? 'จ่ายแล้ว' : payment.status === 'overdue' ? 'ค้างชำระ' : 'รอชำระ'}
                                                </span>
                                             </td>
                                             <td className="px-4 py-3 text-center">
                                                {slip && slip.file_url ? (
                                                   <button 
                                                      onClick={() => setPreviewImage({
                                                        url: slip.file_url || "",
                                                        name: slip.name,
                                                        type: "สลิปโอนเงิน"
                                                      })}
                                                      className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-colors"
                                                      title="ดูสลิป"
                                                   >
                                                      <Eye className="w-3 h-3" />
                                                   </button>
                                                ) : (
                                                   <span className="text-gray-600 text-[10px]">-</span>
                                                )}
                                             </td>
                                          </tr>
                                       );
                                    })
                                 ) : (
                                    <tr>
                                       <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                          ไม่มีประวัติการชำระเงิน
                                       </td>
                                    </tr>
                                 )}
                              </tbody>
                           </table>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex h-[200px] items-center justify-center text-gray-500 bg-gray-800/30 rounded-xl border border-dashed border-gray-700">
                      ไม่พบข้อมูลการเงิน
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedHistory(null);
                  }}
                  className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors font-medium"
                >
                  ปิด
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* Image Preview Modal */}
        <ImagePreviewModal
          isOpen={!!previewImage}
          onClose={() => setPreviewImage(null)}
          imageUrl={previewImage?.url || ""}
          imageName={previewImage?.name}
          documentType={previewImage?.type}
        />
      </div>
    </MainLayout>
  );
}
