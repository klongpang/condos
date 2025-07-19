import type { LucideIcon } from "lucide-react"

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
  loading?: boolean
}

export function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  className = "", 
  loading = false 
}: StatsCardProps) {
  return (
    <div className={`bg-gray-800 rounded-lg p-6 border border-gray-700 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-400">{title}</p>
          {loading ? (
            <div className="mt-1">
              <div className="h-8 w-32 bg-gray-700 animate-pulse rounded"></div>
            </div>
          ) : (
            <p className="text-2xl font-bold text-white mt-1">{value}</p>
          )}
          {trend && !loading && (
            <p className={`text-sm mt-1 ${trend.isPositive ? "text-green-500" : "text-red-500"}`}>
              {trend.isPositive ? "+" : ""}
              {trend.value}%
            </p>
          )}
        </div>
        <div className="h-12 w-12 bg-green-600 rounded-lg flex items-center justify-center">
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  )
}