"use client";

import { useState } from "react";
import {
  Bell,
  AlertTriangle,
  Calendar,
  Clock,
  CheckCircle,
  CreditCard,
  Mail,
  MailOpen,
  ChevronRight,
  Filter,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";
import { Modal } from "@/components/ui/modal";
import { useAuth } from "@/lib/auth-context";
import { useNotifications } from "@/lib/hooks/use-queries";
import type { NotificationSummary, NotificationItem } from "@/lib/supabase";

export default function NotificationsPage() {
  const { user } = useAuth();
  const { summaries, loading, markAsRead, markAllAsRead, refetch, unreadCount, totalItems } =
    useNotifications(user?.id);
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear().toString()
  );
  const [selectedMonth, setSelectedMonth] = useState("");
  const [isRead, setIsRead] = useState("");
  const [selectedSummary, setSelectedSummary] = useState<NotificationSummary | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Generate year options
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 3 }, (_, i) => currentYear - i);

  // Month options in Thai
  const monthOptions = [
    { value: "1", label: "ม.ค." },
    { value: "2", label: "ก.พ." },
    { value: "3", label: "มี.ค." },
    { value: "4", label: "เม.ย." },
    { value: "5", label: "พ.ค." },
    { value: "6", label: "มิ.ย." },
    { value: "7", label: "ก.ค." },
    { value: "8", label: "ส.ค." },
    { value: "9", label: "ก.ย." },
    { value: "10", label: "ต.ค." },
    { value: "11", label: "พ.ย." },
    { value: "12", label: "ธ.ค." },
  ];

  // Filter summaries
  const filteredSummaries = summaries?.filter((summary) => {
    const summaryDate = new Date(summary.date);
    const summaryYear = summaryDate.getFullYear().toString();
    const summaryMonth = (summaryDate.getMonth() + 1).toString();

    const yearMatch = !selectedYear || summaryYear === selectedYear;
    const monthMatch = !selectedMonth || summaryMonth === selectedMonth;
    const readMatch =
      !isRead ||
      (isRead === "read" ? summary.is_read : !summary.is_read);

    return yearMatch && monthMatch && readMatch;
  });

  const handleViewDetails = async (summary: NotificationSummary) => {
    setSelectedSummary(summary);
    setIsModalOpen(true);
    if (!summary.is_read) {
      await markAsRead(summary.id);
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const getTypeIcon = (type: string) => {
    const iconClass = "h-4 w-4";
    switch (type) {
      case "rent_overdue":
        return <AlertTriangle className={`${iconClass} text-red-400`} />;
      case "rent_due":
        return <Calendar className={`${iconClass} text-amber-400`} />;
      case "contract_expiring":
        return <Clock className={`${iconClass} text-orange-400`} />;
      case "payment_received":
        return <CheckCircle className={`${iconClass} text-emerald-400`} />;
      case "condo_payment_due":
        return <CreditCard className={`${iconClass} text-violet-400`} />;
      default:
        return <Bell className={`${iconClass} text-gray-400`} />;
    }
  };

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case "high":
        return "border-l-red-500 bg-gradient-to-r from-red-500/10 to-transparent";
      case "medium":
        return "border-l-amber-500 bg-gradient-to-r from-amber-500/10 to-transparent";
      case "low":
        return "border-l-emerald-500 bg-gradient-to-r from-emerald-500/10 to-transparent";
      default:
        return "border-l-gray-500 bg-gradient-to-r from-gray-500/10 to-transparent";
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "วันนี้";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "เมื่อวาน";
    }
    return date.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
    });
  };

  const formatFullDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("th-TH", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Group items by priority
  const groupItemsByPriority = (items: NotificationItem[]) => {
    const high = items.filter((i) => i.priority === "high");
    const medium = items.filter((i) => i.priority === "medium");
    const low = items.filter((i) => i.priority === "low");
    return { high, medium, low };
  };

  // Calculate stats
  const highPriorityCount = summaries?.reduce((sum, s) => sum + s.high_count, 0) || 0;

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary/20 via-violet-600/10 to-transparent border border-white/10 p-4 sm:p-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div>
                <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                  <div className="p-1.5 sm:p-2 bg-primary/20 rounded-lg sm:rounded-xl">
                    <Bell className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold text-white">การแจ้งเตือน</h1>
                </div>
                <p className="text-sm sm:text-base text-gray-400">
                  ติดตามการแจ้งเตือนและข้อมูลสำคัญของคุณ
                </p>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="px-3 py-2 sm:px-4 sm:py-2.5 bg-primary text-white rounded-lg sm:rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2 font-medium text-sm"
                >
                  <MailOpen className="h-4 w-4" />
                  อ่านทั้งหมด
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 sm:gap-3 mt-3 sm:mt-4">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 text-white text-xs sm:text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year} className="bg-gray-900">
                    {year + 543}
                  </option>
                ))}
              </select>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 text-white text-xs sm:text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              >
                <option value="" className="bg-gray-900">ทุกเดือน</option>
                {monthOptions.map((month) => (
                  <option key={month.value} value={month.value} className="bg-gray-900">
                    {month.label}
                  </option>
                ))}
              </select>
              <select
                value={isRead}
                onChange={(e) => setIsRead(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 text-white text-xs sm:text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              >
                <option value="" className="bg-gray-900">ทั้งหมด</option>
                <option value="unread" className="bg-gray-900">ยังไม่อ่าน</option>
                <option value="read" className="bg-gray-900">อ่านแล้ว</option>
              </select>
            </div>
          </div>
        </div>

        {/* Inbox List */}
        <div className="bg-card/30 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-white/10 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
            </div>
          ) : filteredSummaries?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <div className="p-4 bg-white/5 rounded-full mb-4">
                <Sparkles className="h-8 w-8" />
              </div>
              <p className="text-lg font-medium text-white mb-1">ไม่มีการแจ้งเตือน</p>
              <p className="text-sm">คุณไม่มีรายการแจ้งเตือนในขณะนี้</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredSummaries?.map((summary, idx) => (
                <div
                  key={summary.id}
                  onClick={() => handleViewDetails(summary)}
                  className={`group relative flex items-center gap-3 sm:gap-4 p-3 sm:p-4 cursor-pointer transition-all hover:bg-white/5 ${
                    !summary.is_read ? "bg-primary/5" : ""
                  }`}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  {/* Unread indicator */}
                  {!summary.is_read && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
                  )}

                  {/* Icon */}
                  <div
                    className={`flex-shrink-0 p-2 sm:p-3 rounded-lg sm:rounded-xl transition-all ${
                      !summary.is_read
                        ? "bg-primary/20 text-primary"
                        : "bg-white/5 text-gray-400 group-hover:bg-white/10"
                    }`}
                  >
                    {!summary.is_read ? (
                      <Mail className="h-4 w-4 sm:h-5 sm:w-5" />
                    ) : (
                      <MailOpen className="h-4 w-4 sm:h-5 sm:w-5" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 sm:mb-1">
                      <span className={`font-semibold text-sm sm:text-base ${!summary.is_read ? "text-white" : "text-gray-300"}`}>
                        {formatDate(summary.date)}
                      </span>
                      {!summary.is_read && (
                        <span className="px-1.5 py-0.5 sm:px-2 bg-primary/20 text-primary text-xs font-medium rounded-full">
                          ใหม่
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Bell className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        {summary.total_count} รายการ
                      </span>
                      {summary.high_count > 0 && (
                        <span className="flex items-center gap-1 text-red-400">
                          <AlertTriangle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          {summary.high_count} สำคัญ
                        </span>
                      )}
                      {summary.email_sent && (
                        <span className="hidden sm:flex items-center gap-1 text-emerald-400">
                          <CheckCircle className="h-3.5 w-3.5" />
                          ส่งเมลแล้ว
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="h-5 w-5 text-gray-500 group-hover:text-white transition-colors" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title=""
        size="lg"
      >
        {selectedSummary && (
          <div className="space-y-6">
            {/* Modal Header */}
            <div className="text-center pb-4 border-b border-white/10">
              <div className="inline-flex p-3 bg-primary/20 rounded-2xl mb-3">
                <Bell className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-white">
                แจ้งเตือน{formatDate(selectedSummary.date) === "วันนี้" ? "วันนี้" : ""}
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                {formatFullDate(selectedSummary.date)}
              </p>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                <div className="text-xl font-bold text-white">
                  {selectedSummary.total_count}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">ทั้งหมด</div>
              </div>
              <div className="bg-red-500/10 rounded-xl p-3 text-center border border-red-500/20">
                <div className="text-xl font-bold text-red-400">
                  {selectedSummary.high_count}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">สำคัญ</div>
              </div>
              <div className="bg-amber-500/10 rounded-xl p-3 text-center border border-amber-500/20">
                <div className="text-xl font-bold text-amber-400">
                  {selectedSummary.medium_count}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">ปานกลาง</div>
              </div>
            </div>

            {/* Grouped Items */}
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {(() => {
                const grouped = groupItemsByPriority(selectedSummary.items || []);
                return (
                  <>
                    {/* High Priority */}
                    {grouped.high.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1 bg-red-500/20 rounded">
                            <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                          </div>
                          <span className="text-sm font-medium text-red-400">
                            สำคัญสูง ({grouped.high.length})
                          </span>
                        </div>
                        <div className="space-y-2">
                          {grouped.high.map((item, idx) => (
                            <div
                              key={idx}
                              className={`border-l-4 p-3 rounded-lg ${getPriorityStyles(item.priority)}`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                {getTypeIcon(item.type)}
                                <span className="font-medium text-white text-sm">{item.title}</span>
                              </div>
                              <p className="text-xs text-gray-400 leading-relaxed">{item.message}</p>
                              {item.amount && (
                                <div className="mt-2 inline-flex items-center px-2 py-1 bg-white/5 rounded text-xs font-medium text-white">
                                  ฿{item.amount.toLocaleString()}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Medium Priority */}
                    {grouped.medium.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1 bg-amber-500/20 rounded">
                            <Calendar className="h-3.5 w-3.5 text-amber-400" />
                          </div>
                          <span className="text-sm font-medium text-amber-400">
                            ปานกลาง ({grouped.medium.length})
                          </span>
                        </div>
                        <div className="space-y-2">
                          {grouped.medium.map((item, idx) => (
                            <div
                              key={idx}
                              className={`border-l-4 p-3 rounded-lg ${getPriorityStyles(item.priority)}`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                {getTypeIcon(item.type)}
                                <span className="font-medium text-white text-sm">{item.title}</span>
                              </div>
                              <p className="text-xs text-gray-400 leading-relaxed">{item.message}</p>
                              {item.amount && (
                                <div className="mt-2 inline-flex items-center px-2 py-1 bg-white/5 rounded text-xs font-medium text-white">
                                  ฿{item.amount.toLocaleString()}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Low Priority */}
                    {grouped.low.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1 bg-emerald-500/20 rounded">
                            <Bell className="h-3.5 w-3.5 text-emerald-400" />
                          </div>
                          <span className="text-sm font-medium text-emerald-400">
                            ทั่วไป ({grouped.low.length})
                          </span>
                        </div>
                        <div className="space-y-2">
                          {grouped.low.map((item, idx) => (
                            <div
                              key={idx}
                              className={`border-l-4 p-3 rounded-lg ${getPriorityStyles(item.priority)}`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                {getTypeIcon(item.type)}
                                <span className="font-medium text-white text-sm">{item.title}</span>
                              </div>
                              <p className="text-xs text-gray-400 leading-relaxed">{item.message}</p>
                              {item.amount && (
                                <div className="mt-2 inline-flex items-center px-2 py-1 bg-white/5 rounded text-xs font-medium text-white">
                                  ฿{item.amount.toLocaleString()}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </Modal>
    </MainLayout>
  );
}
