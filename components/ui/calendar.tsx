"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { th } from "date-fns/locale"
import { addYears, format, setMonth, setYear, startOfMonth, subYears } from "date-fns"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

// Thai month names
const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน",
  "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม",
  "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
]

function toBuddhistYear(year: number) {
  return year + 543
}

type CalendarView = "days" | "months" | "years"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const [view, setView] = React.useState<CalendarView>("days")
  // Internal date state to track navigation even if no date is selected
  const [navDate, setNavDate] = React.useState<Date>(
    props.defaultMonth || (props.selected as Date) || new Date()
  )

  // Sync navDate with month prop if provided
  React.useEffect(() => {
    if (props.month) {
      setNavDate(props.month)
    }
  }, [props.month])

  const handlePrevious = () => {
    if (view === "days") {
      const newDate = startOfMonth(new Date(navDate.getFullYear(), navDate.getMonth() - 1))
      setNavDate(newDate)
      props.onMonthChange?.(newDate)
    } else if (view === "months") {
      const newDate = subYears(navDate, 1)
      setNavDate(newDate)
    } else if (view === "years") {
      const newDate = subYears(navDate, 12)
      setNavDate(newDate)
    }
  }

  const handleNext = () => {
    if (view === "days") {
      const newDate = startOfMonth(new Date(navDate.getFullYear(), navDate.getMonth() + 1))
      setNavDate(newDate)
      props.onMonthChange?.(newDate)
    } else if (view === "months") {
      const newDate = addYears(navDate, 1)
      setNavDate(newDate)
    } else if (view === "years") {
      const newDate = addYears(navDate, 12)
      setNavDate(newDate)
    }
  }

  const handleMonthSelect = (monthIndex: number) => {
    const newDate = setMonth(navDate, monthIndex)
    setNavDate(newDate)
    props.onMonthChange?.(newDate)
    setView("days")
  }

  const handleYearSelect = (year: number) => {
    const newDate = setYear(navDate, year)
    setNavDate(newDate)
    props.onMonthChange?.(newDate)
    setView("months")
  }

  const handleToday = () => {
    const today = new Date()
    setNavDate(today)
    props.onMonthChange?.(today)
    const onSelect = (props as any).onSelect
    if (onSelect) {
        onSelect(today, today)
    }
    setView("days")
  }

  return (
    <div className={cn("p-3 w-[280px]", className)}>
      {/* Custom Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <button
          onClick={handlePrevious}
          className={cn(buttonVariants({ variant: "outline" }), "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 border-none")}
        >
          <ChevronLeft className="h-4 w-4 text-primary" />
        </button>

        <div className="font-semibold text-lg flex gap-1 cursor-pointer hover:text-primary transition-colors">
          <span onClick={() => setView("months")}>
            {THAI_MONTHS[navDate.getMonth()]}
          </span>
          <span onClick={() => setView("years")}>
            {toBuddhistYear(navDate.getFullYear())}
          </span>
        </div>

        <button
          onClick={handleNext}
          className={cn(buttonVariants({ variant: "outline" }), "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 border-none")}
        >
          <ChevronRight className="h-4 w-4 text-primary" />
        </button>
      </div>

      {/* Views */}
      <div className="min-h-[300px]">
        {view === "days" && (
          <DayPicker
            showOutsideDays={showOutsideDays}
            className="p-0"
            month={navDate}
            onMonthChange={setNavDate} // Keep internal DayPicker state synced
            locale={th}
            // Hide default navigation since we implemented custom one
            classNames={{
              months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
              month: "space-y-4",
              caption: "hidden", // Hide original caption
              table: "w-full border-collapse space-y-1",
              head_row: "flex",
              head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
              row: "flex w-full mt-2",
              cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
              day: cn(
                buttonVariants({ variant: "ghost" }),
                "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
              ),
              day_selected:
                "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
              day_today: "bg-accent/30 text-accent-foreground",
              day_outside:
                "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
              day_disabled: "text-muted-foreground opacity-50",
              day_range_middle:
                "aria-selected:bg-accent aria-selected:text-accent-foreground",
              day_hidden: "invisible",
              ...classNames,
            }}
            {...props}
          />
        )}

        {view === "months" && (
            <div className="grid grid-cols-3 gap-2">
            {THAI_MONTHS.map((month, index) => {
                const isSelected = index === navDate.getMonth()
                const isCurrent = new Date().getMonth() === index && new Date().getFullYear() === navDate.getFullYear()
                
                return (
                <button
                    key={month}
                    onClick={() => handleMonthSelect(index)}
                    className={cn(
                    "p-2 rounded-md text-sm transition-colors",
                    isSelected ? "bg-primary text-primary-foreground" : "hover:bg-accent hover:text-accent-foreground",
                    isCurrent && !isSelected && "border border-primary text-primary" // Highlight current month
                    )}
                >
                    {month}
                </button>
                )
            })}
            </div>
        )}

        {view === "years" && (
            <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 15 }, (_, i) => {
                const year = navDate.getFullYear() - 7 + i // Show range around current year
                const isSelected = year === navDate.getFullYear()
                const isCurrent = year === new Date().getFullYear()

                return (
                <button
                    key={year}
                    onClick={() => handleYearSelect(year)}
                    className={cn(
                    "p-2 rounded-md text-sm transition-colors w-full",
                    isSelected ? "bg-primary text-primary-foreground" : "hover:bg-accent hover:text-accent-foreground",
                    isCurrent && !isSelected && "border border-primary text-primary"
                    )}
                >
                    {toBuddhistYear(year)}
                </button>
                )
            })}
            </div>
        )}
      </div>

      {/* Today Button Footer */}
      <div className="mt-4 pt-2 border-t flex justify-center">
        <button
            onClick={handleToday}
            className="text-primary text-sm font-medium hover:underline pb-1"
        >
            วันนี้
        </button>
      </div>
    </div>
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
