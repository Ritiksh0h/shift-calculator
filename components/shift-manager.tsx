// ============================================
// FILE: components/shift-manager.tsx
// PATH: components/shift-manager.tsx
// NOTE: REPLACE your existing shift-manager.tsx
// FIX:  Timezone bug in validateDate
// CHANGE: Multiple shifts now supports per-day times
// ============================================

"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DatePicker } from "@/components/ui/date-picker"
import { Plus, Edit, Trash2, Clock, DollarSign, AlertTriangle, X } from "lucide-react"
import type { Shift, Workplace } from "@/hooks/use-shift-data"

interface ShiftManagerProps {
  shifts: Shift[]
  workplaces: Workplace[]
  onAdd: (shift: Omit<Shift, "id">) => void
  onAddMultiple: (shifts: Omit<Shift, "id">[]) => void
  onUpdate: (id: string, updates: Partial<Shift>) => void
  onDelete: (id: string) => void
  onCheckCollision: (shift: Omit<Shift, "id">, excludeId?: string) => Shift | null
}

interface DayShift {
  dayIndex: number
  dayLabel: string
  enabled: boolean
  startTime: string
  endTime: string
  breakMinutes: string
}

export function ShiftManager({
  shifts,
  workplaces,
  onAdd,
  onAddMultiple,
  onUpdate,
  onDelete,
  onCheckCollision,
}: ShiftManagerProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingShift, setEditingShift] = useState<Shift | null>(null)
  const [activeTab, setActiveTab] = useState("single")
  const [collisionWarning, setCollisionWarning] = useState<string>("")

  // Single shift form
  const [formData, setFormData] = useState({
    workplaceId: "",
    date: "",
    startTime: "",
    endTime: "",
    breakMinutes: "",
    payRateOverride: "",
    notes: "",
  })

  // Multiple shifts form
  const daysOfWeekLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const defaultDayShifts: DayShift[] = daysOfWeekLabels.map((label, i) => ({
    dayIndex: i,
    dayLabel: label,
    enabled: false,
    startTime: "",
    endTime: "",
    breakMinutes: "",
  }))

  const [bulkFormData, setBulkFormData] = useState({
    workplaceId: "",
    startDate: "",
    endDate: "",
    payRateOverride: "",
    notes: "",
  })
  const [dayShifts, setDayShifts] = useState<DayShift[]>(defaultDayShifts)

  const resetForm = () => {
    setFormData({
      workplaceId: "",
      date: "",
      startTime: "",
      endTime: "",
      breakMinutes: "",
      payRateOverride: "",
      notes: "",
    })
    setCollisionWarning("")
  }

  const resetBulkForm = () => {
    setBulkFormData({
      workplaceId: "",
      startDate: "",
      endDate: "",
      payRateOverride: "",
      notes: "",
    })
    setDayShifts(defaultDayShifts.map((d) => ({ ...d, enabled: false, startTime: "", endTime: "", breakMinutes: "" })))
    setCollisionWarning("")
  }

  // Fixed: use T00:00:00 to avoid UTC timezone shift
  const validateDate = (dateString: string): boolean => {
    const date = new Date(dateString + "T00:00:00")
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date >= today
  }

  const validateTime = (startTime: string, endTime: string): boolean => {
    if (!startTime || !endTime) return false
    const start = new Date(`1970-01-01T${startTime}`)
    const end = new Date(`1970-01-01T${endTime}`)
    return end > start
  }

  const toggleDay = (dayIndex: number) => {
    setDayShifts((prev) =>
      prev.map((d) =>
        d.dayIndex === dayIndex ? { ...d, enabled: !d.enabled } : d
      )
    )
  }

  const updateDayField = (dayIndex: number, field: "startTime" | "endTime" | "breakMinutes", value: string) => {
    setDayShifts((prev) =>
      prev.map((d) =>
        d.dayIndex === dayIndex ? { ...d, [field]: value } : d
      )
    )
  }

  // Copy one day's schedule to another specific day
  const copyDayTo = (fromIndex: number, toIndex: number) => {
    const source = dayShifts[fromIndex]
    setDayShifts((prev) =>
      prev.map((d) =>
        d.dayIndex === toIndex
          ? { ...d, enabled: true, startTime: source.startTime, endTime: source.endTime, breakMinutes: source.breakMinutes }
          : d
      )
    )
  }

  // Apply one day's schedule to all enabled days
  const applyTimeToAll = (fromIndex: number) => {
    const source = dayShifts[fromIndex]
    setDayShifts((prev) =>
      prev.map((d) =>
        d.enabled ? { ...d, startTime: source.startTime, endTime: source.endTime, breakMinutes: source.breakMinutes } : d
      )
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.workplaceId || !formData.date || !formData.startTime || !formData.endTime) return

    if (!validateDate(formData.date)) {
      setCollisionWarning("Cannot schedule shifts in the past")
      return
    }

    if (!validateTime(formData.startTime, formData.endTime)) {
      setCollisionWarning("End time must be after start time")
      return
    }

    const shiftData = {
      workplaceId: formData.workplaceId,
      date: formData.date,
      startTime: formData.startTime,
      endTime: formData.endTime,
      breakMinutes: formData.breakMinutes ? Number.parseInt(formData.breakMinutes) : undefined,
      payRateOverride: formData.payRateOverride ? Number.parseFloat(formData.payRateOverride) : undefined,
      notes: formData.notes || undefined,
    }

    const collision = onCheckCollision(shiftData, editingShift?.id)
    if (collision) {
      const workplace = workplaces.find((w) => w.id === collision.workplaceId)
      setCollisionWarning(
        `Shift conflicts with existing ${workplace?.name} shift on ${collision.date} from ${collision.startTime} to ${collision.endTime}`
      )
      return
    }

    if (editingShift) {
      onUpdate(editingShift.id, shiftData)
      setEditingShift(null)
    } else {
      onAdd(shiftData)
      setIsAddDialogOpen(false)
    }

    resetForm()
  }

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const enabledDays = dayShifts.filter((d) => d.enabled)

    if (!bulkFormData.workplaceId || !bulkFormData.startDate || !bulkFormData.endDate || enabledDays.length === 0) {
      setCollisionWarning("Please select a workplace, date range, and at least one day")
      return
    }

    if (!validateDate(bulkFormData.startDate) || !validateDate(bulkFormData.endDate)) {
      setCollisionWarning("Cannot schedule shifts in the past")
      return
    }

    // Validate each enabled day has times
    const missingTimes = enabledDays.filter((d) => !d.startTime || !d.endTime)
    if (missingTimes.length > 0) {
      setCollisionWarning(`Missing times for: ${missingTimes.map((d) => d.dayLabel).join(", ")}`)
      return
    }

    // Validate each day's times
    const invalidTimes = enabledDays.filter((d) => !validateTime(d.startTime, d.endTime))
    if (invalidTimes.length > 0) {
      setCollisionWarning(`End time must be after start time for: ${invalidTimes.map((d) => d.dayLabel).join(", ")}`)
      return
    }

    const startDate = new Date(bulkFormData.startDate + "T00:00:00")
    const endDate = new Date(bulkFormData.endDate + "T00:00:00")

    if (endDate < startDate) {
      setCollisionWarning("End date must be after start date")
      return
    }

    const shiftsToAdd: Omit<Shift, "id">[] = []
    const collisions: string[] = []

    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      const dayConfig = dayShifts.find((d) => d.dayIndex === currentDate.getDay() && d.enabled)
      if (dayConfig) {
        const year = currentDate.getFullYear()
        const month = String(currentDate.getMonth() + 1).padStart(2, "0")
        const day = String(currentDate.getDate()).padStart(2, "0")
        const dateString = `${year}-${month}-${day}`

        const shiftData = {
          workplaceId: bulkFormData.workplaceId,
          date: dateString,
          startTime: dayConfig.startTime,
          endTime: dayConfig.endTime,
          breakMinutes: dayConfig.breakMinutes ? Number.parseInt(dayConfig.breakMinutes) : undefined,
          payRateOverride: bulkFormData.payRateOverride ? Number.parseFloat(bulkFormData.payRateOverride) : undefined,
          notes: bulkFormData.notes || undefined,
        }

        const collision = onCheckCollision(shiftData)
        if (collision) {
          const workplace = workplaces.find((w) => w.id === collision.workplaceId)
          collisions.push(`${dateString} conflicts with ${workplace?.name}`)
        } else {
          shiftsToAdd.push(shiftData)
        }
      }
      currentDate.setDate(currentDate.getDate() + 1)
    }

    if (collisions.length > 0) {
      setCollisionWarning(
        `Found ${collisions.length} conflicts: ${collisions.slice(0, 3).join(", ")}${collisions.length > 3 ? "..." : ""}`
      )
      return
    }

    if (shiftsToAdd.length === 0) {
      setCollisionWarning("No shifts to add for the selected criteria")
      return
    }

    onAddMultiple(shiftsToAdd)
    setIsAddDialogOpen(false)
    resetBulkForm()
  }

  const handleEdit = (shift: Shift) => {
    setEditingShift(shift)
    setFormData({
      workplaceId: shift.workplaceId,
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      breakMinutes: shift.breakMinutes?.toString() || "",
      payRateOverride: shift.payRateOverride?.toString() || "",
      notes: shift.notes || "",
    })
    setCollisionWarning("")
  }

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this shift?")) {
      onDelete(id)
    }
  }

  const calculateShiftPay = (shift: Shift) => {
    const workplace = workplaces.find((w) => w.id === shift.workplaceId)
    if (!workplace) return 0
    const hours =
      (new Date(`1970-01-01T${shift.endTime}`).getTime() - new Date(`1970-01-01T${shift.startTime}`).getTime()) /
      (1000 * 60 * 60)
    const breakHours = shift.breakMinutes ? shift.breakMinutes / 60 : 0
    const netHours = hours - breakHours
    const payRate = shift.payRateOverride || workplace.payRate
    return netHours * payRate
  }

  const calculateShiftHours = (shift: Shift) => {
    const hours =
      (new Date(`1970-01-01T${shift.endTime}`).getTime() - new Date(`1970-01-01T${shift.startTime}`).getTime()) /
      (1000 * 60 * 60)
    const breakHours = shift.breakMinutes ? shift.breakMinutes / 60 : 0
    return hours - breakHours
  }

  const sortedShifts = [...shifts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const enabledDays = dayShifts.filter((d) => d.enabled)
  const firstEnabledDay = enabledDays[0]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Shifts</h2>
          <p className="text-muted-foreground">Manage your work shifts</p>
        </div>
        <Dialog
          open={isAddDialogOpen}
          onOpenChange={(open) => {
            setIsAddDialogOpen(open)
            if (!open) {
              resetForm()
              resetBulkForm()
            }
          }}
        >
          <DialogTrigger asChild>
            <Button disabled={workplaces.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              Add Shift
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Shift(s)</DialogTitle>
              <DialogDescription>Schedule new work shifts</DialogDescription>
            </DialogHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="single">Single Shift</TabsTrigger>
                <TabsTrigger value="multiple">Weekly Schedule</TabsTrigger>
              </TabsList>

              {/* ──── Single Shift Tab ──── */}
              <TabsContent value="single">
                <form onSubmit={handleSubmit}>
                  <div className="grid gap-4 py-4">
                    {collisionWarning && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{collisionWarning}</AlertDescription>
                      </Alert>
                    )}

                    <div className="grid gap-2">
                      <Label>Workplace *</Label>
                      <Select
                        value={formData.workplaceId}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, workplaceId: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select workplace" />
                        </SelectTrigger>
                        <SelectContent>
                          {workplaces.map((wp) => (
                            <SelectItem key={wp.id} value={wp.id}>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: wp.color }} />
                                {wp.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label>Date *</Label>
                      <DatePicker
                        value={formData.date}
                        onChange={(val) => setFormData((prev) => ({ ...prev, date: val }))}
                        placeholder="Pick a date"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Start Time *</Label>
                        <Input
                          type="time"
                          value={formData.startTime}
                          onChange={(e) => setFormData((prev) => ({ ...prev, startTime: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>End Time *</Label>
                        <Input
                          type="time"
                          value={formData.endTime}
                          onChange={(e) => setFormData((prev) => ({ ...prev, endTime: e.target.value }))}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Break (minutes)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={formData.breakMinutes}
                          onChange={(e) => setFormData((prev) => ({ ...prev, breakMinutes: e.target.value }))}
                          placeholder="30"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Pay Rate Override ($/hr)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.payRateOverride}
                          onChange={(e) => setFormData((prev) => ({ ...prev, payRateOverride: e.target.value }))}
                          placeholder="Workplace rate"
                        />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label>Notes</Label>
                      <Textarea
                        value={formData.notes}
                        onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                        placeholder="Any additional notes"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Add Shift</Button>
                  </DialogFooter>
                </form>
              </TabsContent>

              {/* ──── Weekly Schedule Tab ──── */}
              <TabsContent value="multiple">
                <form onSubmit={handleBulkSubmit}>
                  <div className="grid gap-4 py-4">
                    {collisionWarning && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{collisionWarning}</AlertDescription>
                      </Alert>
                    )}

                    <div className="grid gap-2">
                      <Label>Workplace *</Label>
                      <Select
                        value={bulkFormData.workplaceId}
                        onValueChange={(value) => setBulkFormData((prev) => ({ ...prev, workplaceId: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select workplace" />
                        </SelectTrigger>
                        <SelectContent>
                          {workplaces.map((wp) => (
                            <SelectItem key={wp.id} value={wp.id}>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: wp.color }} />
                                {wp.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>From *</Label>
                        <DatePicker
                          value={bulkFormData.startDate}
                          onChange={(val) => setBulkFormData((prev) => ({ ...prev, startDate: val }))}
                          placeholder="Start date"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>To *</Label>
                        <DatePicker
                          value={bulkFormData.endDate}
                          onChange={(val) => setBulkFormData((prev) => ({ ...prev, endDate: val }))}
                          placeholder="End date"
                        />
                      </div>
                    </div>

                    {/* Day selection + per-day times + breaks */}
                    <div className="grid gap-3">
                      <div className="flex items-center justify-between">
                        <Label>Schedule *</Label>
                        {enabledDays.length >= 2 && firstEnabledDay?.startTime && firstEnabledDay?.endTime && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => applyTimeToAll(firstEnabledDay.dayIndex)}
                          >
                            Apply {firstEnabledDay.dayLabel} to all
                          </Button>
                        )}
                      </div>

                      <div className="space-y-2">
                        {daysOfWeekLabels.map((label, index) => {
                          const day = dayShifts[index]
                          const otherEnabledDays = dayShifts.filter(
                            (d) => d.enabled && d.dayIndex !== index && d.startTime && d.endTime
                          )
                          return (
                            <div
                              key={label}
                              className={`rounded-lg border transition-colors ${
                                day.enabled ? "border-primary/50 bg-muted/50" : "border-transparent"
                              }`}
                            >
                              <div className="flex items-center gap-3 p-2">
                                <Button
                                  type="button"
                                  variant={day.enabled ? "default" : "outline"}
                                  size="sm"
                                  className="w-12 shrink-0"
                                  onClick={() => toggleDay(index)}
                                >
                                  {label}
                                </Button>
                                {day.enabled && (
                                  <div className="flex items-center gap-2 flex-1 flex-wrap">
                                    <Input
                                      type="time"
                                      value={day.startTime}
                                      onChange={(e) => updateDayField(index, "startTime", e.target.value)}
                                      className="h-8 text-sm w-[110px]"
                                    />
                                    <span className="text-muted-foreground text-sm">to</span>
                                    <Input
                                      type="time"
                                      value={day.endTime}
                                      onChange={(e) => updateDayField(index, "endTime", e.target.value)}
                                      className="h-8 text-sm w-[110px]"
                                    />
                                    <div className="flex items-center gap-1">
                                      <Input
                                        type="number"
                                        min="0"
                                        value={day.breakMinutes}
                                        onChange={(e) => updateDayField(index, "breakMinutes", e.target.value)}
                                        className="h-8 text-sm w-[70px]"
                                        placeholder="0"
                                      />
                                      <span className="text-muted-foreground text-xs">min break</span>
                                    </div>
                                  </div>
                                )}
                                {!day.enabled && (
                                  <div className="flex items-center gap-2 flex-1">
                                    <span className="text-sm text-muted-foreground">Off</span>
                                    {otherEnabledDays.length > 0 && (
                                      <Select onValueChange={(val) => copyDayTo(Number(val), index)}>
                                        <SelectTrigger className="h-7 text-xs w-auto gap-1 border-dashed">
                                          <SelectValue placeholder="Copy from..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {otherEnabledDays.map((d) => (
                                            <SelectItem key={d.dayIndex} value={d.dayIndex.toString()}>
                                              {d.dayLabel} ({d.startTime}–{d.endTime})
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label>Pay Rate Override ($/hr)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={bulkFormData.payRateOverride}
                        onChange={(e) => setBulkFormData((prev) => ({ ...prev, payRateOverride: e.target.value }))}
                        placeholder="Leave empty to use workplace rate"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>Notes</Label>
                      <Textarea
                        value={bulkFormData.notes}
                        onChange={(e) => setBulkFormData((prev) => ({ ...prev, notes: e.target.value }))}
                        placeholder="Any additional notes"
                      />
                    </div>

                    {enabledDays.length > 0 && bulkFormData.startDate && bulkFormData.endDate && (
                      <p className="text-sm text-muted-foreground">
                        Will create shifts for {enabledDays.map((d) => d.dayLabel).join(", ")} between{" "}
                        {bulkFormData.startDate} and {bulkFormData.endDate}
                      </p>
                    )}
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={enabledDays.length === 0}>
                      Add {enabledDays.length > 0 ? `${enabledDays.length} Day Schedule` : "Shifts"}
                    </Button>
                  </DialogFooter>
                </form>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {/* No workplaces message */}
      {workplaces.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No workplaces available</h3>
            <p className="text-muted-foreground text-center mb-4">
              You need to add at least one workplace before you can schedule shifts
            </p>
          </CardContent>
        </Card>
      )}

      {/* Shift list */}
      <div className="space-y-3">
        {sortedShifts.map((shift) => {
          const workplace = workplaces.find((w) => w.id === shift.workplaceId)
          if (!workplace) return null

          return (
            <Card key={shift.id}>
              <CardContent className="p-4">
                <div className="flex items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                    <div
                      className="w-3 h-3 rounded-full mt-1.5 sm:mt-0 shrink-0"
                      style={{ backgroundColor: workplace.color }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{workplace.name}</h3>
                        <Badge variant="outline" className="text-xs">
                          {calculateShiftHours(shift).toFixed(1)}h · ${calculateShiftPay(shift).toFixed(2)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(shift.date + "T00:00:00").toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                        {" · "}
                        {shift.startTime} – {shift.endTime}
                      </p>
                      {shift.notes && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">{shift.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(shift)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(shift.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {shifts.length === 0 && workplaces.length > 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Clock className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No shifts scheduled</h3>
              <p className="text-muted-foreground text-center mb-4">
                Add your first shift to start tracking your work hours
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Shift
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingShift}
        onOpenChange={() => {
          setEditingShift(null)
          setCollisionWarning("")
        }}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Shift</DialogTitle>
            <DialogDescription>Update shift information</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              {collisionWarning && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{collisionWarning}</AlertDescription>
                </Alert>
              )}

              <div className="grid gap-2">
                <Label>Workplace *</Label>
                <Select
                  value={formData.workplaceId}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, workplaceId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select workplace" />
                  </SelectTrigger>
                  <SelectContent>
                    {workplaces.map((wp) => (
                      <SelectItem key={wp.id} value={wp.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: wp.color }} />
                          {wp.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Date *</Label>
                <DatePicker
                  value={formData.date}
                  onChange={(val) => setFormData((prev) => ({ ...prev, date: val }))}
                  placeholder="Pick a date"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Start Time *</Label>
                  <Input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData((prev) => ({ ...prev, startTime: e.target.value }))}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label>End Time *</Label>
                  <Input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData((prev) => ({ ...prev, endTime: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Break (minutes)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.breakMinutes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, breakMinutes: e.target.value }))}
                    placeholder="30"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Pay Rate Override ($/hr)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.payRateOverride}
                    onChange={(e) => setFormData((prev) => ({ ...prev, payRateOverride: e.target.value }))}
                    placeholder="Workplace rate"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any additional notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingShift(null)}>
                Cancel
              </Button>
              <Button type="submit">Update Shift</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}