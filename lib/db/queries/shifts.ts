import { db } from "@/lib/db"
import { eq, and, gte, lte } from "drizzle-orm"
import { shifts, workplaces } from "../schema"
import type { NewShift, Shift } from "../schema"

export const createShift = async (data: NewShift): Promise<Shift> => {
  const [s] = await db.insert(shifts).values(data).returning()
  return s
}

export const getShiftById = async (id: string, userId: string): Promise<Shift | null> => {
  const [s] = await db
    .select()
    .from(shifts)
    .where(and(eq(shifts.id, id), eq(shifts.userId, userId)))
  return s ?? null
}

export const getShiftsByDateRange = async (
  userId: string,
  start: string,
  end: string,
  workplaceId?: string
): Promise<Shift[]> => {
  const whereClause = and(
    eq(shifts.userId, userId),
    gte(shifts.date, start),
    lte(shifts.date, end),
    ...(workplaceId ? [eq(shifts.workplaceId, workplaceId)] : [])
  )
  return db.select().from(shifts).where(whereClause)
}

export const getShiftsWithWorkplace = async (
  userId: string,
  page = 1,
  limit = 20
) => {
  return db
    .select({
      // Shift fields
      id: shifts.id,
      userId: shifts.userId,
      workplaceId: shifts.workplaceId,
      date: shifts.date,
      startTime: shifts.startTime,
      endTime: shifts.endTime,
      breakMinutes: shifts.breakMinutes,
      payRateOverride: shifts.payRateOverride,
      notes: shifts.notes,
      isRecurring: shifts.isRecurring,
      recurringPattern: shifts.recurringPattern,
      createdAt: shifts.createdAt,
      updatedAt: shifts.updatedAt,
      // Workplace as nested object
      workplace: {
        id: workplaces.id,
        userId: workplaces.userId,
        name: workplaces.name,
        payRate: workplaces.payRate,
        color: workplaces.color,
        timezone: workplaces.timezone,
        address: workplaces.address,
        taxRate: workplaces.taxRate,
        createdAt: workplaces.createdAt,
        updatedAt: workplaces.updatedAt,
      },
    })
    .from(shifts)
    .innerJoin(workplaces, eq(shifts.workplaceId, workplaces.id))
    .where(eq(shifts.userId, userId))
    .limit(limit)
    .offset((page - 1) * limit)
}

export const updateShift = async (
  id: string,
  userId: string,
  updates: Partial<NewShift>
): Promise<Shift | null> => {
  const [s] = await db
    .update(shifts)
    .set(updates)
    .where(and(eq(shifts.id, id), eq(shifts.userId, userId)))
    .returning()
  return s ?? null
}

export const deleteShift = async (id: string, userId: string): Promise<boolean> => {
  const res = await db
    .delete(shifts)
    .where(and(eq(shifts.id, id), eq(shifts.userId, userId)))
    .returning()
  return res.length > 0
}
