"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { User, Lock, ImageIcon } from "lucide-react"
import { Modal } from "@/components/ui/modal"
import { Notification } from "@/components/ui/notification"
import { Button } from "@/components/ui/button"
import { updateUserProfile } from "@/app/actions/user-actions"
import type { User as UserType } from "@/lib/supabase"


interface ProfileSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  currentUser: UserType | null
  onUpdateSuccess: () => void
}

export function ProfileSettingsModal({ isOpen, onClose, currentUser, onUpdateSuccess }: ProfileSettingsModalProps) {
  const [fullName, setFullName] = useState(currentUser?.full_name || "")
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")
  const [profilePicture, setProfilePicture] = useState<File | null>(null)
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(
    currentUser?.profile_picture_url || null,
  )
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null)

  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.full_name)
      setProfilePicturePreview(currentUser.profile_picture_url || null)
    }
  }, [currentUser])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setProfilePicture(file)
      setProfilePicturePreview(URL.createObjectURL(file))
    } else {
      setProfilePicture(null)
      setProfilePicturePreview(currentUser?.profile_picture_url || null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setNotification(null)

    if (newPassword && newPassword !== confirmNewPassword) {
      setNotification({ message: "รหัสผ่านใหม่ไม่ตรงกัน", type: "error" })
      setLoading(false)
      return
    }

    const formData = new FormData()
    formData.append("userId", currentUser?.id || "")
    formData.append("full_name", fullName)
    if (oldPassword) formData.append("old_password", oldPassword) // For future validation
    if (newPassword) formData.append("new_password", newPassword)
    if (profilePicture) formData.append("profile_picture", profilePicture)

    try {
      const result = await updateUserProfile(formData)
      if (result.success) {
        setNotification({ message: result.message, type: "success" })
        onUpdateSuccess() // Trigger refetch in AuthContext
        // Clear password fields after successful update
        setOldPassword("")
        setNewPassword("")
        setConfirmNewPassword("")
        setProfilePicture(null) // Clear file input
      } else {
        setNotification({ message: result.message, type: "error" })
      }
    } catch (error: any) {
      setNotification({ message: `เกิดข้อผิดพลาด: ${error.message}`, type: "error" })
      console.error("Profile update error:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ตั้งค่าโปรไฟล์" size="md">
      {notification && (
        <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Picture */}
        <div className="flex flex-col items-center gap-4">
  <div className="relative">
    <div className="h-24 w-24 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden border border-gray-600">
      {profilePicturePreview ? (
        <img
          src={profilePicturePreview || "/placeholder.svg"}
          alt="Profile"
          className="h-full w-full object-cover"
        />
      ) : (
        <User className="h-12 w-12 text-gray-400" />
      )}
    </div>
    <label
      htmlFor="profile-picture-upload"
      className="absolute -bottom-0.5 -right-0.5 bg-green-600 p-1 rounded-full cursor-pointer hover:bg-green-700 transition-colors"
      title="เปลี่ยนรูปโปรไฟล์"
    >
      <ImageIcon className="h-4 w-4 text-white" />
      <input
        id="profile-picture-upload"
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </label>
  </div>

          <p className="text-sm text-gray-400">คลิกไอคอนกล้องเพื่อเปลี่ยนรูปโปรไฟล์</p>
        </div>

        {/* Full Name */}
        <div>
          <label htmlFor="full_name" className="block text-sm font-medium text-gray-300 mb-1">
            ชื่อ-นามสกุล
          </label>
          <input
            id="full_name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          />
        </div>

        {/* Password Fields */}
        <div className="space-y-4 border-t border-gray-700 pt-6">
          <h3 className="text-lg font-medium text-white flex items-center">
            <Lock className="h-5 w-5 mr-2 text-gray-400" />
            เปลี่ยนรหัสผ่าน
          </h3>
          <div>
            <label htmlFor="old_password" className="block text-sm font-medium text-gray-300 mb-1">
              รหัสผ่านปัจจุบัน (ไม่บังคับ)
            </label>
            <input
              id="old_password"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label htmlFor="new_password" className="block text-sm font-medium text-gray-300 mb-1">
              รหัสผ่านใหม่
            </label>
            <input
              id="new_password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label htmlFor="confirm_new_password" className="block text-sm font-medium text-gray-300 mb-1">
              ยืนยันรหัสผ่านใหม่
            </label>
            <input
              id="confirm_new_password"
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            ยกเลิก
          </Button>
          <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={loading}>
            {loading ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
