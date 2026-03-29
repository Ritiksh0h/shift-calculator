import { Shift } from "../schema";

export const calculateShiftDuration = (
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

export const calculateShiftPay = (
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

export const getDashboardStats = (
  shifts: Shift[],
  baseRate: number,
  settings: any
) => {
  let totalHours = 0;
  let totalPay = 0;

  for (const shift of shifts) {
    const hrs = calculateShiftDuration(
      shift.startTime,
      shift.endTime,
      shift.breakMinutes ?? 0
    );
    const pay = calculateShiftPay(
      shift,
      baseRate,
      settings.overtimeThreshold,
      settings.overtimeMultiplier
    );
    totalHours += hrs;
    totalPay += pay;
  }

  return {
    totalHours: +totalHours.toFixed(2),
    totalPay: +totalPay.toFixed(2),
  };
};
