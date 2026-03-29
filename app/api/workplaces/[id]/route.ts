import { NextResponse } from "next/server";
import * as workplaceCrud from "@/lib/db/queries/workplaces";
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
    const workplace = await workplaceCrud.updateWorkplace(params.id, userId, {
      name: body.name,
      payRate: body.payRate,
      color: body.color,
      timezone: body.timezone ?? null,
      address: body.address ?? null,
      taxRate: body.taxRate ?? null,
    });
    if (!workplace) {
      return NextResponse.json(
        { error: "Workplace not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(workplace);
  } catch (e) {
    console.error("PUT /api/workplaces/[id] error:", e);
    return NextResponse.json(
      { error: "Failed to update workplace" },
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
    const deleted = await workplaceCrud.deleteWorkplace(params.id, userId);
    if (!deleted) {
      return NextResponse.json(
        { error: "Workplace not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/workplaces/[id] error:", e);
    return NextResponse.json(
      { error: "Failed to delete workplace" },
      { status: 500 }
    );
  }
}