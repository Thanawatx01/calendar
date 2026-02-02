import { NextResponse } from "next/server";
import { getTasks, createTask } from "@/lib/supabase-db";
import { CURRENT_USER_ID } from "@/lib/auth-placeholder";

export async function GET() {
  try {
    const tasks = await getTasks(CURRENT_USER_ID);
    return NextResponse.json(tasks);
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : "Failed to fetch tasks";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    let body: {
      type?: string;
      title?: string;
      description?: string;
      startDatetime?: string;
      endDatetime?: string;
      dueDatetime?: string;
      isAllDay?: boolean;
      status?: string;
      priority?: number;
      color?: string;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }
    const {
      type,
      title,
      description,
      startDatetime,
      endDatetime,
      dueDatetime,
      isAllDay,
      status,
      priority,
      color,
    } = body;

    if (!type || !title) {
      return NextResponse.json(
        { error: "type and title are required" },
        { status: 400 }
      );
    }

    if (!["event", "todo"].includes(type)) {
      return NextResponse.json(
        { error: "type must be 'event' or 'todo'" },
        { status: 400 }
      );
    }

    const validStatus = ["pending", "in_progress", "success"];
    const taskStatus =
      status && typeof status === "string" && validStatus.includes(status)
        ? status
        : "pending";

    const task = await createTask({
      userId: CURRENT_USER_ID,
      type,
      title,
      description: description ?? null,
      startDatetime: startDatetime ?? null,
      endDatetime: endDatetime ?? null,
      dueDatetime: dueDatetime ?? null,
      isAllDay: isAllDay ?? false,
      status: taskStatus,
      priority: priority ?? null,
      color: color ?? null,
    });

    return NextResponse.json(task);
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : "Failed to create task";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
