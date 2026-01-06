"use client"

import type { LucideIcon } from "lucide-react"
import { useState } from "react"

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
    label?: string // e.g., "รายการ" instead of "%"
  }
  iconColor?: 'green' | 'red' | 'yellow' | 'blue' | 'purple'
  tooltip?: string
  className?: string
  loading?: boolean
}

const iconColorClasses = {
  green: 'bg-green-600',
  red: 'bg-red-600',
  yellow: 'bg-yellow-600',
  blue: 'bg-blue-600',
  purple: 'bg-purple-600',
}

export function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  iconColor = 'green',
  tooltip,
  className = "", 
  loading = false 
}: StatsCardProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div 
      className={`bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-700 relative ${className}`}
      onMouseEnter={() => tooltip && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Tooltip */}
      {tooltip && showTooltip && (
        <div className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-gray-300 text-xs rounded-lg shadow-lg border border-gray-700 whitespace-nowrap">
          {tooltip}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-gray-400 truncate">{title}</p>
          {loading ? (
            <div className="mt-1">
              <div className="h-6 sm:h-8 w-24 sm:w-32 bg-gray-700 animate-pulse rounded"></div>
            </div>
          ) : (
            <p className="text-xl sm:text-2xl font-bold text-white mt-1 truncate">{value}</p>
          )}
          {trend && !loading && (
            <p className={`text-xs sm:text-sm mt-1 ${trend.isPositive ? "text-green-500" : "text-red-500"}`}>
              {trend.isPositive ? "+" : ""}
              {trend.value}{trend.label || "%"}
            </p>
          )}
        </div>
        <div className={`h-10 w-10 sm:h-12 sm:w-12 ${iconColorClasses[iconColor]} rounded-lg flex items-center justify-center transition-colors shrink-0 ml-2`}>
          <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
        </div>
      </div>
    </div>
  )
}