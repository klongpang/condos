"use client"

import * as React from "react"
import { ChevronDownIcon, AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

// Thai month names
const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน",
  "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม",
  "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
]

// Convert CE year to BE year
function toBuddhistYear(year: number): number {
  return year + 543
}

// Convert BE year to CE year
function toCEYear(beYear: number): number {
  return beYear - 543
}

// Format date as Thai Buddhist Era (e.g., "1 มกราคม 2568")
function formatThaiDate(date: Date | undefined): string {
  if (!date) return ""
  
  const day = date.getDate()
  const month = THAI_MONTHS[date.getMonth()]
  const year = toBuddhistYear(date.getFullYear())
  
  return `${day} ${month} ${year}`
}

// Format date as DD/MM/YYYY (BE year, 4 digits)
function formatInputDate(date: Date | undefined): string {
  if (!date) return ""
  
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = String(toBuddhistYear(date.getFullYear()))
  
  return `${day}/${month}/${year}`
}

interface DatePickerProps {
  label?: string
  id?: string
  value?: Date
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  error?: string
  required?: boolean
}

export function DatePicker({
  label,
  id = "date",
  value,
  onChange,
  placeholder = "เลือกวันที่",
  className,
  disabled = false,
  error,
  required = false,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [internalDate, setInternalDate] = React.useState<Date | undefined>(value)
  const [month, setMonth] = React.useState<Date | undefined>(value || new Date())

  // Sync with external value
  React.useEffect(() => {
    if (value !== internalDate) {
      setInternalDate(value)
      if (value) {
        setMonth(value)
      }
    }
  }, [value])

  const handleCalendarSelect = (date: Date | undefined) => {
    setInternalDate(date)
    setOpen(false)
    onChange?.(date)
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            id={id}
            type="button"
            disabled={disabled}
            className={cn(
              "w-full justify-between font-normal bg-gray-700 border-gray-600 text-white hover:bg-gray-600 hover:text-white h-10 px-3 py-2",
              !internalDate && "text-muted-foreground",
              error && "border-red-500"
            )}
          >
            {internalDate ? formatThaiDate(internalDate) : placeholder}
            <ChevronDownIcon className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0 bg-zinc-900 border-zinc-800" align="start">
          <Calendar
            mode="single"
            selected={internalDate}
            month={month}
            onMonthChange={setMonth}
            onSelect={handleCalendarSelect}
          />

        </PopoverContent>
      </Popover>
      {error && (
        <div className="flex items-center mt-1 text-red-400 text-xs">
          <AlertCircle className="w-3 h-3 mr-1" />
          {error}
        </div>
      )}
    </div>
  )
}

// Export utility functions for use elsewhere
export { formatThaiDate, formatInputDate, toBuddhistYear, toCEYear }
