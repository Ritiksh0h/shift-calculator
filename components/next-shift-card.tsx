// ============================================
// FILE: components/next-shift-card.tsx
// PATH: components/next-shift-card.tsx
// NOTE: REPLACE — compact mobile layout
// ============================================

"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock } from "lucide-react"
import type { Shift, Workplace } from "@/hooks/use-shift-data"

interface NextShiftCardProps {
  shifts: Shift[]
  workplaces: Workplace[]
}

export function NextShiftCard({ shifts, workplaces }: NextShiftCardProps) {
  const [timeUntilNext, setTimeUntilNext] = useState<string>("")
  const [nextShift, setNextShift] = useState<Shift | null>(null)
  const [nextWorkplace, setNextWorkplace] = useState<Workplace | null>(null)

  useEffect(() => {
    const now = new Date()
    const upcomingShifts = shifts
      .filter((shift) => {
        const shiftDateTime = new Date(shift.date + "T" + shift.startTime + ":00")
        return shiftDateTime > now
      })
      .sort((a, b) => {
        const dateA = new Date(a.date + "T" + a.startTime + ":00")
        const dateB = new Date(b.date + "T" + b.startTime + ":00")
        return dateA.getTime() - dateB.getTime()
      })

    if (upcomingShifts.length > 0) {
      const next = upcomingShifts[0]
      setNextShift(next)
      setNextWorkplace(workplaces.find((w) => w.id === next.workplaceId) || null)
    } else {
      setNextShift(null)
      setNextWorkplace(null)
    }
  }, [shifts, workplaces])

  useEffect(() => {
    if (!nextShift) {
      setTimeUntilNext("")
      return
    }

    const updateCountdown = () => {
      const now = new Date()
      const shiftDateTime = new Date(nextShift.date + "T" + nextShift.startTime + ":00")
      const timeDiff = shiftDateTime.getTime() - now.getTime()

      if (timeDiff <= 0) {
        setTimeUntilNext("Now")
        return
      }

      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))

      if (days > 0) {
        setTimeUntilNext(`${days}d ${hours}h`)
      } else if (hours > 0) {
        setTimeUntilNext(`${hours}h ${minutes}m`)
      } else {
        setTimeUntilNext(`${minutes}m`)
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 60000)
    return () => clearInterval(interval)
  }, [nextShift])

  if (!nextShift || !nextWorkplace) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">Next Shift</CardTitle>
          <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-xl sm:text-2xl font-bold">None</div>
          <p className="text-[10px] sm:text-xs text-muted-foreground">No upcoming shifts</p>
        </CardContent>
      </Card>
    )
  }

  const shiftDate = new Date(nextShift.date + "T00:00:00")
  const isToday = shiftDate.toDateString() === new Date().toDateString()
  const isTomorrow = shiftDate.toDateString() === new Date(Date.now() + 86400000).toDateString()

  let dateDisplay = shiftDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
  if (isToday) dateDisplay = "Today"
  if (isTomorrow) dateDisplay = "Tomorrow"

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs sm:text-sm font-medium">Next Shift</CardTitle>
        <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-xl sm:text-2xl font-bold">{timeUntilNext}</div>
        <div className="flex items-center gap-1.5 mt-1">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: nextWorkplace.color }} />
          <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
            {nextWorkplace.name} · {dateDisplay}
          </p>
        </div>
        <p className="text-[10px] sm:text-xs text-muted-foreground">
          {nextShift.startTime}–{nextShift.endTime}
        </p>
      </CardContent>
    </Card>
  )
}