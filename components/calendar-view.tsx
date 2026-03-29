"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"
import type { Shift, Workplace } from "@/hooks/use-shift-data"

interface CalendarViewProps {
  shifts: Shift[]
  workplaces: Workplace[]
  onShiftClick: (shift: Shift) => void
}

export function CalendarView({ shifts, workplaces, onShiftClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }

    return days
  }

  const getShiftsForDate = (date: Date | null) => {
    if (!date) return []

    // Format date as YYYY-MM-DD to match shift.date format
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const dateString = `${year}-${month}-${day}`

    return shifts.filter((shift) => shift.date === dateString)
  }

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setMonth(newDate.getMonth() - 1)
      } else {
        newDate.setMonth(newDate.getMonth() + 1)
      }
      return newDate
    })
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Calendar</h2>
          <p className="text-muted-foreground">View your shifts in calendar format</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {monthYear}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => navigateMonth("prev")}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => navigateMonth("next")}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-4">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="p-1 sm:p-2 text-center text-xs sm:text-sm font-medium text-muted-foreground">
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{day.slice(0, 1)}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
            {days.map((date, index) => {
              const dayShifts = getShiftsForDate(date)

              return (
                <div
                  key={index}
                  className={`min-h-[80px] sm:min-h-[100px] p-0.5 sm:p-1 border rounded text-xs sm:text-sm ${
                    date ? "bg-background hover:bg-muted/50" : "bg-muted/20"
                  } ${isToday(date) ? "ring-1 sm:ring-2 ring-primary" : ""}`}
                >
                  {date && (
                    <>
                      <div className={`text-sm font-medium mb-1 ${isToday(date) ? "text-primary" : "text-foreground"}`}>
                        {date.getDate()}
                      </div>
                      <div className="space-y-1">
                        {dayShifts.map((shift) => {
                          const workplace = workplaces.find((w) => w.id === shift.workplaceId)
                          if (!workplace) return null

                          return (
                            <button key={shift.id} onClick={() => onShiftClick(shift)} className="w-full text-left">
                              <div
                                className="text-xs p-1 rounded text-white truncate"
                                style={{ backgroundColor: workplace.color }}
                              >
                                <div className="font-medium truncate">{workplace.name}</div>
                                <div className="opacity-90">
                                  {shift.startTime.slice(0, 5)} - {shift.endTime.slice(0, 5)}
                                </div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle>Workplaces</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {workplaces.map((workplace) => (
              <div key={workplace.id} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: workplace.color }} />
                <span className="text-sm">{workplace.name}</span>
                <Badge variant="outline" className="text-xs">
                  ${workplace.payRate}/hr
                </Badge>
              </div>
            ))}
          </div>
          {workplaces.length === 0 && <p className="text-muted-foreground text-center py-4">No workplaces added yet</p>}
        </CardContent>
      </Card>
    </div>
  )
}
