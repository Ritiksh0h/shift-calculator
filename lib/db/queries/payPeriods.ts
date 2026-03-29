import { db } from "@/lib/db"
import { payPeriods, workplaces } from "../schema"
import { eq, and, lte, gte } from "drizzle-orm"
import type { NewPayPeriod, PayPeriod } from "../schema"

export const createPayPeriod = async (data: NewPayPeriod): Promise<PayPeriod> => {
  const [p] = await db.insert(payPeriods).values(data).returning()
  return p
}

export const getPayPeriods = async (userId: string): Promise<PayPeriod[]> => {
  return db.select().from(payPeriods).where(eq(payPeriods.userId, userId))
}

export const getCurrentPayPeriod = async (
  userId: string,
  workplaceId: string,
  today: string
) => {
  const [p] = await db
    .select()
    .from(payPeriods)
    .where(
      and(
        eq(payPeriods.userId, userId),
        eq(payPeriods.workplaceId, workplaceId),
        lte(payPeriods.startDate, today),
        gte(payPeriods.payDate, today)
      )
    )
  return p ?? null
}

export const updatePayPeriod = async (
  id: string,
  userId: string,
  updates: Partial<NewPayPeriod>
) => {
  const [p] = await db
    .update(payPeriods)
    .set(updates)
    .where(and(eq(payPeriods.id, id), eq(payPeriods.userId, userId)))
    .returning()
  return p ?? null
}

export const deletePayPeriod = async (id: string, userId: string): Promise<boolean> => {
  const res = await db
    .delete(payPeriods)
    .where(and(eq(payPeriods.id, id), eq(payPeriods.userId, userId)))
  return res.length > 0
}
