import { NextResponse } from "next/server";
import { getTasks, getTimeTracks, createTimeTrack } from "@/lib/supabase-db";
import { CURRENT_USER_ID } from "@/lib/auth-placeholder";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true";

    const timeTracks = await getTimeTracks(CURRENT_USER_ID!, activeOnly);
    return NextResponse.json(timeTracks);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch time tracks" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { taskId, startTime: startTimeStr, endTime: endTimeStr, note } = body;

    if (!taskId) {
      return NextResponse.json(
        { error: "taskId is required" },
        { status: 400 }
      );
    }

    const tasks = await getTasks(CURRENT_USER_ID);
    const task = tasks.find((t) => t.id === taskId);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const isCompleted = startTimeStr && endTimeStr;
    const startTime = startTimeStr ? new Date(startTimeStr) : new Date();
    const endTime = endTimeStr ? new Date(endTimeStr) : null;

    const now = new Date();
    const isSameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();

    if (!isCompleted) {
      const taskDue = task.dueDatetime
        ? new Date(task.dueDatetime)
        : null;
      if (taskDue) {
        const dueStart = new Date(taskDue);
        dueStart.setHours(0, 0, 0, 0);
        const nowStart = new Date(now);
        nowStart.setHours(0, 0, 0, 0);
        if (nowStart.getTime() < dueStart.getTime()) {
          return NextResponse.json(
            { error: "สามารถจับเวลาได้เมื่อถึงวันครบกำหนด (due)" },
            { status: 400 }
          );
        }
      } else {
        if (!isSameDay(startTime, now)) {
          return NextResponse.json(
            {
              error:
                "ไม่สามารถเริ่มจับเวลาในวันอื่นได้ เริ่มได้เฉพาะวันนี้เท่านั้น",
            },
            { status: 400 }
          );
        }
      }
    } else {
      const durationSeconds = Math.round(
        (endTime!.getTime() - startTime.getTime()) / 1000
      );
      if (durationSeconds > 86400) {
        return NextResponse.json(
          { error: "ช่วงเวลาไม่เกิน 1 วัน (24 ชั่วโมง)" },
          { status: 400 }
        );
      }
    }

    const durationSeconds = endTime
      ? Math.round((endTime.getTime() - startTime.getTime()) / 1000)
      : null;

    const timeTrack = await createTimeTrack({
      userId: CURRENT_USER_ID!,
      taskId,
      startTime: startTime.toISOString(),
      endTime: endTime ? endTime.toISOString() : null,
      durationSeconds,
      note: note ?? null,
    });

    return NextResponse.json(timeTrack);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to start time track" },
      { status: 500 }
    );
  }
}
