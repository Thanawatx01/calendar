import { NextResponse } from "next/server";
import {
  getTaskById,
  getTaskWithTimeTracksCount,
  updateTask,
  deleteTask,
} from "@/lib/supabase-db";
import { CURRENT_USER_ID } from "@/lib/auth-placeholder";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const task = await getTaskById(id, CURRENT_USER_ID);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    return NextResponse.json(task);
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : "Failed to fetch task";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getTaskWithTimeTracksCount(id, CURRENT_USER_ID);
    if (!result) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    const { timeTracksCount } = result;

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const {
      title,
      description,
      status,
      priority,
      color,
      dueDatetime: dueDatetimeStr,
    } = body;

    if (
      dueDatetimeStr !== undefined &&
      timeTracksCount > 0
    ) {
      return NextResponse.json(
        { error: "ไม่สามารถเปลี่ยนวันครบกำหนด (due) ได้เมื่อมีรายการจับเวลาแล้ว" },
        { status: 400 }
      );
    }

    const validStatus = ["pending", "in_progress", "success"];
    const newStatus =
      status && typeof status === "string" && validStatus.includes(status)
        ? status
        : undefined;

    const updated = await updateTask(id, CURRENT_USER_ID, {
      ...(typeof title === "string" && title.trim() && { title: title.trim() }),
      ...(description !== undefined && {
        description: description === "" ? null : String(description),
      }),
      ...(newStatus && { status: newStatus }),
      ...(priority !== undefined && {
        priority: priority === "" ? null : Number(priority),
      }),
      ...(color !== undefined && { color: color === "" ? null : String(color) }),
      ...(dueDatetimeStr !== undefined && {
        dueDatetime:
          dueDatetimeStr === ""
            ? null
            : (dueDatetimeStr as string),
      }),
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : "Failed to update task";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const task = await getTaskById(id, CURRENT_USER_ID);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    await deleteTask(id, CURRENT_USER_ID);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
