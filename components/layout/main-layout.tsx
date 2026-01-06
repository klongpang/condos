"use client"

import type React from "react"
import { Sidebar, MobileHeader } from "./sidebar"
import { useState, useEffect } from "react"
import { ProfileSettingsModal } from "@/components/ui/profile-settings-modal"
import { useAuth } from "@/lib/auth-context"
import { AuthInitializer } from "@/components/AuthInitializer"
import { useRouter } from "next/navigation"


interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const { user, isLoading, refetchUser } = useAuth()
  const router = useRouter()

  // ตรวจสอบการล็อกอินเมื่อ user หรือ isLoading เปลี่ยนแปลง
  useEffect(() => {
    if (!isLoading && !user) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
    }
  }, [user, isLoading, router])

  // Close mobile sidebar on window resize (when switching to desktop)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileSidebarOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // แสดง loading screen ขณะตรวจสอบสถานะการล็อกอิน
  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
       
      </div>
    )
  }

  return (
    <>
      <AuthInitializer />
      <div className="flex flex-col h-screen bg-gray-950">
        {/* Mobile Header */}
        <MobileHeader onMenuClick={() => setIsMobileSidebarOpen(true)} />
        
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <Sidebar 
            onOpenProfileModal={() => setIsProfileModalOpen(true)}
            isMobileOpen={isMobileSidebarOpen}
            onMobileClose={() => setIsMobileSidebarOpen(false)}
          />
          
          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <div className="p-3 sm:p-4 md:py-6 md:px-10 lg:py-8 lg:px-12">{children}</div>
          </main>
        </div>
        
        <ProfileSettingsModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          currentUser={user}
          onUpdateSuccess={refetchUser}
        />
      </div>
    </>
  )
}