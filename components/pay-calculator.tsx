"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState } from "react"
import { DollarSign, TrendingUp, Clock, Calendar } from "lucide-react"
import type { Shift, Workplace, Settings } from "@/hooks/use-shift-data"

interface PayCalculatorProps {
  shifts: Shift[]
  workplaces: Workplace[]
  settings: Settings
}

export function PayCalculator({ shifts, workplaces, settings }: PayCalculatorProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<"week" | "month" | "year">("week")
  const [selectedWorkplace, setSelectedWorkplace] = useState<string>("all")

  const calculatePeriodShifts = () => {
    const now = new Date()
    let startDate: Date
    let endDate: Date = new Date(now)

    switch (selectedPeriod) {
      case "week":
        startDate = new Date(now.setDate(now.getDate() - now.getDay()))
        endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() + 6)
        break
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        break
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1)
        endDate = new Date(now.getFullYear(), 11, 31)
        break
    }

    return shifts.filter((shift) => {
      const shiftDate = new Date(shift.date)
      const matchesWorkplace = selectedWorkplace === "all" || shift.workplaceId === selectedWorkplace
      return shiftDate >= startDate && shiftDate <= endDate && matchesWorkplace
    })
  }

  const calculatePayData = () => {
    const periodShifts = calculatePeriodShifts()
    let totalHours = 0
    let regularHours = 0
    let overtimeHours = 0
    let totalPay = 0
    let regularPay = 0
    let overtimePay = 0

    // Group shifts by week for overtime calculation
    const shiftsByWeek = new Map<string, Shift[]>()

    periodShifts.forEach((shift) => {
      const shiftDate = new Date(shift.date)
      const weekStart = new Date(shiftDate)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      const weekKey = weekStart.toISOString().split("T")[0]

      if (!shiftsByWeek.has(weekKey)) {
        shiftsByWeek.set(weekKey, [])
      }
      shiftsByWeek.get(weekKey)!.push(shift)
    })

    // Calculate pay for each week
    shiftsByWeek.forEach((weekShifts) => {
      let weeklyHours = 0
      let weeklyPay = 0

      weekShifts.forEach((shift) => {
        const workplace = workplaces.find((w) => w.id === shift.workplaceId)
        if (!workplace) return

        const hours =
          (new Date(`1970-01-01T${shift.endTime}`).getTime() - new Date(`1970-01-01T${shift.startTime}`).getTime()) /
          (1000 * 60 * 60)
        const breakHours = shift.breakMinutes ? shift.breakMinutes / 60 : 0
        const netHours = hours - breakHours
        const payRate = shift.payRateOverride || workplace.payRate

        weeklyHours += netHours
        totalHours += netHours

        // Calculate regular and overtime hours for this shift
        const remainingRegularHours = Math.max(0, settings.overtimeThreshold - (weeklyHours - netHours))
        const regularShiftHours = Math.min(netHours, remainingRegularHours)
        const overtimeShiftHours = netHours - regularShiftHours

        regularHours += regularShiftHours
        overtimeHours += overtimeShiftHours

        const regularShiftPay = regularShiftHours * payRate
        const overtimeShiftPay = overtimeShiftHours * payRate * settings.overtimeMultiplier

        regularPay += regularShiftPay
        overtimePay += overtimeShiftPay
        weeklyPay += regularShiftPay + overtimeShiftPay
      })
    })

    totalPay = regularPay + overtimePay

    return {
      totalHours,
      regularHours,
      overtimeHours,
      totalPay,
      regularPay,
      overtimePay,
      shiftsCount: periodShifts.length,
    }
  }

  const payData = calculatePayData()

  const formatPeriod = () => {
    switch (selectedPeriod) {
      case "week":
        return "This Week"
      case "month":
        return "This Month"
      case "year":
        return "This Year"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Pay Calculator</h2>
          <p className="text-muted-foreground">Calculate your earnings with overtime rules</p>
        </div>
      </div>

      <div className="flex gap-4 flex-wrap">
        <Select value={selectedPeriod} onValueChange={(value: "week" | "month" | "year") => setSelectedPeriod(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedWorkplace} onValueChange={setSelectedWorkplace}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Workplaces</SelectItem>
            {workplaces.map((workplace) => (
              <SelectItem key={workplace.id} value={workplace.id}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: workplace.color }} />
                  {workplace.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pay</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${payData.totalPay.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {formatPeriod()} • {payData.shiftsCount} shifts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payData.totalHours.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">Regular + Overtime</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Regular Pay</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${payData.regularPay.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{payData.regularHours.toFixed(1)}h regular time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overtime Pay</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${payData.overtimePay.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {payData.overtimeHours.toFixed(1)}h @ {settings.overtimeMultiplier}x rate
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pay Breakdown</CardTitle>
          <CardDescription>Detailed breakdown of your earnings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Regular Hours ({payData.regularHours.toFixed(1)}h)</span>
              <Badge variant="secondary">${payData.regularPay.toFixed(2)}</Badge>
            </div>
            {payData.overtimeHours > 0 && (
              <div className="flex items-center justify-between">
                <span>
                  Overtime Hours ({payData.overtimeHours.toFixed(1)}h @ {settings.overtimeMultiplier}x)
                </span>
                <Badge variant="default">${payData.overtimePay.toFixed(2)}</Badge>
              </div>
            )}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between font-semibold">
                <span>Total Gross Pay</span>
                <Badge variant="outline" className="text-lg">
                  ${payData.totalPay.toFixed(2)}
                </Badge>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">* This is gross pay before taxes and deductions</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Overtime Settings</CardTitle>
          <CardDescription>Current overtime calculation rules</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span>Overtime Threshold</span>
              <Badge variant="outline">{settings.overtimeThreshold} hours/week</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Overtime Multiplier</span>
              <Badge variant="outline">{settings.overtimeMultiplier}x regular rate</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
