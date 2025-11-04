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
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className={`flex ${isFull ? "w-screen h-screen" : "min-h-screen items-center justify-center p-4"}`}>
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
        <div className={`relative ${isFull ? "bg-black w-full h-full" : "bg-gray-800 rounded-lg shadow-xl w-full"} ${sizeClasses[size]} ${isFull ? "" : "border border-gray-700"}`}>
          {!isFull && (
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h3 className="text-lg font-medium text-white">{title}</h3>
              {showCloseButton && (
                <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          )}
          <div className={isFull ? "w-full h-full" : "p-6"}>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
