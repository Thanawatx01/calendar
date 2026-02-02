import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { CURRENT_USER_ID } from "@/lib/auth-placeholder";

export async function GET(request: Request) {
  try {
    const prisma = getPrisma();
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true";

    const where = { userId: CURRENT_USER_ID };
    if (activeOnly) {
      Object.assign(where, { endTime: null });
    }

    const timeTracks = await prisma.timeTrack.findMany({
      where,
      orderBy: { startTime: "desc" },
      include: { task: true },
    });

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
    const prisma = getPrisma();
    const body = await request.json();
    const { taskId, startTime: startTimeStr, endTime: endTimeStr, note } = body;

    if (!taskId) {
      return NextResponse.json(
        { error: "taskId is required" },
        { status: 400 }
      );
    }

    const task = await prisma.task.findFirst({
      where: { id: taskId, userId: CURRENT_USER_ID },
    });
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
      const taskDue = task.dueDatetime;
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
            { error: "ไม่สามารถเริ่มจับเวลาในวันอื่นได้ เริ่มได้เฉพาะวันนี้เท่านั้น" },
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

    const timeTrack = await prisma.timeTrack.create({
      data: {
        userId: CURRENT_USER_ID,
        taskId,
        startTime,
        endTime,
        durationSeconds,
        note: note ?? null,
      },
      include: { task: true },
    });

    /* ไม่เปลี่ยนสถานะ task ตอนเริ่ม/หยุดจับเวลา — แค่บันทึก time track
       task อยู่ pending / in_progress / success ตามที่ผู้ใช้ตั้งไว้ */

    return NextResponse.json(timeTrack);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to start time track" },
      { status: 500 }
    );
  }
}
