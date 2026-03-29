"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  getLocalSettings,
  saveLocalSettings,
  clearLocalSettings,
  mergeSettings,
} from "@/lib/settings-storage";

// Client-side utility functions (pure math, no DB imports)
const calculateShiftDuration = (
  start: string,
  end: string,
  breakMinutes = 0
): number => {
  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);
  const startMin = startH * 60 + startM;
  const endMin = endH * 60 + endM;
  const totalMin = Math.max(0, endMin - startMin - breakMinutes);
  return +(totalMin / 60).toFixed(2);
};

const calculateShiftPayLocal = (
  shift: Shift,
  baseRate: number,
  overtimeThreshold: number,
  overtimeMultiplier: number
): number => {
  const duration = calculateShiftDuration(
    shift.startTime,
    shift.endTime,
    shift.breakMinutes ?? 0
  );
  const rate = shift.payRateOverride ?? baseRate;

  if (duration > overtimeThreshold) {
    const regular = overtimeThreshold;
    const overtime = duration - overtimeThreshold;
    return +(regular * rate + overtime * rate * overtimeMultiplier).toFixed(2);
  }

  return +(duration * rate).toFixed(2);
};

// ---------- Types ----------
export interface Workplace {
  id: string;
  name: string;
  payRate: number;
  color: string;
  timezone?: string;
  address?: string;
  taxRate?: number;
  payPeriodType?: "weekly" | "bi-weekly" | "monthly";
  nextPayDate?: string;
}

export interface Shift {
  id: string;
  workplaceId: string;
  date: string;
  startTime: string;
  endTime: string;
  breakMinutes?: number;
  payRateOverride?: number;
  notes?: string;
  isRecurring?: boolean;
  recurringPattern?: string;
}

export interface PayPeriod {
  id: string;
  workplaceId: string;
  type: "weekly" | "bi-weekly" | "monthly";
  startDate: string;
  payDate: string;
}

export interface Settings {
  overtimeThreshold: number;
  overtimeMultiplier: number;
  defaultBreakMinutes: number;
  notifications: boolean;
  darkMode: boolean;
  currency: string;
}

const defaultSettings: Settings = {
  overtimeThreshold: 40,
  overtimeMultiplier: 1.5,
  defaultBreakMinutes: 30,
  notifications: true,
  darkMode: false,
  currency: "USD",
};

// ---------- API helper ----------
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `API error: ${res.status}`);
  }
  return res.json();
}

