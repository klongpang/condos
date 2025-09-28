"use client";

import { useState } from "react";
import {
  Bell,
  AlertTriangle,
  Calendar,
  Clock,
  Filter,
  Search,
  Eye,
  CheckCircle,
} from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { useAuth } from "@/lib/auth-context";
import {
  useNotificationsDB,
  useCondosDB,
  useTenantsDB,
} from "@/lib/hooks/use-database";

export default function NotificationsPage() {
  const { user } = useAuth();
  const { notifications, loading, markAsRead, markAllAsRead, refetch } =
    useNotificationsDB(user?.id);
  const { condos } = useCondosDB(user?.id);
  const { tenants } = useTenantsDB(user?.id);
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear().toString()
  );
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("");
  const [isRead, setIsRead] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNotification, setSelectedNotification] = useState<any | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Generate year options (current year and 2 years back)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 3 }, (_, i) => currentYear - i);

  // Month options in Thai
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

  // Filter notifications
  const filteredNotifications = notifications?.filter((notification: any) => {
    const notificationDate = new Date(notification.date);
    const notificationYear = notificationDate.getFullYear().toString();
    const notificationMonth = (notificationDate.getMonth() + 1).toString();

    const yearMatch = !selectedYear || notificationYear === selectedYear;
    const monthMatch = !selectedMonth || notificationMonth === selectedMonth;
    const typeMatch = !selectedType || notification.type === selectedType;
    const priorityMatch =
      !selectedPriority || notification.priority === selectedPriority;
    const readMatch =
      !isRead ||
      (isRead === "read" ? notification.is_read : !notification.is_read);
    const searchMatch =
      !searchTerm ||
      notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchTerm.toLowerCase());

    return (
      yearMatch &&
      monthMatch &&
      typeMatch &&
      priorityMatch &&
      readMatch &&
      searchMatch
    );
  });

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "rent_overdue":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "rent_due":
        return <Calendar className="h-4 w-4 text-yellow-500" />;
      case "contract_expiring":
        return <Clock className="h-4 w-4 text-orange-500" />;
      case "payment_received":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "maintenance":
        return <AlertTriangle className="h-4 w-4 text-blue-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case "rent_overdue":
        return "ค่าเช่าเกินกำหนด";
      case "rent_due":
        return "ค่าเช่าครบกำหนด";
      case "contract_expiring":
        return "สัญญาใกล้หมดอายุ";
      case "payment_received":
        return "ได้รับการชำระเงิน";
      case "maintenance":
        return "แจ้งซ่อมบำรุง";
      default:
        return "การแจ้งเตือน";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-900 text-red-300";
      case "medium":
        return "bg-yellow-900 text-yellow-300";
      case "low":
        return "bg-green-900 text-green-300";
      default:
        return "bg-gray-900 text-gray-300";
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case "high":
        return "สูง";
      case "medium":
        return "ปานกลาง";
      case "low":
        return "ต่ำ";
      default:
        return "ปกติ";
    }
  };

  const columns = [
    {
      key: "type",
      header: "ประเภท",
      render: (notification: any) => (
        <div className="flex items-center">
          {getTypeIcon(notification.type)}
          <span className="ml-2">{getTypeText(notification.type)}</span>
        </div>
      ),
    },
    {
      key: "title",
      header: "หัวข้อ",
      render: (notification: any) => (
        <div
          className={`font-medium ${
            !notification.is_read ? "text-white" : "text-gray-300"
          }`}
        >
          {notification.title}
          {!notification.is_read && (
            <span className="ml-2 w-2 h-2 bg-blue-500 rounded-full inline-block"></span>
          )}
        </div>
      ),
    },
    {
      key: "message",
      header: "ข้อความ",
      render: (notification: any) => (
        <div
          className="max-w-md truncate text-gray-300"
          title={notification.message}
        >
          {notification.message}
          {notification.tenant?.full_name &&
            ` (ผู้เช่า: ${notification.tenant.full_name})`}
          {notification.condo?.room_number &&
            ` (ห้อง: ${notification.condo.room_number})`}
        </div>
      ),
    },
    {
      key: "priority",
      header: "ความสำคัญ",
      render: (notification: any) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(
            notification.priority
          )}`}
        >
          {getPriorityText(notification.priority)}
        </span>
      ),
    },
    {
      key: "date",
      header: "วันที่",
      render: (notification: any) => (
        <div className="text-sm">
          <div>{new Date(notification.date).toLocaleDateString("th-TH")}</div>
          <div className="text-gray-400">
            {new Date(notification.date).toLocaleTimeString("th-TH")}
          </div>
        </div>
      ),
    },
    {
      key: "actions",
      header: "การดำเนินการ",
      render: (notification: any) => (
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setSelectedNotification(notification);
              setIsModalOpen(true);
              if (!notification.is_read) {
                handleMarkAsRead(notification.id);
              }
            }}
            className="text-blue-400 hover:text-blue-300"
            title="ดูรายละเอียด"
          >
            <Eye className="h-4 w-4" />
          </button>
          {!notification.is_read && (
            <button
              onClick={() => handleMarkAsRead(notification.id)}
              className="text-green-400 hover:text-green-300"
              title="ทำเครื่องหมายว่าอ่านแล้ว"
            >
              <CheckCircle className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const unreadCount = notifications?.filter((n: any) => !n.is_read).length || 0;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center">
              <Bell className="h-8 w-8 mr-3 text-green-500" />
              การแจ้งเตือน
              {unreadCount > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {unreadCount}
                </span>
              )}
            </h1>
            <p className="text-gray-400">จัดการการแจ้งเตือนและข้อความสำคัญ</p>
          </div>
          <button
            onClick={handleMarkAllAsRead}
            className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            disabled={unreadCount === 0}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            ทำเครื่องหมายทั้งหมดว่าอ่านแล้ว
          </button>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <div className="flex items-center space-x-4 mb-4">
            <Filter className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-300">ตัวกรอง:</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                ปี
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
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
              <label className="block text-sm font-medium text-gray-300 mb-1">
                เดือน
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">ทุกเดือน</option>
                {monthOptions.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                ประเภท
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">ทุกประเภท</option>
                <option value="rent_overdue">ค่าเช่าเกินกำหนด</option>
                <option value="rent_due">ค่าเช่าครบกำหนด</option>
                <option value="contract_expiring">สัญญาใกล้หมดอายุ</option>
                <option value="payment_received">ได้รับการชำระเงิน</option>
                <option value="maintenance">แจ้งซ่อมบำรุง</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                ความสำคัญ
              </label>
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">ทุกระดับ</option>
                <option value="high">สูง</option>
                <option value="medium">ปานกลาง</option>
                <option value="low">ต่ำ</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                สถานะ
              </label>
              <select
                value={isRead}
                onChange={(e) => setIsRead(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">ทั้งหมด</option>
                <option value="unread">ยังไม่อ่าน</option>
                <option value="read">อ่านแล้ว</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                ค้นหา
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="ค้นหา..."
                />
              </div>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-400">
            พบ {filteredNotifications?.length} รายการ จากทั้งหมด{" "}
            {notifications?.length} รายการ
          </div>
        </div>

        {/* Notifications Table */}
        <DataTable
          data={filteredNotifications}
          columns={columns}
          loading={loading}
          emptyMessage="ไม่พบการแจ้งเตือน"
          itemsPerPage={10}
        />

        {/* Notification Detail Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedNotification(null);
          }}
          title="รายละเอียดการแจ้งเตือน"
          size="lg"
        >
          {selectedNotification && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {getTypeIcon(selectedNotification.type)}
                  <span className="ml-2 text-lg font-medium text-white">
                    {selectedNotification.title}
                  </span>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(
                    selectedNotification.priority
                  )}`}
                >
                  {getPriorityText(selectedNotification.priority)}
                </span>
              </div>

              <div className="bg-gray-700 rounded-lg p-4">
                <p className="text-gray-300">{selectedNotification.message}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300">
                    ประเภท
                  </label>
                  <p className="text-white">
                    {getTypeText(selectedNotification.type)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300">
                    วันที่และเวลา
                  </label>
                  <p className="text-white">
                    {new Date(selectedNotification.date).toLocaleDateString(
                      "th-TH"
                    )}{" "}
                    {new Date(selectedNotification.date).toLocaleTimeString(
                      "th-TH"
                    )}
                  </p>
                </div>
              </div>

              {selectedNotification.tenant_id && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      ผู้เช่า
                    </label>
                    <p className="text-white">
                      {selectedNotification.tenant?.full_name || "ไม่ทราบ"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      ห้อง
                    </label>
                    <p className="text-white">
                      {selectedNotification.condo
                        ? `${selectedNotification.condo.name} (${selectedNotification.condo.room_number})`
                        : "ไม่ทราบ"}
                    </p>
                  </div>
                </div>
              )}

              {selectedNotification.amount && (
                <div>
                  <label className="block text-sm font-medium text-gray-300">
                    จำนวนเงิน
                  </label>
                  <p className="text-white text-lg font-medium">
                    ฿{selectedNotification.amount.toLocaleString()}
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedNotification(null);
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
