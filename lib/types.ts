// ============================================
// FILE: lib/types.ts
// PATH: lib/types.ts
// NOTE: REPLACE your existing types.ts
// CHANGE: Removed payPeriodStartDate from Workplace
// ============================================

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