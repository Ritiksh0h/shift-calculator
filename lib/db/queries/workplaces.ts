import { db } from "@/lib/db"
import { eq, and, count } from "drizzle-orm"
import { workplaces, shifts } from "../schema"
import type { NewWorkplace, Workplace } from "../schema"

export const createWorkplace = async (data: NewWorkplace): Promise<Workplace> => {
  const [wp] = await db.insert(workplaces).values(data).returning()
  return wp
}

export const getUserWorkplaces = async (userId: string): Promise<Workplace[]> => {
  return db.select().from(workplaces).where(eq(workplaces.userId, userId))
}

export const getWorkplaceById = async (id: string, userId: string): Promise<Workplace | null> => {
  const [wp] = await db
    .select()
    .from(workplaces)
    .where(and(eq(workplaces.id, id), eq(workplaces.userId, userId)))
  return wp ?? null
}

export const updateWorkplace = async (
  id: string,
  userId: string,
  updates: Partial<NewWorkplace>
) => {
  const [wp] = await db
    .update(workplaces)
    .set(updates)
    .where(and(eq(workplaces.id, id), eq(workplaces.userId, userId)))
    .returning()
  return wp ?? null
}

export const deleteWorkplace = async (id: string, userId: string): Promise<boolean> => {
  const res = await db
    .delete(workplaces)
    .where(and(eq(workplaces.id, id), eq(workplaces.userId, userId)))
    .returning()
  return res.length > 0
}

export const getWorkplacesWithShiftCounts = async (userId: string) => {
  return db
    .select({
      id: workplaces.id,
      userId: workplaces.userId,
      name: workplaces.name,
      address: workplaces.address,
      createdAt: workplaces.createdAt,
      updatedAt: workplaces.updatedAt,
      shiftCount: count(shifts.id).as("shiftCount"),
    })
    .from(workplaces)
    .leftJoin(shifts, eq(workplaces.id, shifts.workplaceId))
    .where(eq(workplaces.userId, userId))
    .groupBy(workplaces.id)
}
