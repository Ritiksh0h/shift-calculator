"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, DollarSign, Clock, TrendingUp } from "lucide-react"
import type { Workplace, Shift, PayPeriod } from "@/hooks/use-shift-data"

interface PaydayTrackerProps {
  workplaces: Workplace[]
  shifts: Shift[]
  payPeriods: PayPeriod[]
}

export function PaydayTracker({ workplaces, shifts, payPeriods }: PaydayTrackerProps) {

  const calculatePeriodStartDate = (type: string, payDate: string) => {
    const date = new Date(payDate)
    switch (type) {
      case "weekly":
        date.setDate(date.getDate() - 7)
        break
      case "bi-weekly":
        date.setDate(date.getDate() - 14)
        break
      case "monthly":
        date.setMonth(date.getMonth() - 1)
        break
    }
    return date
  }

  const calculateEarnings = (workplace: Workplace) => {
    if (!workplace.nextPayDate || !workplace.payPeriodType) {
      return { totalHours: 0, grossPay: 0, taxAmount: 0, netPay: 0, shiftsCount: 0 }
    }

    const periodEnd = new Date(workplace.nextPayDate)
    const periodStart = calculatePeriodStartDate(workplace.payPeriodType, workplace.nextPayDate)

    const periodShifts = shifts.filter((shift) => {
      const shiftDate = new Date(shift.date)
      return (
        shift.workplaceId === workplace.id &&
        shiftDate >= periodStart &&
        shiftDate < periodEnd
      )
    })

    let totalHours = 0
    let grossPay = 0

    periodShifts.forEach((shift) => {
      const hours =
        (new Date(`1970-01-01T${shift.endTime}`).getTime() -
          new Date(`1970-01-01T${shift.startTime}`).getTime()) /
        (1000 * 60 * 60)
      const breakHours = shift.breakMinutes ? shift.breakMinutes / 60 : 0
      const netHours = hours - breakHours
      const payRate = shift.payRateOverride || workplace.payRate

      totalHours += netHours
      grossPay += netHours * payRate
    })

    const taxAmount = workplace.taxRate ? (grossPay * workplace.taxRate) / 100 : 0
    const netPay = grossPay - taxAmount

    return {
      totalHours,
      grossPay,
      taxAmount,
      netPay,
      shiftsCount: periodShifts.length,
    }
  }

  const getUpcomingPaydays = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const upcomingPaydays = []

    for (const workplace of workplaces) {
      if (workplace.nextPayDate && workplace.payPeriodType) {
        const payDate = new Date(workplace.nextPayDate + "T00:00:00")
        if (payDate >= today) {
          const earnings = calculateEarnings(workplace)
          upcomingPaydays.push({
            workplace,
            earnings,
            daysUntil: Math.ceil(
              (payDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
            ),
          })
        }
      }
    }

    return upcomingPaydays.sort((a, b) => a.daysUntil - b.daysUntil)
  }

  const upcomingPaydays = getUpcomingPaydays()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Payday Tracker</h2>
          <p className="text-muted-foreground">Track your upcoming paydays and earnings</p>
        </div>
      </div>

      {upcomingPaydays.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No upcoming paydays</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add a pay period type and next pay date to your workplaces to track upcoming paydays
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {upcomingPaydays.map(({ workplace, earnings, daysUntil }) => (
            <Card key={workplace.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: workplace.color }}
                    />
                    <CardTitle className="text-lg">{workplace.name}</CardTitle>
                  </div>
                  <Badge variant={daysUntil <= 3 ? "default" : "secondary"}>
                    {daysUntil === 0
                      ? "Today"
                      : daysUntil === 1
                        ? "Tomorrow"
                        : `${daysUntil} days`}
                  </Badge>
                </div>
                <CardDescription className="capitalize">
                  {workplace.payPeriodType} pay period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Pay Date</span>
                    <span className="font-medium">
                      {new Date(workplace.nextPayDate! + "T00:00:00").toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Hours
                    </span>
                    <span className="font-medium">
                      {earnings.totalHours.toFixed(1)}h
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Gross Pay
                    </span>
                    <span className="font-medium">
                      ${earnings.grossPay.toFixed(2)}
                    </span>
                  </div>

                  {earnings.taxAmount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Tax ({workplace.taxRate}%)
                      </span>
                      <span className="text-sm text-red-600">
                        -${earnings.taxAmount.toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="font-medium flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      Net Pay
                    </span>
                    <span className="font-bold text-lg text-green-600">
                      ${earnings.netPay.toFixed(2)}
                    </span>
                  </div>

                  <div className="text-xs text-muted-foreground text-center">
                    {earnings.shiftsCount} shifts in this period
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary Card */}
      {upcomingPaydays.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Next 30 Days Summary</CardTitle>
            <CardDescription>
              Total expected earnings from all workplaces
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  $
                  {upcomingPaydays
                    .filter((p) => p.daysUntil <= 30)
                    .reduce((sum, p) => sum + p.earnings.grossPay, 0)
                    .toFixed(2)}
                </div>
                <p className="text-sm text-muted-foreground">Gross Pay</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  -$
                  {upcomingPaydays
                    .filter((p) => p.daysUntil <= 30)
                    .reduce((sum, p) => sum + p.earnings.taxAmount, 0)
                    .toFixed(2)}
                </div>
                <p className="text-sm text-muted-foreground">Total Tax</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  $
                  {upcomingPaydays
                    .filter((p) => p.daysUntil <= 30)
                    .reduce((sum, p) => sum + p.earnings.netPay, 0)
                    .toFixed(2)}
                </div>
                <p className="text-sm text-muted-foreground">Net Pay</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}