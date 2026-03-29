import { NextResponse } from "next/server";
import * as shiftCrud from "@/lib/db/queries/shifts";
import {
  getAuthenticatedUserId,
  unauthorizedResponse,
} from "@/lib/api/auth-helpers";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const body = await req.json();
    const shift = await shiftCrud.updateShift(params.id, userId, {
      workplaceId: body.workplaceId,
      date: body.date,
      startTime: body.startTime,
      endTime: body.endTime,
      breakMinutes: body.breakMinutes ?? null,
      payRateOverride: body.payRateOverride ?? null,
      notes: body.notes ?? null,
      isRecurring: body.isRecurring ?? null,
      recurringPattern: body.recurringPattern ?? null,
    });
    if (!shift) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }
    return NextResponse.json(shift);
  } catch (e) {
    console.error("PUT /api/shifts/[id] error:", e);
    return NextResponse.json(
      { error: "Failed to update shift" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const deleted = await shiftCrud.deleteShift(params.id, userId);
    if (!deleted) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/shifts/[id] error:", e);
    return NextResponse.json(
      { error: "Failed to delete shift" },
      { status: 500 }
    );
  }
}