// ---------- Hook ----------
export function useShiftData() {
  const { data: session, status } = useSession();
  const userId = session?.user?.id ?? null;

  const [workplaces, setWorkplaces] = useState<Workplace[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [payPeriods, setPayPeriods] = useState<PayPeriod[]>([]);
  // Load settings from localStorage first for instant display
  const [settings, setSettings] = useState<Settings>(() => {
    const local = getLocalSettings();
    return local ?? defaultSettings;
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") setLoading(true);
  }, [status]);

  useEffect(() => {
    if (status === "unauthenticated") {
      setWorkplaces([]);
      setShifts([]);
      setPayPeriods([]);
      setSettings(defaultSettings);
      clearLocalSettings();
      setLoading(false);
    }
  }, [status]);

  // ---------- calculateNextPayDate ----------
  // Given a known pay date and period type, advance it past today
  const calculateNextPayDate = useCallback(
    (type: "weekly" | "bi-weekly" | "monthly", fromDate: string) => {
      const date = new Date(fromDate);
      const today = new Date();

      switch (type) {
        case "weekly":
          while (date <= today) date.setDate(date.getDate() + 7);
          break;
        case "bi-weekly":
          while (date <= today) date.setDate(date.getDate() + 14);
          break;
        case "monthly":
          while (date <= today) date.setMonth(date.getMonth() + 1);
          break;
      }

      return date.toISOString().split("T")[0];
    },
    []
  );

  // Back-calculate a pay period start date from a pay date
  const calculatePeriodStartDate = useCallback(
    (type: "weekly" | "bi-weekly" | "monthly", payDate: string) => {
      const date = new Date(payDate);

      switch (type) {
        case "weekly":
          date.setDate(date.getDate() - 7);
          break;
        case "bi-weekly":
          date.setDate(date.getDate() - 14);
          break;
        case "monthly":
          date.setMonth(date.getMonth() - 1);
          break;
      }

      return date.toISOString().split("T")[0];
    },
    []
  );

  // ---------- loadAllData ----------
  const loadAllData = useCallback(
    async (opts?: { force?: boolean }) => {
      if (!userId) return;
      setLoading(true);
      setError(null);

      try {
        const [workplacesData, shiftsData, payPeriodsData, settingsData] =
          await Promise.all([
            apiFetch<any[]>("/api/workplaces"),
            apiFetch<any[]>("/api/shifts"),
            apiFetch<any[]>("/api/pay-periods"),
            apiFetch<any>("/api/settings"),
          ]);

        const transformedWorkplaces: Workplace[] = workplacesData.map(
          (wp: any) => {
            const wpPayPeriods = payPeriodsData.filter(
              (p: any) => p.workplaceId === wp.id
            );
            const latestPayPeriod = wpPayPeriods
              .slice()
              .sort(
                (a: any, b: any) =>
                  new Date(b.payDate).getTime() -
                  new Date(a.payDate).getTime()
              )[0];

            return {
              id: wp.id,
              name: wp.name,
              payRate: wp.payRate,
              color: wp.color,
              timezone: wp.timezone || undefined,
              address: wp.address || undefined,
              taxRate: wp.taxRate ?? undefined,
              payPeriodType: latestPayPeriod?.type as
                | "weekly"
                | "bi-weekly"
                | "monthly"
                | undefined,
              nextPayDate: latestPayPeriod
                ? calculateNextPayDate(
                    latestPayPeriod.type,
                    latestPayPeriod.payDate
                  )
                : undefined,
            };
          }
        );

        const transformedShifts: Shift[] = shiftsData.map((s: any) => ({
          id: s.id,
          workplaceId: s.workplaceId,
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime,
          breakMinutes: s.breakMinutes ?? undefined,
          payRateOverride: s.payRateOverride ?? undefined,
          notes: s.notes ?? undefined,
          isRecurring: s.isRecurring ?? undefined,
          recurringPattern: s.recurringPattern ?? undefined,
        }));

        const transformedPayPeriods: PayPeriod[] = payPeriodsData.map(
          (p: any) => ({
            id: p.id,
            workplaceId: p.workplaceId,
            type: p.type,
            startDate: p.startDate,
            payDate: p.payDate,
          })
        );

        const transformedSettings: Settings = settingsData
          ? {
              overtimeThreshold:
                settingsData.overtimeThreshold ??
                defaultSettings.overtimeThreshold,
              overtimeMultiplier:
                settingsData.overtimeMultiplier ??
                defaultSettings.overtimeMultiplier,
              defaultBreakMinutes:
                settingsData.defaultBreakMinutes ??
                defaultSettings.defaultBreakMinutes,
              notifications:
                settingsData.notifications ?? defaultSettings.notifications,
              darkMode: settingsData.darkMode ?? defaultSettings.darkMode,
              currency: settingsData.currency ?? defaultSettings.currency,
            }
          : defaultSettings;

        // Cache server settings to localStorage
        saveLocalSettings(transformedSettings);

        setWorkplaces(transformedWorkplaces);
        setShifts(transformedShifts);
        setPayPeriods(transformedPayPeriods);
        setSettings(transformedSettings);
      } catch (e) {
        console.error("loadAllData error:", e);
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    },
    [userId, calculateNextPayDate]
  );

  useEffect(() => {
    if (userId) loadAllData();
  }, [userId, loadAllData]);

  // ---------- Derived values ----------
  const currentWeekShifts = useMemo(() => {
    if (!shifts.length) return [];

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    return shifts.filter((shift) => {
      const shiftDate = new Date(shift.date + "T00:00:00");
      return shiftDate >= weekStart && shiftDate <= weekEnd;
    });
  }, [shifts]);

  const getDashboardData = useCallback(() => {
    if (!shifts.length || !workplaces.length) {
      return {
        totalHours: 0,
        totalPay: 0,
        totalShifts: shifts.length,
        totalWorkplaces: workplaces.length,
      };
    }

    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlyShifts = shifts.filter((s) => s.date.startsWith(currentMonth));

    let totalHours = 0;
    let totalPay = 0;

    monthlyShifts.forEach((shift) => {
      const wp = workplaces.find((w) => w.id === shift.workplaceId);
      if (!wp) return;
      totalHours += calculateShiftDuration(
        shift.startTime,
        shift.endTime,
        shift.breakMinutes
      );
      totalPay += calculateShiftPayLocal(
        shift,
        wp.payRate,
        settings.overtimeThreshold,
        settings.overtimeMultiplier
      );
    });

    return {
      totalHours: Math.round(totalHours * 100) / 100,
      totalPay: Math.round(totalPay * 100) / 100,
      totalShifts: shifts.length,
      totalWorkplaces: workplaces.length,
    };
  }, [
    shifts,
    workplaces,
    settings.overtimeThreshold,
    settings.overtimeMultiplier,
  ]);

  // ---------- Collision check ----------
  const checkShiftCollision = useCallback(
    (newShift: Omit<Shift, "id">, excludeId?: string): Shift | null => {
      const newStart = new Date(`${newShift.date}T${newShift.startTime}`);
      const newEnd = new Date(`${newShift.date}T${newShift.endTime}`);

      const conflict = shifts.find((s) => {
        if (excludeId && s.id === excludeId) return false;
        if (s.date !== newShift.date) return false;

        const existingStart = new Date(`${s.date}T${s.startTime}`);
        const existingEnd = new Date(`${s.date}T${s.endTime}`);

        return newStart < existingEnd && newEnd > existingStart;
      });

      return conflict ?? null;
    },
    [shifts]
  );

  // ---------- Utility functions ----------
  const calculateShiftHours = useCallback((shift: Shift) => {
    return calculateShiftDuration(
      shift.startTime,
      shift.endTime,
      shift.breakMinutes
    );
  }, []);

  const calculateShiftEarnings = useCallback(
    (shift: Shift) => {
      const wp = workplaces.find((w) => w.id === shift.workplaceId);
      if (!wp) return 0;
      return calculateShiftPayLocal(
        shift,
        wp.payRate,
        settings.overtimeThreshold,
        settings.overtimeMultiplier
      );
    },
    [workplaces, settings.overtimeThreshold, settings.overtimeMultiplier]
  );

  const getShiftsByDateRange = useCallback(
    async (startDate: string, endDate: string, workplaceId?: string) => {
      if (!userId) return [];
      try {
        const params = new URLSearchParams({ startDate, endDate });
        if (workplaceId) params.set("workplaceId", workplaceId);

        const data = await apiFetch<any[]>(
          `/api/shifts?${params.toString()}`
        );
        return data.map((s: any) => ({
          id: s.id,
          workplaceId: s.workplaceId,
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime,
          breakMinutes: s.breakMinutes ?? undefined,
          payRateOverride: s.payRateOverride ?? undefined,
          notes: s.notes ?? undefined,
          isRecurring: s.isRecurring ?? undefined,
          recurringPattern: s.recurringPattern ?? undefined,
        }));
      } catch (e) {
        console.error("getShiftsByDateRange error:", e);
        return [];
      }
    },
    [userId]
  );

  // ---------- CRUD operations ----------
  const addWorkplace = useCallback(
    async (wp: Omit<Workplace, "id">) => {
      if (!userId) throw new Error("Not authenticated");
      try {
        const newWorkplace = await apiFetch<any>("/api/workplaces", {
          method: "POST",
          body: JSON.stringify({
            name: wp.name,
            payRate: wp.payRate,
            color: wp.color,
            timezone: wp.timezone || null,
            address: wp.address || null,
            taxRate: wp.taxRate ?? null,
          }),
        });

        const workplaceForState: Workplace = {
          id: newWorkplace.id,
          name: newWorkplace.name,
          payRate: newWorkplace.payRate,
          color: newWorkplace.color,
          timezone: newWorkplace.timezone ?? undefined,
          address: newWorkplace.address ?? undefined,
          taxRate: newWorkplace.taxRate ?? undefined,
          payPeriodType: wp.payPeriodType,
          nextPayDate: wp.nextPayDate,
        };

        setWorkplaces((prev) => [...prev, workplaceForState]);

        // Create a pay period if user provided nextPayDate and type
        if (wp.payPeriodType && wp.nextPayDate) {
          const startDate = calculatePeriodStartDate(
            wp.payPeriodType,
            wp.nextPayDate
          );
          await addPayPeriod({
            workplaceId: newWorkplace.id,
            type: wp.payPeriodType,
            startDate,
            payDate: wp.nextPayDate,
          });
        }
      } catch (e) {
        console.error("addWorkplace error:", e);
        setError("Failed to add workplace");
      }
    },
    [userId, calculatePeriodStartDate]
  );

  const updateWorkplace = useCallback(
    async (id: string, updates: Partial<Workplace>) => {
      if (!userId) throw new Error("Not authenticated");
      try {
        await apiFetch(`/api/workplaces/${id}`, {
          method: "PUT",
          body: JSON.stringify({
            name: updates.name,
            payRate: updates.payRate,
            color: updates.color,
            timezone: updates.timezone ?? null,
            address: updates.address ?? null,
            taxRate: updates.taxRate ?? null,
          }),
        });

        setWorkplaces((prev) =>
          prev.map((w) => (w.id === id ? { ...w, ...updates } : w))
        );

        // Create or update pay period if pay settings changed
        if (updates.payPeriodType && updates.nextPayDate) {
          const existingPayPeriod = payPeriods.find(
            (p) => p.workplaceId === id
          );
          const startDate = calculatePeriodStartDate(
            updates.payPeriodType,
            updates.nextPayDate
          );

          if (existingPayPeriod) {
            await updatePayPeriod(existingPayPeriod.id, {
              type: updates.payPeriodType,
              startDate,
              payDate: updates.nextPayDate,
            });
          } else {
            await addPayPeriod({
              workplaceId: id,
              type: updates.payPeriodType,
              startDate,
              payDate: updates.nextPayDate,
            });
          }
        }
      } catch (e) {
        console.error("updateWorkplace error:", e);
        setError("Failed to update workplace");
      }
    },
    [userId, payPeriods, calculatePeriodStartDate]
  );

  const deleteWorkplace = useCallback(
    async (id: string) => {
      if (!userId) throw new Error("Not authenticated");
      try {
        await apiFetch(`/api/workplaces/${id}`, { method: "DELETE" });
        setWorkplaces((p) => p.filter((w) => w.id !== id));
        setShifts((s) => s.filter((s) => s.workplaceId !== id));
        setPayPeriods((p) => p.filter((p) => p.workplaceId !== id));
      } catch (e) {
        console.error("deleteWorkplace error:", e);
        setError("Failed to delete workplace");
      }
    },
    [userId]
  );

  const addShift = useCallback(
    async (sh: Omit<Shift, "id">) => {
      if (!userId) throw new Error("Not authenticated");
      try {
        const newShift = await apiFetch<any>("/api/shifts", {
          method: "POST",
          body: JSON.stringify({
            workplaceId: sh.workplaceId,
            date: sh.date,
            startTime: sh.startTime,
            endTime: sh.endTime,
            breakMinutes: sh.breakMinutes ?? null,
            payRateOverride: sh.payRateOverride ?? null,
            notes: sh.notes ?? null,
            isRecurring: sh.isRecurring ?? null,
            recurringPattern: sh.recurringPattern ?? null,
          }),
        });

        const shiftForState: Shift = {
          id: newShift.id,
          workplaceId: newShift.workplaceId,
          date: newShift.date,
          startTime: newShift.startTime,
          endTime: newShift.endTime,
          breakMinutes: newShift.breakMinutes ?? undefined,
          payRateOverride: newShift.payRateOverride ?? undefined,
          notes: newShift.notes ?? undefined,
          isRecurring: newShift.isRecurring ?? undefined,
          recurringPattern: newShift.recurringPattern ?? undefined,
        };

        setShifts((prev) => [shiftForState, ...prev]);
      } catch (e) {
        console.error("addShift error:", e);
        setError("Failed to add shift");
      }
    },
    [userId]
  );

  const addShifts = useCallback(
    async (shiftsToAdd: Omit<Shift, "id">[]) => {
      if (!userId) throw new Error("Not authenticated");
      try {
        const payload = shiftsToAdd.map((s) => ({
          workplaceId: s.workplaceId,
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime,
          breakMinutes: s.breakMinutes ?? null,
          payRateOverride: s.payRateOverride ?? null,
          notes: s.notes ?? null,
          isRecurring: s.isRecurring ?? null,
          recurringPattern: s.recurringPattern ?? null,
        }));

        const newShifts = await apiFetch<any[]>("/api/shifts", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        const shiftsForState: Shift[] = newShifts.map((s: any) => ({
          id: s.id,
          workplaceId: s.workplaceId,
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime,
          breakMinutes: s.breakMinutes ?? undefined,
          payRateOverride: s.payRateOverride ?? undefined,
          notes: s.notes ?? undefined,
          isRecurring: s.isRecurring ?? undefined,
          recurringPattern: s.recurringPattern ?? undefined,
        }));

        setShifts((prev) => [...shiftsForState, ...prev]);
      } catch (e) {
        console.error("addShifts error:", e);
        setError("Failed to add multiple shifts");
      }
    },
    [userId]
  );

  const updateShift = useCallback(
    async (id: string, updates: Partial<Shift>) => {
      if (!userId) throw new Error("Not authenticated");
      try {
        await apiFetch(`/api/shifts/${id}`, {
          method: "PUT",
          body: JSON.stringify({
            workplaceId: updates.workplaceId,
            date: updates.date,
            startTime: updates.startTime,
            endTime: updates.endTime,
            breakMinutes: updates.breakMinutes ?? null,
            payRateOverride: updates.payRateOverride ?? null,
            notes: updates.notes ?? null,
            isRecurring: updates.isRecurring ?? null,
            recurringPattern: updates.recurringPattern ?? null,
          }),
        });

        setShifts((prev) =>
          prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
        );
      } catch (e) {
        console.error("updateShift error:", e);
        setError("Failed to update shift");
      }
    },
    [userId]
  );

  const deleteShift = useCallback(
    async (id: string) => {
      if (!userId) throw new Error("Not authenticated");
      try {
        await apiFetch(`/api/shifts/${id}`, { method: "DELETE" });
        setShifts((prev) => prev.filter((s) => s.id !== id));
      } catch (e) {
        console.error("deleteShift error:", e);
        setError("Failed to delete shift");
      }
    },
    [userId]
  );

  const addPayPeriod = useCallback(
    async (pp: Omit<PayPeriod, "id">) => {
      if (!userId) throw new Error("Not authenticated");
      try {
        const newPayPeriod = await apiFetch<any>("/api/pay-periods", {
          method: "POST",
          body: JSON.stringify({
            workplaceId: pp.workplaceId,
            type: pp.type,
            startDate: pp.startDate,
            payDate: pp.payDate,
          }),
        });

        const payPeriodForState: PayPeriod = {
          id: newPayPeriod.id,
          workplaceId: newPayPeriod.workplaceId,
          type: newPayPeriod.type,
          startDate: newPayPeriod.startDate,
          payDate: newPayPeriod.payDate,
        };

        setPayPeriods((prev) => [...prev, payPeriodForState]);
      } catch (e) {
        console.error("addPayPeriod error:", e);
        setError("Failed to add pay period");
      }
    },
    [userId]
  );

  const updatePayPeriod = useCallback(
    async (id: string, updates: Partial<PayPeriod>) => {
      if (!userId) throw new Error("Not authenticated");
      try {
        await apiFetch(`/api/pay-periods/${id}`, {
          method: "PUT",
          body: JSON.stringify({
            type: updates.type,
            startDate: updates.startDate,
            payDate: updates.payDate,
          }),
        });

        setPayPeriods((prev) =>
          prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
        );
      } catch (e) {
        console.error("updatePayPeriod error:", e);
        setError("Failed to update pay period");
      }
    },
    [userId]
  );

  const deletePayPeriod = useCallback(
    async (id: string) => {
      if (!userId) throw new Error("Not authenticated");
      try {
        await apiFetch(`/api/pay-periods/${id}`, { method: "DELETE" });
        setPayPeriods((prev) => prev.filter((p) => p.id !== id));
      } catch (e) {
        console.error("deletePayPeriod error:", e);
        setError("Failed to delete pay period");
      }
    },
    [userId]
  );

  const updateSettings = useCallback(
    async (up: Partial<Settings>) => {
      const newS = { ...settings, ...up };

      // 1. Update state immediately (instant UI response)
      setSettings(newS);

      // 2. Save to localStorage (instant, survives refresh)
      saveLocalSettings(newS);

      // 3. Sync to database in background (don't block UI)
      if (userId) {
        try {
          await apiFetch("/api/settings", {
            method: "PUT",
            body: JSON.stringify({
              overtimeThreshold: newS.overtimeThreshold,
              overtimeMultiplier: newS.overtimeMultiplier,
              defaultBreakMinutes: newS.defaultBreakMinutes,
              notifications: newS.notifications,
              darkMode: newS.darkMode,
              currency: newS.currency,
            }),
          });
        } catch (e) {
          // DB sync failed — that's OK, localStorage has the data
          // It'll sync next time loadAllData runs successfully
          console.error("Settings DB sync failed (localStorage saved):", e);
        }
      }
    },
    [userId, settings]
  );

  // ---------- Exposed API ----------
  return {
    user: session?.user ?? null,
    userId,
    loading: loading || status === "loading",
    error,
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
    addPayPeriod,
    updatePayPeriod,
    deletePayPeriod,
    updateSettings,
    currentWeekShifts,
    checkShiftCollision,
    calculateNextPayDate,
    calculateShiftHours,
    calculateShiftEarnings,
    getShiftsByDateRange,
    getDashboardData,
    loadAllData,
  } as const;
}