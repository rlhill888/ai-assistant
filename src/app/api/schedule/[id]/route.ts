import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/auth";
import { deleteScheduledItem, updateScheduledItem } from "@/lib/supabase/scheduledItems";
import { isValidScheduledItem } from "@/app/api/schedule/route";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isValidScheduledItem(body) || body.id !== id) {
    return NextResponse.json({ error: "Invalid scheduled item" }, { status: 400 });
  }

  try {
    const item = await updateScheduledItem(auth.supabase, body);
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ item }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Failed to update scheduled item" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const deleted = await deleteScheduledItem(auth.supabase, id);
    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete scheduled item" },
      { status: 500 }
    );
  }
}
