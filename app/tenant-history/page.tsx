"use client";

import { useState } from "react";
import {
  History,
  Calendar,
  User,
  Phone,
  MessageCircle,
  FileText,
} from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { useCondos, useTenantHistory } from "@/lib/hooks/use-queries";
import { useAuth } from "@/lib/auth-context";
import type { TenantHistory } from "@/lib/supabase";

export default function TenantHistoryPage() {
  const { user } = useAuth();
  const { condos } = useCondos(user?.id);
  const { tenantHistory, loading, error, refresh } = useTenantHistory(user?.id);
  const [selectedHistory, setSelectedHistory] = useState<TenantHistory | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCondo, setSelectedCondo] = useState<string>("");

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
          {history.actual_end_date && (
            <div className="text-yellow-400 text-xs">
              จริง:{" "}
              {new Date(history.actual_end_date).toLocaleDateString("th-TH")}
            </div>
          )}
        </div>
      ),
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
      key: "moved_out_at",
      header: "วันที่ย้ายออก",
      render: (history: TenantHistory) =>
        new Date(history.moved_out_at).toLocaleDateString("th-TH"),
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
              {/* ข้อมูลผู้เช่า */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-medium text-white mb-3">
                  ข้อมูลผู้เช่า
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      ชื่อ-นามสกุล
                    </label>
                    <p className="text-white">{selectedHistory.full_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      ห้อง
                    </label>
                    <p className="text-white">
                      {(() => {
                        // แทนที่ mockCondos.find ด้วย condos.find ในทุกที่
                        const condo = condos?.find(
                          (c) => c.id === selectedHistory.condo_id
                        );
                        return condo
                          ? `${condo.name} (${condo.room_number})`
                          : "ไม่ทราบ";
                      })()}
                    </p>
                  </div>
                  {selectedHistory.phone && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300">
                        เบอร์โทรศัพท์
                      </label>
                      <p className="text-white flex items-center">
                        <Phone className="h-4 w-4 mr-2" />
                        {selectedHistory.phone}
                      </p>
                    </div>
                  )}
                  {selectedHistory.line_id && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300">
                        Line ID
                      </label>
                      <p className="text-white flex items-center">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        {selectedHistory.line_id}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* ข้อมูลการเช่า */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-medium text-white mb-3">
                  ข้อมูลการเช่า
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      วันที่เริ่มเช่า
                    </label>
                    <p className="text-white">
                      {new Date(
                        selectedHistory.rental_start
                      ).toLocaleDateString("th-TH")}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      วันที่สิ้นสุดสัญญา
                    </label>
                    <p className="text-white">
                      {new Date(selectedHistory.rental_end).toLocaleDateString(
                        "th-TH"
                      )}
                    </p>
                  </div>
                  {selectedHistory.actual_end_date && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300">
                        วันที่ย้ายออกจริง
                      </label>
                      <p className="text-yellow-400">
                        {new Date(
                          selectedHistory.actual_end_date
                        ).toLocaleDateString("th-TH")}
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      ค่าเช่าต่อเดือน
                    </label>
                    <p className="text-white">
                      ฿{selectedHistory.monthly_rent.toLocaleString()}
                    </p>
                  </div>
                  {selectedHistory.deposit && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300">
                        เงินประกัน
                      </label>
                      <p className="text-white">
                        ฿{selectedHistory.deposit.toLocaleString()}
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      สาเหตุสิ้นสุดสัญญา
                    </label>
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getEndReasonColor(
                        selectedHistory.end_reason
                      )}`}
                    >
                      {getEndReasonText(selectedHistory.end_reason)}
                    </span>
                  </div>
                </div>
              </div>

              {/* หมายเหตุ */}
              {selectedHistory.notes && (
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-white mb-3">
                    หมายเหตุ
                  </h3>
                  <p className="text-gray-300">{selectedHistory.notes}</p>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedHistory(null);
                  }}
                  className="px-4 py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
                >
                  ปิด
                </button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </MainLayout>
  );
}
