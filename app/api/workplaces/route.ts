import { NextResponse } from "next/server";
import * as workplaceCrud from "@/lib/db/queries/workplaces";
import {
  getAuthenticatedUserId,
  unauthorizedResponse,
} from "@/lib/api/auth-helpers";

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const workplaces = await workplaceCrud.getUserWorkplaces(userId);
    return NextResponse.json(workplaces);
  } catch (e) {
    console.error("GET /api/workplaces error:", e);
    return NextResponse.json(
      { error: "Failed to fetch workplaces" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const body = await req.json();
    const workplace = await workplaceCrud.createWorkplace({
      userId,
      name: body.name,
      payRate: body.payRate,
      color: body.color,
      timezone: body.timezone || null,
      address: body.address || null,
      taxRate: body.taxRate ?? null,
    });
    return NextResponse.json(workplace, { status: 201 });
  } catch (e) {
    console.error("POST /api/workplaces error:", e);
    return NextResponse.json(
      { error: "Failed to create workplace" },
      { status: 500 }
    );
  }
}