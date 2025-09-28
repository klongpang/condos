"use client"
import Link from "next/link"
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation"
// นำเข้าไอคอนสำหรับปุ่มย่อ/ขยาย
import { Home, Building2, Users, CreditCard, TrendingUp, FileText, Bell, Settings, LogOut, History, Loader2, ChevronsLeft, ChevronsRight } from "lucide-react"
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
  const [isCollapsed, setIsCollapsed] = useState(false)

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

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed)
  }
  
  const sidebarWidthClass = isCollapsed ? "w-20" : "w-64"
  const CollapseIcon = isCollapsed ? ChevronsRight : ChevronsLeft

  return (
    <div className={cn("flex h-full flex-col bg-gray-900 border-r border-gray-800 transition-all duration-300 ease-in-out relative", sidebarWidthClass)}>
      
      {/* ปุ่มย่อ/ขยาย - ปรับใหม่ให้สวยขึ้น */}
      <button
        onClick={toggleSidebar}
        className={cn(
          "absolute top-6 z-20 group transition-all duration-300 ease-in-out",
          "bg-gray-800 hover:bg-green-600 border-2 border-gray-700 hover:border-green-500",
          "rounded-full p-2 shadow-lg hover:shadow-xl",
          "text-gray-400 hover:text-white",
          "transform hover:scale-110 active:scale-95",
          // Animation สำหรับการเปลี่ยนตำแหน่ง
          isCollapsed 
            ? "-right-4 translate-x-0" 
            : "-right-4 translate-x-0"
        )}
        style={{ 
          right: '-1rem',
          background: 'linear-gradient(135deg, #374151 0%, #4b5563 100%)',
        }}
        aria-expanded={!isCollapsed}
        aria-label={isCollapsed ? "ขยายเมนู" : "ยุบเมนู"}
      >
        <CollapseIcon className={cn(
          "h-4 w-4 transition-transform duration-300 ease-in-out",
          "group-hover:rotate-12"
        )} />
        
        {/* Ripple effect */}
        <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-20 group-hover:animate-ping bg-green-400 transition-opacity duration-300"></div>
      </button>

      {/* Logo */}
      <div className="flex h-16 items-center px-4 border-b border-gray-800 relative">
        <div className={cn(
          "flex items-center transition-all duration-300",
          isCollapsed && "justify-center w-full"
        )}>
          <div className="relative">
            <Building2 className="h-8 w-8 text-green-500 flex-shrink-0 transition-all duration-300 hover:text-green-400" />
            {/* Glow effect */}
            <div className="absolute inset-0 h-8 w-8 text-green-500 opacity-50 blur-sm">
              <Building2 className="h-8 w-8" />
            </div>
          </div>
          
          {/* ชื่อแอพ - ซ่อนเมื่อย่อ */}
          <div className={cn(
            "ml-3 transition-all duration-300 overflow-hidden",
            isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
          )}>
            <span className="text-xl font-bold text-white whitespace-nowrap bg-gradient-to-r from-white to-green-300 bg-clip-text text-transparent">
              CondoManager
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "relative flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-300 group overflow-hidden",
                isActive 
                  ? "bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg shadow-green-600/25" 
                  : "text-gray-300 hover:bg-gray-800 hover:text-white hover:shadow-md",
                isCollapsed ? "justify-center" : "",
                // เพิ่ม border เมื่อ active
                isActive && "border border-green-500/50"
              )}
            >
              {/* Background animation */}
              {!isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-gray-800 to-gray-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
              )}
              
              <div className="relative z-10 flex items-center">
                <item.icon className={cn(
                  "h-5 w-5 flex-shrink-0 transition-all duration-300",
                  !isCollapsed && "mr-3",
                  isActive && "drop-shadow-sm",
                  "group-hover:scale-110"
                )} />
                
                {/* ข้อความ - ซ่อนเมื่อย่อ */}
                <span className={cn(
                  "whitespace-nowrap transition-all duration-300 relative z-10",
                  isCollapsed 
                    ? "opacity-0 w-0 translate-x-4" 
                    : "opacity-100 w-auto translate-x-0"
                )}>
                  {item.name}
                </span>
              </div>

              {/* Tooltip เมื่อย่อ - ปรับปรุงให้สวยขึ้น */}
              {isCollapsed && (
                <div className={cn(
                  "absolute left-full ml-6 px-3 py-2 text-sm text-white",
                  "bg-gray-800 border border-gray-600 rounded-lg shadow-xl",
                  "whitespace-nowrap z-50 pointer-events-none",
                  "opacity-0 scale-95 translate-x-2 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0",
                  "transition-all duration-200 ease-out"
                )}>
                  {item.name}
                  {/* Arrow */}
                  <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1">
                    <div className="w-2 h-2 bg-gray-800 border-l border-t border-gray-600 rotate-45"></div>
                  </div>
                </div>
              )}

              
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-gray-800 p-4">
        {/* User Info */}
        <div className={cn(
          "flex items-center mb-4 transition-all duration-300",
          isCollapsed && "justify-center"
        )}>
          <div className="relative group">
            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-green-600 to-green-700 flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ring-green-500/30 transition-all duration-300 group-hover:ring-green-500/60 group-hover:scale-105">
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
            {/* Online indicator */}
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 border-2 border-gray-900 rounded-full animate-pulse"></div>
          </div>
          
          {/* User details - ซ่อนเมื่อย่อ */}
          <div className={cn(
            "ml-3 overflow-hidden transition-all duration-300",
            isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
          )}>
            <p className="text-sm font-medium text-white whitespace-nowrap truncate">
              {user?.full_name}
            </p>
            <p className="text-xs text-gray-400 whitespace-nowrap truncate">
              {user?.email}
            </p>
          </div>
        </div>

        {/* Settings and Logout Buttons */}
        <div className="space-y-2">
          <button
            onClick={onOpenProfileModal}
            className={cn(
              "flex items-center w-full px-3 py-3 text-sm rounded-xl transition-all duration-300 group relative overflow-hidden",
              "text-gray-300 hover:bg-gray-800 hover:text-white hover:shadow-md",
              isCollapsed && "justify-center"
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
            <Settings className={cn(
              "h-4 w-4 flex-shrink-0 relative z-10 transition-transform duration-300 group-hover:rotate-90",
              !isCollapsed && "mr-3"
            )} />
            {!isCollapsed && (
              <span className="whitespace-nowrap relative z-10">ตั้งค่าโปรไฟล์</span>
            )}
          </button>
          
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={cn(
              "flex items-center w-full px-3 py-3 text-sm rounded-xl transition-all duration-300 group relative overflow-hidden",
              isLoggingOut 
                ? "bg-gray-700 text-gray-400 cursor-not-allowed" 
                : "text-gray-300 hover:bg-red-900/50 hover:text-white hover:shadow-md hover:shadow-red-900/25",
              isCollapsed && "justify-center"
            )}
          >
            {!isLoggingOut && (
              <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-pink-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
            )}
            
            {isLoggingOut ? (
              <Loader2 className={cn(
                "h-4 w-4 animate-spin flex-shrink-0 relative z-10",
                !isCollapsed && "mr-3"
              )} />
            ) : (
              <LogOut className={cn(
                "h-4 w-4 flex-shrink-0 relative z-10 transition-transform duration-300 group-hover:translate-x-1",
                !isCollapsed && "mr-3"
              )} />
            )}
            
            {!isCollapsed && (
              <span className="whitespace-nowrap relative z-10">
                {isLoggingOut ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}