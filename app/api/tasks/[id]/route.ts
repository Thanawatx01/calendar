import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { CURRENT_USER_ID } from "@/lib/auth-placeholder";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const prisma = getPrisma();
    const { id } = await params;
    const task = await prisma.task.findFirst({
      where: { id, userId: CURRENT_USER_ID },
      include: { timeTracks: { orderBy: { startTime: "desc" } } },
    });
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
    const prisma = getPrisma();
    const { id } = await params;
    const task = await prisma.task.findFirst({
      where: { id, userId: CURRENT_USER_ID },
      include: { _count: { select: { timeTracks: true } } },
    });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

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
      task._count.timeTracks > 0
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

    const updated = await prisma.task.update({
      where: { id },
      data: {
        ...(typeof title === "string" && title.trim() && { title: title.trim() }),
        ...(description !== undefined && { description: description === "" ? null : String(description) }),
        ...(newStatus && { status: newStatus }),
        ...(priority !== undefined && { priority: priority === "" ? null : Number(priority) }),
        ...(color !== undefined && { color: color === "" ? null : String(color) }),
        ...(dueDatetimeStr !== undefined && {
          dueDatetime: dueDatetimeStr === "" ? null : new Date(dueDatetimeStr as string),
        }),
      },
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
    const prisma = getPrisma();
    const { id } = await params;
    const task = await prisma.task.findFirst({
      where: { id, userId: CURRENT_USER_ID },
    });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
