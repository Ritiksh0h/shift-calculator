// ============================================
// FILE: app/page.tsx
// PATH: app/page.tsx
// NOTE: REPLACE your existing page.tsx
// CHANGE: Mobile sidebar nav, desktop tabs, logo header
// ============================================

"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  Loader2,
  Menu,
  Clock,
  DollarSign,
  Calendar,
  Settings,
  Building2,
  LayoutDashboard,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AuthForm } from "@/components/auth/auth-form";
import { useShiftData } from "@/hooks/use-shift-data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { WorkplaceManager } from "@/components/workplace-manager";
import { ShiftManager } from "@/components/shift-manager";
import { CalendarView } from "@/components/calendar-view";
import { SettingsPanel } from "@/components/settings-panel";
import { NextShiftCard } from "@/components/next-shift-card";
import { PaydayTracker } from "@/components/payday-tracker";

const navItems = [
  { value: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { value: "workplaces", label: "Workplaces", icon: Building2 },
  { value: "shifts", label: "Shifts", icon: Clock },
  { value: "calendar", label: "Calendar", icon: Calendar },
  { value: "payday", label: "Payday", icon: DollarSign },
  { value: "settings", label: "Settings", icon: Settings },
];

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
  } = useShiftData();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  // Calculate summary stats
  const currentWeekShifts = shifts.filter((shift) => {
    const shiftDate = new Date(shift.date + "T00:00:00");
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    return shiftDate >= weekStart && shiftDate <= weekEnd;
  });

  const weeklyHours = currentWeekShifts.reduce((total, shift) => {
    const hours =
      (new Date(`1970-01-01T${shift.endTime}`).getTime() -
        new Date(`1970-01-01T${shift.startTime}`).getTime()) /
      (1000 * 60 * 60);
    const breakHours = shift.breakMinutes ? shift.breakMinutes / 60 : 0;
    return total + (hours - breakHours);
  }, 0);

  const weeklyPayData = currentWeekShifts.reduce(
    (acc, shift) => {
      const workplace = workplaces.find((w) => w.id === shift.workplaceId);
      if (!workplace) return acc;

      const hours =
        (new Date(`1970-01-01T${shift.endTime}`).getTime() -
          new Date(`1970-01-01T${shift.startTime}`).getTime()) /
        (1000 * 60 * 60);
      const breakHours = shift.breakMinutes ? shift.breakMinutes / 60 : 0;
      const netHours = hours - breakHours;
      const payRate = shift.payRateOverride || workplace.payRate;
      const grossPay = netHours * payRate;
      const taxAmount = workplace.taxRate
        ? (grossPay * workplace.taxRate) / 100
        : 0;
      const netPay = grossPay - taxAmount;

      return {
        gross: acc.gross + grossPay,
        tax: acc.tax + taxAmount,
        net: acc.net + netPay,
      };
    },
    { gross: 0, tax: 0, net: 0 }
  );

  const handleNavClick = (value: string) => {
    setActiveTab(value);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-3 sm:p-4 max-w-7xl">
        {/* ──── Header ──── */}
        <header className="mb-4 sm:mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden shrink-0"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetHeader className="p-4 pb-2">
                  <SheetTitle className="flex items-center gap-2 text-left">
                    <img src="/logo.svg" alt="Shift Calculator" className="h-8 w-8 rounded-lg" />
                    <span className="text-lg font-bold">Shift Calculator</span>
                  </SheetTitle>
                </SheetHeader>
                <Separator />
                <nav className="flex flex-col p-2">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.value;
                    return (
                      <button
                        key={item.value}
                        onClick={() => handleNavClick(item.value)}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-left ${
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </button>
                    );
                  })}
                </nav>
                <Separator />
                <div className="p-2">
                  <button
                    onClick={() => {
                      setSidebarOpen(false);
                      signOut();
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors text-left"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
                {user?.email && (
                  <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                )}
              </SheetContent>
            </Sheet>

            {/* Logo */}
            <div className="flex items-center gap-2">
              <img src="/logo.svg" alt="Shift Calculator" className="h-8 w-8 rounded-lg hidden sm:block" />
              <div>
                <h1 className="text-lg sm:text-xl font-bold tracking-tight leading-none">
                  Shift Calculator
                </h1>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Manage your shifts across workplaces
                </p>
              </div>
            </div>
          </div>

          {/* Desktop sign out */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut()}
            className="hidden lg:flex text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </header>

        {/* ──── Content ──── */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4 sm:space-y-6"
        >
          {/* Desktop tab bar — hidden on mobile */}
          <TabsList className="hidden lg:grid w-full lg:grid-cols-6 h-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <TabsTrigger
                  key={item.value}
                  value={item.value}
                  className="flex items-center gap-2 py-1.5"
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm">{item.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* ──── Dashboard ──── */}
          <TabsContent value="dashboard" className="space-y-4 sm:space-y-6">
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
              <NextShiftCard shifts={shifts} workplaces={workplaces} />

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">
                    This Week
                  </CardTitle>
                  <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold">
                    {weeklyHours.toFixed(1)}h
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    {currentWeekShifts.length} shifts
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">
                    Gross Pay
                  </CardTitle>
                  <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold">
                    ${weeklyPayData.gross.toFixed(2)}
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    Before taxes
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">
                    Net Pay
                  </CardTitle>
                  <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold">
                    ${weeklyPayData.net.toFixed(2)}
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    After ${weeklyPayData.tax.toFixed(2)} tax
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Recent Shifts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {shifts.slice(0, 5).map((shift) => {
                      const workplace = workplaces.find(
                        (w) => w.id === shift.workplaceId
                      );
                      const hours =
                        (new Date(
                          `1970-01-01T${shift.endTime}`
                        ).getTime() -
                          new Date(
                            `1970-01-01T${shift.startTime}`
                          ).getTime()) /
                          (1000 * 60 * 60) -
                        (shift.breakMinutes || 0) / 60;
                      const pay =
                        hours *
                        (shift.payRateOverride || workplace?.payRate || 0);

                      return (
                        <div
                          key={shift.id}
                          className="flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{
                                backgroundColor: workplace?.color || "#888",
                              }}
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {workplace?.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(
                                  shift.date + "T00:00:00"
                                ).toLocaleDateString("en-US", {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                })}{" "}
                                · {shift.startTime}–{shift.endTime}
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant="secondary"
                            className="shrink-0 text-xs"
                          >
                            ${pay.toFixed(2)}
                          </Badge>
                        </div>
                      );
                    })}
                    {shifts.length === 0 && (
                      <p className="text-muted-foreground text-center py-4 text-sm">
                        No shifts scheduled yet
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Workplaces</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {workplaces.map((workplace) => (
                      <div
                        key={workplace.id}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: workplace.color }}
                          />
                          <p className="text-sm font-medium">
                            {workplace.name}
                          </p>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          ${workplace.payRate}/hr
                        </span>
                      </div>
                    ))}
                    {workplaces.length === 0 && (
                      <p className="text-muted-foreground text-center py-4 text-sm">
                        No workplaces added yet
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ──── Other tabs ──── */}
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
                console.log("Shift clicked:", shift);
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
  );
}