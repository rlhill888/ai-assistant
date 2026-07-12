import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/auth";
import { createScheduledItem, listScheduledItems } from "@/lib/supabase/scheduledItems";
import type { ScheduledItem } from "@/lib/types";

const VALID_FREQUENCIES = [
  "daily",
  "weekly",
  "biweekly",
  "monthly",
  "yearly",
  "custom",
];

export function isValidScheduledItem(body: unknown): body is ScheduledItem {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;

  if (typeof b.id !== "string" || !b.id) return false;
  if (typeof b.title !== "string" || !b.title) return false;
  if (typeof b.date !== "string" || !b.date) return false;
  if (typeof b.allDay !== "boolean") return false;
  if (b.startTime !== undefined && typeof b.startTime !== "string") return false;
  if (b.endTime !== undefined && typeof b.endTime !== "string") return false;
  if (b.notes !== undefined && typeof b.notes !== "string") return false;

  if (b.recurrence !== undefined) {
    if (typeof b.recurrence !== "object" || b.recurrence === null) return false;
    const r = b.recurrence as Record<string, unknown>;
    if (
      typeof r.frequency !== "string" ||
      !VALID_FREQUENCIES.includes(r.frequency)
    ) {
      return false;
    }
  }

  return true;
}

export async function GET() {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const items = await listScheduledItems(auth.supabase);
    return NextResponse.json({ items }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Failed to load scheduled items" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isValidScheduledItem(body)) {
    return NextResponse.json({ error: "Invalid scheduled item" }, { status: 400 });
  }

  try {
    const item = await createScheduledItem(auth.supabase, auth.user.id, body);
    return NextResponse.json({ item }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create scheduled item" },
      { status: 500 }
    );
  }
}
