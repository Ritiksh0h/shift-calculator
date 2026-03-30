// ============================================
// FILE: components/calendar-view.tsx
// PATH: components/calendar-view.tsx
// NOTE: REPLACE — mobile shows dots not truncated text
// ============================================

"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ChevronLeft, ChevronRight, Calendar, Clock, DollarSign } from "lucide-react"
import type { Shift, Workplace } from "@/hooks/use-shift-data"

interface CalendarViewProps {
  shifts: Shift[]
  workplaces: Workplace[]
  onShiftClick: (shift: Shift) => void
}

export function CalendarView({ shifts, workplaces, onShiftClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedShifts, setSelectedShifts] = useState<Shift[]>([])

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days: (Date | null)[] = []
    for (let i = 0; i < startingDayOfWeek; i++) days.push(null)
    for (let day = 1; day <= daysInMonth; day++) days.push(new Date(year, month, day))
    return days
  }

  const getShiftsForDate = (date: Date | null) => {
    if (!date) return []
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const dateString = `${year}-${month}-${day}`
    return shifts.filter((shift) => shift.date === dateString)
  }

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") newDate.setMonth(newDate.getMonth() - 1)
      else newDate.setMonth(newDate.getMonth() + 1)
      return newDate
    })
  }

  const handleDateClick = (date: Date | null) => {
    if (!date) return
    const dayShifts = getShiftsForDate(date)
    if (dayShifts.length > 0) {
      setSelectedDate(date)
      setSelectedShifts(dayShifts)
    }
  }

  const days = getDaysInMonth(currentDate)
  const monthYear = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })

  const today = new Date()
  const isToday = (date: Date | null) => {
    if (!date) return false
    return date.toDateString() === today.toDateString()
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Calendar</h2>
        <p className="text-sm text-muted-foreground">View your shifts in calendar format</p>
      </div>

      <Card>
        <CardHeader className="pb-2 sm:pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
              {monthYear}
            </CardTitle>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateMonth("prev")}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateMonth("next")}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-2 sm:px-6 pb-3 sm:pb-6">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
              <div key={i} className="text-center text-[10px] sm:text-xs font-medium text-muted-foreground py-1">
                <span className="sm:hidden">{day}</span>
                <span className="hidden sm:inline">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i]}</span>
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
            {days.map((date, index) => {
              const dayShifts = getShiftsForDate(date)
              const hasShifts = dayShifts.length > 0

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleDateClick(date)}
                  disabled={!date}
                  className={`
                    relative min-h-[48px] sm:min-h-[80px] p-1 sm:p-1.5 text-left transition-colors
                    ${date ? "bg-background" : "bg-muted/30"}
                    ${hasShifts ? "cursor-pointer hover:bg-muted/50" : "cursor-default"}
                    ${isToday(date) ? "ring-2 ring-primary ring-inset" : ""}
                  `}
                >
                  {date && (
                    <>
                      <span className={`text-xs sm:text-sm font-medium ${isToday(date) ? "text-primary" : "text-foreground"}`}>
                        {date.getDate()}
                      </span>

                      {/* Mobile: colored dots */}
                      {hasShifts && (
                        <div className="flex gap-0.5 mt-0.5 sm:hidden">
                          {dayShifts.map((shift) => {
                            const wp = workplaces.find((w) => w.id === shift.workplaceId)
                            return (
                              <div
                                key={shift.id}
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: wp?.color || "#888" }}
                              />
                            )
                          })}
                        </div>
                      )}

                      {/* Desktop: shift details */}
                      <div className="hidden sm:block space-y-0.5 mt-0.5">
                        {dayShifts.map((shift) => {
                          const wp = workplaces.find((w) => w.id === shift.workplaceId)
                          if (!wp) return null
                          return (
                            <div
                              key={shift.id}
                              className="text-[10px] px-1 py-0.5 rounded text-white truncate"
                              style={{ backgroundColor: wp.color }}
                            >
                              {shift.startTime}–{shift.endTime}
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      {workplaces.length > 0 && (
        <div className="flex flex-wrap gap-3 px-1">
          {workplaces.map((workplace) => (
            <div key={workplace.id} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: workplace.color }} />
              <span className="text-xs sm:text-sm text-muted-foreground">{workplace.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Day detail dialog */}
      <Dialog open={!!selectedDate} onOpenChange={(open) => !open && setSelectedDate(null)}>
        <DialogContent className="max-w-[90vw] sm:max-w-md">
          {selectedDate && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {selectedDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                {selectedShifts.map((shift) => {
                  const wp = workplaces.find((w) => w.id === shift.workplaceId)
                  if (!wp) return null
                  const hours =
                    (new Date(`1970-01-01T${shift.endTime}`).getTime() -
                      new Date(`1970-01-01T${shift.startTime}`).getTime()) /
                    (1000 * 60 * 60) - (shift.breakMinutes || 0) / 60
                  const pay = hours * (shift.payRateOverride || wp.payRate)

                  return (
                    <div key={shift.id} className="flex items-center gap-3 p-3 rounded-lg border">
                      <div className="w-3 h-full rounded-full shrink-0" style={{ backgroundColor: wp.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{wp.name}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {shift.startTime}–{shift.endTime}
                          </span>
                          <span>{hours.toFixed(1)}h</span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            ${pay.toFixed(2)}
                          </span>
                        </div>
                        {shift.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{shift.notes}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}