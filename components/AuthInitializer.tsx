// components/AuthInitializer.tsx
"use client"
import { useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter, usePathname } from "next/navigation"

export function AuthInitializer() {
  const { user, isLoading, refetchUser } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // เซ็ตคุกกี้ชั่วคราวสำหรับ middleware
    if (user?.id) {
      document.cookie = `tmp-auth-token=${user.id}; path=/; max-age=3600`
    }
  }, [user])

  useEffect(() => {
    if (isLoading) return

    const isPublicPath = ["/login", "/register"].includes(pathname)
    
    if (!user && !isPublicPath) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`)
    }

    if (user && isPublicPath) {
      router.push("/dashboard")
    }
  }, [user, isLoading, pathname])

  return null
}