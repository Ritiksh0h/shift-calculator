import { NextResponse } from "next/server";
import * as payPeriodCrud from "@/lib/db/queries/payPeriods";
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
    const payPeriod = await payPeriodCrud.updatePayPeriod(
      params.id,
      userId,
      {
        type: body.type,
        startDate: body.startDate,
        payDate: body.payDate,
      }
    );
    if (!payPeriod) {
      return NextResponse.json(
        { error: "Pay period not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(payPeriod);
  } catch (e) {
    console.error("PUT /api/pay-periods/[id] error:", e);
    return NextResponse.json(
      { error: "Failed to update pay period" },
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
    const deleted = await payPeriodCrud.deletePayPeriod(params.id, userId);
    if (!deleted) {
      return NextResponse.json(
        { error: "Pay period not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/pay-periods/[id] error:", e);
    return NextResponse.json(
      { error: "Failed to delete pay period" },
      { status: 500 }
    );
  }
}