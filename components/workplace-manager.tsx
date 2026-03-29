// ============================================
// FILE: components/workplace-manager.tsx
// PATH: components/workplace-manager.tsx
// NOTE: REPLACE your existing workplace-manager.tsx
// CHANGE: "First Pay Date" → "Next Pay Date"
// ============================================

"use client"

import type React from "react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
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
import { Badge } from "@/components/ui/badge"
import { DatePicker } from "@/components/ui/date-picker"
import { Plus, Edit, Trash2, Building2, Calendar } from "lucide-react"
import type { Workplace } from "@/hooks/use-shift-data"

interface WorkplaceManagerProps {
  workplaces: Workplace[]
  onAdd: (workplace: Omit<Workplace, "id">) => void
  onUpdate: (id: string, updates: Partial<Workplace>) => void
  onDelete: (id: string) => void
  calculateNextPayDate: (type: "weekly" | "bi-weekly" | "monthly", startDate: string) => string
}

const colors = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#ec4899",
  "#6366f1",
]

const workplaceSchema = z.object({
  name: z.string().min(1, "Workplace name is required"),
  payRate: z.string().min(1, "Pay rate is required").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    "Pay rate must be a positive number"
  ),
  taxRate: z.string().optional().refine(
    (val) => !val || (!isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 100),
    "Tax rate must be between 0 and 100"
  ),
  color: z.string().min(1, "Color is required"),
  address: z.string().optional(),
  timezone: z.string().optional(),
  payPeriodType: z.enum(["weekly", "bi-weekly", "monthly"]).optional(),
  nextPayDate: z.string().optional(),
})

type WorkplaceFormData = z.infer<typeof workplaceSchema>

export function WorkplaceManager({
  workplaces,
  onAdd,
  onUpdate,
  onDelete,
  calculateNextPayDate,
}: WorkplaceManagerProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingWorkplace, setEditingWorkplace] = useState<Workplace | null>(null)

  const form = useForm<WorkplaceFormData>({
    resolver: zodResolver(workplaceSchema),
    defaultValues: {
      name: "",
      payRate: "",
      taxRate: "",
      color: colors[0],
      address: "",
      timezone: "",
      payPeriodType: undefined,
      nextPayDate: "",
    },
  })

  const watchedPayPeriodType = form.watch("payPeriodType")
  const watchedNextPayDate = form.watch("nextPayDate")

  const resetForm = () => {
    form.reset({
      name: "",
      payRate: "",
      taxRate: "",
      color: colors[0],
      address: "",
      timezone: "",
      payPeriodType: undefined,
      nextPayDate: "",
    })
  }

  const handleSubmit = (data: WorkplaceFormData) => {
    const workplaceData = {
      name: data.name,
      payRate: Number.parseFloat(data.payRate),
      color: data.color,
      timezone: data.timezone || undefined,
      address: data.address || undefined,
      taxRate: data.taxRate ? Number.parseFloat(data.taxRate) : undefined,
      payPeriodType: data.payPeriodType || undefined,
      nextPayDate: data.nextPayDate || undefined,
    }

    if (editingWorkplace) {
      onUpdate(editingWorkplace.id, workplaceData)
      setEditingWorkplace(null)
    } else {
      onAdd(workplaceData)
      setIsAddDialogOpen(false)
    }

    resetForm()
  }

  const handleEdit = (workplace: Workplace) => {
    setEditingWorkplace(workplace)
    form.reset({
      name: workplace.name,
      payRate: workplace.payRate.toString(),
      color: workplace.color,
      timezone: workplace.timezone || "",
      address: workplace.address || "",
      taxRate: workplace.taxRate?.toString() || "",
      payPeriodType: workplace.payPeriodType || undefined,
      nextPayDate: workplace.nextPayDate || "",
    })
  }

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this workplace? All associated shifts will also be deleted.")) {
      onDelete(id)
    }
  }

  const handleDialogClose = () => {
    setIsAddDialogOpen(false)
    setEditingWorkplace(null)
    resetForm()
  }

  // Calculate the following pay date for preview
  const getFollowingPayDate = () => {
    if (!watchedPayPeriodType || !watchedNextPayDate) return null
    const date = new Date(watchedNextPayDate)
    switch (watchedPayPeriodType) {
      case "weekly":
        date.setDate(date.getDate() + 7)
        break
      case "bi-weekly":
        date.setDate(date.getDate() + 14)
        break
      case "monthly":
        date.setMonth(date.getMonth() + 1)
        break
    }
    return date.toISOString().split("T")[0]
  }

  const WorkplaceForm = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Workplace Name *</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Coffee Shop, Restaurant" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="payRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hourly Pay Rate *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="15.00"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="taxRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tax Rate (%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="25.0"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="color"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Color</FormLabel>
              <FormControl>
                <div className="flex gap-2 flex-wrap">
                  {colors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 ${
                        field.value === color ? "border-foreground" : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => field.onChange(color)}
                    />
                  ))}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="123 Main St, City, State" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="timezone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Timezone (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="America/New_York" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="border-t pt-4">
          <h3 className="text-lg font-semibold mb-4">Pay Period Settings</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="payPeriodType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pay Period Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select pay period" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nextPayDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Next Pay Date</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      disabled={!watchedPayPeriodType}
                      placeholder="Pick a date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          {watchedPayPeriodType && watchedNextPayDate && (
            <p className="text-sm text-muted-foreground mt-2">
              Following pay date: {getFollowingPayDate()}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleDialogClose}>
            Cancel
          </Button>
          <Button type="submit">
            {editingWorkplace ? "Update Workplace" : "Add Workplace"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Workplaces</h2>
          <p className="text-muted-foreground">Manage your different job locations</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Workplace
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Workplace</DialogTitle>
              <DialogDescription>Add a new workplace to track shifts and calculate pay</DialogDescription>
            </DialogHeader>
            <WorkplaceForm />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {workplaces.map((workplace) => (
          <Card key={workplace.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: workplace.color }} />
                  <CardTitle className="text-lg">{workplace.name}</CardTitle>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(workplace)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(workplace.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Pay Rate</span>
                  <Badge variant="secondary">${workplace.payRate}/hr</Badge>
                </div>
                {workplace.taxRate && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Tax Rate</span>
                    <Badge variant="outline">{workplace.taxRate}%</Badge>
                  </div>
                )}
                {workplace.payPeriodType && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Pay Period</span>
                    <Badge variant="outline" className="capitalize">
                      {workplace.payPeriodType}
                    </Badge>
                  </div>
                )}
                {workplace.nextPayDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Next Pay
                    </span>
                    <span className="text-sm font-medium">{new Date(workplace.nextPayDate).toLocaleDateString()}</span>
                  </div>
                )}
                {workplace.address && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Address</span>
                    <span className="text-sm truncate max-w-32">{workplace.address}</span>
                  </div>
                )}
                {workplace.timezone && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Timezone</span>
                    <span className="text-sm">{workplace.timezone}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {workplaces.length === 0 && (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No workplaces yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Add your first workplace to start tracking shifts and calculating pay
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Workplace
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingWorkplace} onOpenChange={() => setEditingWorkplace(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Workplace</DialogTitle>
            <DialogDescription>Update workplace information</DialogDescription>
          </DialogHeader>
          <WorkplaceForm />
        </DialogContent>
      </Dialog>
    </div>
  )
}