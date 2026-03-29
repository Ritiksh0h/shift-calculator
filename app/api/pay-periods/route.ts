import { NextResponse } from "next/server";
import * as payPeriodCrud from "@/lib/db/queries/payPeriods";
import {
  getAuthenticatedUserId,
  unauthorizedResponse,
} from "@/lib/api/auth-helpers";

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const payPeriods = await payPeriodCrud.getPayPeriods(userId);
    return NextResponse.json(payPeriods);
  } catch (e) {
    console.error("GET /api/pay-periods error:", e);
    return NextResponse.json(
      { error: "Failed to fetch pay periods" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const body = await req.json();
    const payPeriod = await payPeriodCrud.createPayPeriod({
      userId,
      workplaceId: body.workplaceId,
      type: body.type,
      startDate: body.startDate,
      payDate: body.payDate,
    });
    return NextResponse.json(payPeriod, { status: 201 });
  } catch (e) {
    console.error("POST /api/pay-periods error:", e);
    return NextResponse.json(
      { error: "Failed to create pay period" },
      { status: 500 }
    );
  }
}