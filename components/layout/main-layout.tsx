"use client"

import type React from "react"
import { Sidebar } from "./sidebar"
import { useState } from "react"
import { ProfileSettingsModal } from "@/components/ui/profile-settings-modal"
import { useAuth } from "@/lib/auth-context"

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const { user, refetchUser } = useAuth() // Destructure refetchUser from useAuth

  return (
    <div className="flex h-screen bg-gray-950">
      <Sidebar onOpenProfileModal={() => setIsProfileModalOpen(true)} /> {/* Pass the function here */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">{children}</div>
      </main>
      {/* Render the ProfileSettingsModal */}
      <ProfileSettingsModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={user}
        onUpdateSuccess={refetchUser} // Pass refetchUser to update AuthContext after successful save
      />
    </div>
  )
}
