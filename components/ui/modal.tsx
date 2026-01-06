"use client"

import type React from "react"
import { X } from "lucide-react"

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: "sm" | "md" | "lg" | "xl" | "full"
  showCloseButton?: boolean
}

export function Modal({ isOpen, onClose, title, children, size = "md", showCloseButton = true }: ModalProps) {
  if (!isOpen) return null

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    full: "max-w-full w-full h-full m-0",
  }

  const isFull = size === "full"

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className={`flex ${isFull ? "w-screen h-screen" : "min-h-screen items-center justify-center p-2 sm:p-4"}`}>
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
        <div className={`
          relative bg-gray-800 shadow-xl w-full
          ${isFull ? "w-full h-full" : `${sizeClasses[size]} border border-gray-700 rounded-lg`}
          ${isFull ? "" : "max-h-[95vh] sm:max-h-[90vh] flex flex-col"}
        `}>
          {!isFull && (
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-700 shrink-0">
              <h3 className="text-base sm:text-lg font-medium text-white pr-4">{title}</h3>
              {showCloseButton && (
                <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1 -mr-1">
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          )}
          <div className={`
            ${isFull ? "w-full h-full" : "p-4 sm:p-6 overflow-y-auto flex-1"}
          `}>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
