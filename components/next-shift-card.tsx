"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, MapPin } from "lucide-react"
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

    // Find the next upcoming shift
    const upcomingShifts = shifts
      .filter((shift) => {
        // Parse the date correctly to avoid timezone issues
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
      const workplace = workplaces.find((w) => w.id === next.workplaceId)
      setNextShift(next)
      setNextWorkplace(workplace || null)
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
        setTimeUntilNext("Starting now")
        return
      }

      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))

      if (days > 0) {
        setTimeUntilNext(`${days}d ${hours}h ${minutes}m`)
      } else if (hours > 0) {
        setTimeUntilNext(`${hours}h ${minutes}m`)
      } else {
        setTimeUntilNext(`${minutes}m`)
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [nextShift])

  if (!nextShift || !nextWorkplace) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Next Shift</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">No shifts</div>
          <p className="text-xs text-muted-foreground">No upcoming shifts scheduled</p>
        </CardContent>
      </Card>
    )
  }

  const shiftDate = new Date(nextShift.date)
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
        <CardTitle className="text-sm font-medium">Next Shift</CardTitle>
        <Clock className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: nextWorkplace.color }} />
            <span className="font-semibold">{nextWorkplace.name}</span>
          </div>

          <div className="space-y-1">
            <div className="text-2xl font-bold">{timeUntilNext}</div>
            <p className="text-xs text-muted-foreground">
              {dateDisplay} • {nextShift.startTime} - {nextShift.endTime}
            </p>
          </div>

          <div className="flex gap-2">
            <Badge variant="secondary">
              {(
                (new Date(`1970-01-01T${nextShift.endTime}`).getTime() -
                  new Date(`1970-01-01T${nextShift.startTime}`).getTime()) /
                  (1000 * 60 * 60) -
                (nextShift.breakMinutes || 0) / 60
              ).toFixed(1)}
              h
            </Badge>
            <Badge variant="outline">${(nextShift.payRateOverride || nextWorkplace.payRate).toFixed(2)}/hr</Badge>
          </div>

          {nextWorkplace.address && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{nextWorkplace.address}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
