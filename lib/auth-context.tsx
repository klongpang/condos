"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import type { User } from "./supabase"
import { userService } from "./database"

interface AuthContextType {
  user: User | null
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
  refetchUser: () => Promise<void> // เพิ่ม refetchUser
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // เพิ่มฟังก์ชัน refetchUser
  const refetchUser = useCallback(async () => {
    const savedUserId = localStorage.getItem("condo-user-id")
    if (savedUserId) {
      setIsLoading(true)
      try {
        const userData = await userService.getById(savedUserId)
        if (userData) {
          setUser(userData)
        } else {
          localStorage.removeItem("condo-user-id")
          setUser(null)
        }
      } catch (error) {
        console.error("Failed to refetch user:", error)
      } finally {
        setIsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    const initializeAuth = async () => {
      const savedUserId = localStorage.getItem("condo-user-id")
      if (savedUserId) {
        try {
          const userData = await userService.getById(savedUserId)
          if (userData) {
            setUser(userData)
          } else {
            localStorage.removeItem("condo-user-id")
          }
        } catch (error) {
          console.error("Initial auth check error:", error)
        }
      }
      setIsLoading(false)
    }

    initializeAuth()
  }, [])

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const foundUser = await userService.authenticate(username, password)
      if (foundUser) {
        setUser(foundUser)
        localStorage.setItem("condo-user-id", foundUser.id)
        return true
      }
      return false
    } catch (error) {
      console.error("Login error:", error)
      return false
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("condo-user-id")
  }

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        login, 
        logout, 
        isLoading,
        refetchUser // เพิ่ม refetchUser ใน value
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