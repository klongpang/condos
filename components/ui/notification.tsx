"use client"

import { CheckCircle, XCircle, X } from "lucide-react"
import { useState, useEffect } from "react"

interface NotificationProps {
  message: string
  type: "success" | "error"
  onClose: () => void
  duration?: number // Optional: how long the notification stays visible in ms
}

export function Notification({ message, type, onClose, duration = 3000 }: NotificationProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        onClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [isVisible, duration, onClose])

  if (!isVisible) return null

  const bgColor = type === "success" ? "bg-gradient-to-br from-emerald-500 to-green-600" : "bg-gradient-to-br from-rose-500 to-red-600"
  const borderColor = type === "success" ? "border-emerald-400/30" : "border-rose-400/30"
  const textColor = type === "success" ? "text-white" : "text-white"  
  const icon = type === "success" ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />

  return (
    <div
      className={`fixed bottom-20 right-10 px-4 py-2 p-4 rounded-lg shadow-lg flex items-center space-x-3 z-50 border ${bgColor} ${borderColor} ${textColor}`}
      role="alert"
    >
      {icon}
      <span className="flex-1">{message}</span>
      <button
        onClick={() => {
          setIsVisible(false)
          onClose()
        }}
        className="ml-4 text-white/70 hover:text-white transition-colors"
        aria-label="Close notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
