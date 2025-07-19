"use client"

import type React from "react"
import { Sidebar } from "./sidebar"
import { useState, useEffect } from "react" // เพิ่ม useEffect
import { ProfileSettingsModal } from "@/components/ui/profile-settings-modal"
import { useAuth } from "@/lib/auth-context"
import { AuthInitializer } from "@/components/AuthInitializer"
import { useRouter } from "next/navigation" // เพิ่ม useRouter


interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const { user, isLoading, refetchUser } = useAuth() // เพิ่ม isLoading
  const router = useRouter()

  // ตรวจสอบการล็อกอินเมื่อ user หรือ isLoading เปลี่ยนแปลง
  useEffect(() => {
    if (!isLoading && !user) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
    }
  }, [user, isLoading, router])

  // แสดง loading screen ขณะตรวจสอบสถานะการล็อกอิน
  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
       
      </div>
    )
  }

  return (
    <>
      <AuthInitializer /> {/* เพิ่ม AuthInitializer ที่นี่ */}
      <div className="flex h-screen bg-gray-950">
        <Sidebar onOpenProfileModal={() => setIsProfileModalOpen(true)} />
        <main className="flex-1 overflow-auto">
          <div className="p-6">{children}</div>
        </main>
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