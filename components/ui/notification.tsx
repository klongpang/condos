"use client"

import { CheckCircle2, AlertCircle, X } from "lucide-react"
import { useState, useEffect } from "react"

interface NotificationProps {
  message: string
  type: "success" | "error"
  onClose: () => void
  duration?: number
}

import { createPortal } from "react-dom"

export function Notification({ message, type, onClose, duration = 3000 }: NotificationProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Trigger enter animation
    const enterTimer = setTimeout(() => setIsVisible(true), 10)

    // Trigger exit animation
    const exitTimer = setTimeout(() => {
      setIsRemoving(true)
    }, duration)

    // Actual removal
    const removeTimer = setTimeout(() => {
      onClose()
    }, duration + 300) // +300ms for exit animation

    return () => {
      clearTimeout(enterTimer)
      clearTimeout(exitTimer)
      clearTimeout(removeTimer)
    }
  }, [duration, onClose])

  const handleClose = () => {
    setIsRemoving(true)
    setTimeout(onClose, 300)
  }

  if (!mounted) return null

  return createPortal(
    <div
      className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 
      rounded-xl shadow-2xl border backdrop-blur-xl transition-all duration-300 ease-out
      ${
        isRemoving 
          ? "opacity-0 translate-y-4 scale-95" 
          : isVisible 
            ? "opacity-100 translate-y-0 scale-100" 
            : "opacity-0 translate-y-4 scale-95"
      }
      ${
        type === "success" 
          ? "bg-gray-900/90 border-green-500/20 text-green-400" 
          : "bg-gray-900/90 border-red-500/20 text-red-400"
      }`}
      role="alert"
    >
      <div className={`p-1 rounded-full ${type === "success" ? "bg-green-500/10" : "bg-red-500/10"}`}>
        {type === "success" ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <AlertCircle className="h-4 w-4" />
        )}
      </div>
      
      <span className="text-sm font-medium text-gray-200 pr-2">
        {message}
      </span>

      <button
        onClick={handleClose}
        className="p-1 -mr-1 rounded-full hover:bg-gray-700/50 text-gray-500 hover:text-gray-300 transition-colors"
      >
        <X className="h-3 w-3" />
      </button>
    </div>,
    document.body
  )
}
