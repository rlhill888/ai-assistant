import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/auth";
import {
  deleteScheduledItemOccurrence,
  updateScheduledItemOccurrence,
} from "@/lib/supabase/scheduledItems";
import type { RecurrenceOccurrenceOverride } from "@/lib/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface OccurrencePatchBody {
  occurrenceDate: string;
  fields: RecurrenceOccurrenceOverride;
}

function isValidOccurrencePatchBody(body: unknown): body is OccurrencePatchBody {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  if (typeof b.occurrenceDate !== "string" || !b.occurrenceDate) return false;
  if (typeof b.fields !== "object" || b.fields === null) return false;

  const f = b.fields as Record<string, unknown>;
  if (typeof f.title !== "string") return false;
  if (typeof f.allDay !== "boolean") return false;
  if (f.startTime !== undefined && typeof f.startTime !== "string") return false;
  if (f.endTime !== undefined && typeof f.endTime !== "string") return false;
  if (f.notes !== undefined && typeof f.notes !== "string") return false;

  return true;
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

  if (!isValidOccurrencePatchBody(body)) {
    return NextResponse.json(
      { error: "occurrenceDate and fields are required" },
      { status: 400 }
    );
  }

  try {
    const item = await updateScheduledItemOccurrence(
      auth.supabase,
      id,
      body.occurrenceDate,
      body.fields
    );
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ item }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Failed to update occurrence" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const occurrenceDate = new URL(request.url).searchParams.get("date");
  if (!occurrenceDate) {
    return NextResponse.json(
      { error: "date query parameter is required" },
      { status: 400 }
    );
  }

  try {
    const item = await deleteScheduledItemOccurrence(auth.supabase, id, occurrenceDate);
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ item }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete occurrence" },
      { status: 500 }
    );
  }
}
