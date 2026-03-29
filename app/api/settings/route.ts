import { NextResponse } from "next/server";
import * as settingsCrud from "@/lib/db/queries/settings";
import {
  getAuthenticatedUserId,
  unauthorizedResponse,
} from "@/lib/api/auth-helpers";

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const settings = await settingsCrud.getUserSettings(userId);
    return NextResponse.json(settings);
  } catch (e) {
    console.error("GET /api/settings error:", e);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const body = await req.json();
    const settings = await settingsCrud.updateSettings(userId, {
      overtimeThreshold: body.overtimeThreshold,
      overtimeMultiplier: body.overtimeMultiplier,
      defaultBreakMinutes: body.defaultBreakMinutes,
      notifications: body.notifications,
      darkMode: body.darkMode,
      currency: body.currency,
    });
    return NextResponse.json(settings);
  } catch (e) {
    console.error("PUT /api/settings error:", e);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}