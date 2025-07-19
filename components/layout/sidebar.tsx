"use client"
import Link from "next/link"
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation"
import { Home, Building2, Users, CreditCard, TrendingUp, FileText, Bell, Settings, LogOut, History, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"

interface SidebarProps {
  onOpenProfileModal: () => void
}

const navigation = [
  { name: "แดชบอร์ด", href: "/dashboard", icon: Home },
  { name: "คอนโด", href: "/condos", icon: Building2 },
  { name: "ผู้เช่า", href: "/tenants", icon: Users },
  { name: "ประวัติผู้เช่า", href: "/tenant-history", icon: History },
  { name: "จัดการค่าเช่า", href: "/rent", icon: CreditCard },
  { name: "การเงิน", href: "/financials", icon: TrendingUp },
  { name: "รายงาน", href: "/reports", icon: FileText },
  { name: "การแจ้งเตือน", href: "/notifications", icon: Bell },
]

export function Sidebar({ onOpenProfileModal }: SidebarProps) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
      router.push("/login")
    } catch (error) {
      console.error("Logout error:", error)
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900 border-r border-gray-800">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-gray-800">
        <Building2 className="h-8 w-8 text-green-500" />
        <span className="ml-2 text-xl font-bold text-white">CondoManager</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                isActive ? "bg-green-600 text-white" : "text-gray-300 hover:bg-gray-800 hover:text-white",
              )}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-gray-800 p-4">
        <div className="flex items-center mb-4">
          <div className="h-10 w-10 rounded-full bg-green-600 flex items-center justify-center overflow-hidden">
            {user?.profile_picture_url ? (
              <img
                src={user.profile_picture_url || "/placeholder.svg"}
                alt="Profile"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-sm font-medium text-white">{user?.full_name?.charAt(0) || "U"}</span>
            )}
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-white">{user?.full_name}</p>
            <p className="text-xs text-gray-400">{user?.email}</p>
          </div>
        </div>

        <div className="space-y-1">
          <button
            onClick={onOpenProfileModal}
            className="flex items-center w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
          >
            <Settings className="mr-3 h-4 w-4" />
            ตั้งค่าโปรไฟล์
          </button>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={cn(
              "flex items-center w-full px-3 py-2 text-sm rounded-lg transition-colors",
              isLoggingOut 
                ? "bg-gray-700 text-gray-400 cursor-not-allowed" 
                : "text-gray-300 hover:bg-gray-800 hover:text-white"
            )}
          >
            {isLoggingOut ? (
              <>
                <Loader2 className="mr-3 h-4 w-4 animate-spin" />
                กำลังออกจากระบบ...
              </>
            ) : (
              <>
                <LogOut className="mr-3 h-4 w-4" />
                ออกจากระบบ
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}