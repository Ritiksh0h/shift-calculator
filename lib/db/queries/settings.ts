import { db } from "@/lib/db"
import { settings } from "../schema"
import { eq } from "drizzle-orm"
import type { NewSettings, Settings } from "../schema"

export const getUserSettings = async (userId: string): Promise<Settings> => {
  const [s] = await db.select().from(settings).where(eq(settings.userId, userId))
  return s ?? (await createDefaultSettings(userId))
}

export const createDefaultSettings = async (userId: string): Promise<Settings> => {
  const [s] = await db.insert(settings).values({ userId }).returning()
  return s
}

export const updateSettings = async (
  userId: string,
  updates: Partial<NewSettings>
): Promise<Settings | null> => {
  const [s] = await db
    .update(settings)
    .set(updates)
    .where(eq(settings.userId, userId))
    .returning()
  return s ?? null
}
