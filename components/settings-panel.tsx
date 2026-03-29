"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { SettingsIcon, Bell, Moon, DollarSign, Clock } from "lucide-react"
import type { Settings } from "@/hooks/use-shift-data"
import { ModeToggle } from "./dark-mode-toggle"

interface SettingsPanelProps {
  settings: Settings
  onUpdate: (updates: Partial<Settings>) => void
}

export function SettingsPanel({ settings, onUpdate }: SettingsPanelProps) {
  const handleInputChange = (key: keyof Settings, value: any) => {
    onUpdate({ [key]: value })
  }

  const resetToDefaults = () => {
    if (confirm("Are you sure you want to reset all settings to defaults?")) {
      onUpdate({
        overtimeThreshold: 40,
        overtimeMultiplier: 1.5,
        defaultBreakMinutes: 30,
        notifications: true,
        darkMode: false,
        currency: "USD",
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">Customize your shift calculator preferences</p>
        </div>
        <Button variant="outline" onClick={resetToDefaults}>
          Reset to Defaults
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Work Settings
            </CardTitle>
            <CardDescription>Configure work-related calculations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="overtimeThreshold">Overtime Threshold (hours/week)</Label>
              <Input
                id="overtimeThreshold"
                type="number"
                min="1"
                max="168"
                value={settings.overtimeThreshold}
                onChange={(e) => handleInputChange("overtimeThreshold", Number.parseInt(e.target.value) || 40)}
              />
              <p className="text-xs text-muted-foreground">Hours per week before overtime pay kicks in</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="overtimeMultiplier">Overtime Pay Multiplier</Label>
              <Input
                id="overtimeMultiplier"
                type="number"
                min="1"
                max="3"
                step="0.1"
                value={settings.overtimeMultiplier}
                onChange={(e) => handleInputChange("overtimeMultiplier", Number.parseFloat(e.target.value) || 1.5)}
              />
              <p className="text-xs text-muted-foreground">Multiplier for overtime pay (e.g., 1.5 = time and a half)</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="defaultBreakMinutes">Default Break Duration (minutes)</Label>
              <Input
                id="defaultBreakMinutes"
                type="number"
                min="0"
                max="480"
                value={settings.defaultBreakMinutes}
                onChange={(e) => handleInputChange("defaultBreakMinutes", Number.parseInt(e.target.value) || 30)}
              />
              <p className="text-xs text-muted-foreground">Default break time when adding new shifts</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              App Preferences
            </CardTitle>
            <CardDescription>Customize your app experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Notifications
                </Label>
                <p className="text-xs text-muted-foreground">Get notified about upcoming shifts</p>
              </div>
              <Switch
                checked={settings.notifications}
                onCheckedChange={(checked) => handleInputChange("notifications", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Moon className="h-4 w-4" />
                  Dark Mode
                </Label>
                <p className="text-xs text-muted-foreground">Use dark theme for the interface</p>
              </div>
              <ModeToggle />
            </div>

            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Currency
              </Label>
              <Select value={settings.currency} onValueChange={(value) => handleInputChange("currency", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="CAD">CAD (C$)</SelectItem>
                  <SelectItem value="AUD">AUD (A$)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Currency for pay calculations and display</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>Manage your shift calculator data</CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <h4 className="font-medium mb-2">Export Data</h4>
            <p className="text-sm text-muted-foreground mb-3">Download your shifts and workplace data as CSV</p>
            <Button variant="outline" className="bg-transparent">
              Export to CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
          <CardDescription>Information about this application</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Version:</strong> 1.0.0
            </p>
            <p>
              <strong>Data Storage:</strong> Cloud database + local cache for settings
            </p>
            <p>
              <strong>Auth:</strong> NextAuth (Google OAuth + Email/Password)
            </p>
            <p>
              <strong>Features:</strong> Multi-workplace support, overtime calculations, calendar view, payday tracking
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}