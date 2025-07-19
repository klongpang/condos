"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import type { User } from "./supabase"
import { userService } from "./database"
import { useRouter } from "next/navigation"

interface AuthContextType {
  user: User | null
  login: (username: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  isLoading: boolean
  refetchUser: () => Promise<void>
  setUser: React.Dispatch<React.SetStateAction<User | null>> // เพิ่ม setUser เพื่อให้สามารถอัปเดตจากภายนอกได้
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const syncAuthCookie = useCallback((token: string | null) => {
    if (token) {
      document.cookie = `tmp-auth-token=${token}; path=/; max-age=${60 * 60 * 24}` // 1 day
    } else {
      document.cookie = 'tmp-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    }
  }, [])

  const refetchUser = useCallback(async () => {
    const savedUserId = localStorage.getItem("condo-user-id")
    if (savedUserId) {
      setIsLoading(true)
      try {
        const userData = await userService.getById(savedUserId)
        if (userData) {
          setUser(userData)
          syncAuthCookie(savedUserId)
        } else {
          await handleLogout()
        }
      } catch (error) {
        console.error("Failed to refetch user:", error)
        await handleLogout()
      } finally {
        setIsLoading(false)
      }
    }
  }, [syncAuthCookie])

  const handleLogout = useCallback(async () => {
    setUser(null)
    localStorage.removeItem("condo-user-id")
    syncAuthCookie(null)
    router.push('/login')
  }, [router, syncAuthCookie])

  useEffect(() => {
    const initializeAuth = async () => {
      const savedUserId = localStorage.getItem("condo-user-id")
      if (savedUserId) {
        try {
          const userData = await userService.getById(savedUserId)
          if (userData) {
            setUser(userData)
            syncAuthCookie(savedUserId)
          } else {
            await handleLogout()
          }
        } catch (error) {
          console.error("Initial auth check error:", error)
          await handleLogout()
        }
      }
      setIsLoading(false)
    }

    initializeAuth()
  }, [handleLogout, syncAuthCookie])

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const foundUser = await userService.authenticate(username, password)
      if (foundUser) {
        setUser(foundUser)
        localStorage.setItem("condo-user-id", foundUser.id)
        syncAuthCookie(foundUser.id)
        return true
      }
      return false
    } catch (error) {
      console.error("Login error:", error)
      return false
    }
  }

  const logout = async () => {
    await handleLogout()
  }

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        login, 
        logout, 
        isLoading,
        refetchUser,
        setUser // เผยแพร่ setUser ผ่าน context
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}