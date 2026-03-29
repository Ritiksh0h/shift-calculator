import { NextResponse } from "next/server";
import * as shiftCrud from "@/lib/db/queries/shifts";
import {
  getAuthenticatedUserId,
  unauthorizedResponse,
} from "@/lib/api/auth-helpers";

export async function GET(req: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return unauthorizedResponse();

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const workplaceId = searchParams.get("workplaceId") || undefined;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "1000");

  try {
    if (startDate && endDate) {
      const shifts = await shiftCrud.getShiftsByDateRange(
        userId,
        startDate,
        endDate,
        workplaceId
      );
      return NextResponse.json(shifts);
    }

    const shifts = await shiftCrud.getShiftsWithWorkplace(userId, page, limit);
    return NextResponse.json(shifts);
  } catch (e) {
    console.error("GET /api/shifts error:", e);
    return NextResponse.json(
      { error: "Failed to fetch shifts" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const body = await req.json();
    const shiftsToCreate = Array.isArray(body) ? body : [body];
    const createdShifts = [];

    for (const s of shiftsToCreate) {
      const shift = await shiftCrud.createShift({
        userId,
        workplaceId: s.workplaceId,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        breakMinutes: s.breakMinutes ?? null,
        payRateOverride: s.payRateOverride ?? null,
        notes: s.notes ?? null,
        isRecurring: s.isRecurring ?? null,
        recurringPattern: s.recurringPattern ?? null,
      });
      createdShifts.push(shift);
    }

    if (Array.isArray(body)) {
      return NextResponse.json(createdShifts, { status: 201 });
    }
    return NextResponse.json(createdShifts[0], { status: 201 });
  } catch (e) {
    console.error("POST /api/shifts error:", e);
    return NextResponse.json(
      { error: "Failed to create shift" },
      { status: 500 }
    );
  }
}