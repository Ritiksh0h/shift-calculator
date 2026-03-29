"use client"

import { useState } from "react"
import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { LogOut, Loader2 } from "lucide-react"
import { AuthForm } from "@/components/auth/auth-form"
import { useShiftData } from "@/hooks/use-shift-data"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Clock,
  DollarSign,
  Calendar,
  Settings,
  Building2,
} from "lucide-react"
import { WorkplaceManager } from "@/components/workplace-manager"
import { ShiftManager } from "@/components/shift-manager"
import { CalendarView } from "@/components/calendar-view"
import { SettingsPanel } from "@/components/settings-panel"
import { NextShiftCard } from "@/components/next-shift-card"
import { PaydayTracker } from "@/components/payday-tracker"

export default function ShiftCalculator() {
  const {
    user,
    loading,
    workplaces,
    shifts,
    payPeriods,
    settings,
    addWorkplace,
    updateWorkplace,
    deleteWorkplace,
    addShift,
    addShifts,
    updateShift,
    deleteShift,
    updateSettings,
    checkShiftCollision,
    calculateNextPayDate,
  } = useShiftData()

  const [activeTab, setActiveTab] = useState("dashboard")

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <AuthForm />
  }

  // Calculate summary stats
  const currentWeekShifts = shifts.filter((shift) => {
    const shiftDate = new Date(shift.date)
    const now = new Date()
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()))
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    return shiftDate >= weekStart && shiftDate <= weekEnd
  })

  const weeklyHours = currentWeekShifts.reduce((total, shift) => {
    const hours =
      (new Date(`1970-01-01T${shift.endTime}`).getTime() -
        new Date(`1970-01-01T${shift.startTime}`).getTime()) /
      (1000 * 60 * 60)
    const breakHours = shift.breakMinutes ? shift.breakMinutes / 60 : 0
    return total + (hours - breakHours)
  }, 0)

  const weeklyPayData = currentWeekShifts.reduce(
    (acc, shift) => {
      const workplace = workplaces.find((w) => w.id === shift.workplaceId)
      if (!workplace) return acc

      const hours =
        (new Date(`1970-01-01T${shift.endTime}`).getTime() -
          new Date(`1970-01-01T${shift.startTime}`).getTime()) /
        (1000 * 60 * 60)
      const breakHours = shift.breakMinutes ? shift.breakMinutes / 60 : 0
      const netHours = hours - breakHours
      const payRate = shift.payRateOverride || workplace.payRate
      const grossPay = netHours * payRate
      const taxAmount = workplace.taxRate
        ? (grossPay * workplace.taxRate) / 100
        : 0
      const netPay = grossPay - taxAmount

      return {
        gross: acc.gross + grossPay,
        tax: acc.tax + taxAmount,
        net: acc.net + netPay,
      }
    },
    { gross: 0, tax: 0, net: 0 }
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-2 sm:p-4 max-w-7xl">
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Shift Calculator
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage your shifts across multiple workplaces
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => signOut()}
            className="self-start sm:self-auto bg-transparent"
          >
            <LogOut className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Sign Out</span>
            <span className="sm:hidden">Out</span>
          </Button>
        </div>
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 lg:w-auto lg:grid-cols-6 h-auto">
            <TabsTrigger
              value="dashboard"
              className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-1.5"
            >
              <Clock className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger
              value="workplaces"
              className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-1.5"
            >
              <Building2 className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Workplaces</span>
            </TabsTrigger>
            <TabsTrigger
              value="shifts"
              className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-1.5"
            >
              <Calendar className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Shifts</span>
            </TabsTrigger>
            <TabsTrigger
              value="calendar"
              className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-1.5 hidden sm:flex"
            >
              <Calendar className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Calendar</span>
            </TabsTrigger>
            <TabsTrigger
              value="payday"
              className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-1.5"
            >
              <DollarSign className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Payday</span>
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-1.5 hidden sm:flex"
            >
              <Settings className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <NextShiftCard shifts={shifts} workplaces={workplaces} />

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    This Week
                  </CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {weeklyHours.toFixed(1)}h
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {currentWeekShifts.length} shifts scheduled
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Gross Pay
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${weeklyPayData.gross.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">Before taxes</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Net Pay
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${weeklyPayData.net.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    After ${weeklyPayData.tax.toFixed(2)} tax
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Shifts</CardTitle>
                  <CardDescription>
                    Your latest scheduled shifts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {shifts.slice(0, 5).map((shift) => {
                      const workplace = workplaces.find(
                        (w) => w.id === shift.workplaceId
                      )
                      return (
                        <div
                          key={shift.id}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                backgroundColor:
                                  workplace?.color || "#gray",
                              }}
                            />
                            <div>
                              <p className="font-medium">
                                {workplace?.name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(
                                  shift.date
                                ).toLocaleDateString()}{" "}
                                • {shift.startTime} - {shift.endTime}
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary">
                            $
                            {(
                              (shift.payRateOverride ||
                                workplace?.payRate ||
                                0) *
                              ((new Date(
                                `1970-01-01T${shift.endTime}`
                              ).getTime() -
                                new Date(
                                  `1970-01-01T${shift.startTime}`
                                ).getTime()) /
                                (1000 * 60 * 60) -
                                (shift.breakMinutes || 0) / 60)
                            ).toFixed(2)}
                          </Badge>
                        </div>
                      )
                    })}
                    {shifts.length === 0 && (
                      <p className="text-muted-foreground text-center py-4">
                        No shifts scheduled yet
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Workplaces</CardTitle>
                  <CardDescription>
                    Your registered workplaces
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {workplaces.map((workplace) => (
                      <div
                        key={workplace.id}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: workplace.color,
                            }}
                          />
                          <div>
                            <p className="font-medium">{workplace.name}</p>
                            <p className="text-sm text-muted-foreground">
                              ${workplace.payRate}/hr
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {workplaces.length === 0 && (
                      <p className="text-muted-foreground text-center py-4">
                        No workplaces added yet
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="workplaces">
            <WorkplaceManager
              workplaces={workplaces}
              onAdd={addWorkplace}
              onUpdate={updateWorkplace}
              onDelete={deleteWorkplace}
              calculateNextPayDate={calculateNextPayDate}
            />
          </TabsContent>

          <TabsContent value="shifts">
            <ShiftManager
              shifts={shifts}
              workplaces={workplaces}
              onAdd={addShift}
              onAddMultiple={addShifts}
              onUpdate={updateShift}
              onDelete={deleteShift}
              onCheckCollision={checkShiftCollision}
            />
          </TabsContent>

          <TabsContent value="calendar">
            <CalendarView
              shifts={shifts}
              workplaces={workplaces}
              onShiftClick={(shift) => {
                console.log("Shift clicked:", shift)
              }}
            />
          </TabsContent>

          <TabsContent value="payday">
            <PaydayTracker
              workplaces={workplaces}
              shifts={shifts}
              payPeriods={payPeriods}
            />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsPanel settings={settings} onUpdate={updateSettings} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}