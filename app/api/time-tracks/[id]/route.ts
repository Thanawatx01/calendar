import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { CURRENT_USER_ID } from "@/lib/auth-placeholder";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const prisma = getPrisma();
    const { id } = await params;
    const body = await request.json();
    const { note } = body;

    const existing = await prisma.timeTrack.findFirst({
      where: { id, userId: CURRENT_USER_ID },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Time track not found" },
        { status: 404 }
      );
    }
    if (existing.endTime) {
      return NextResponse.json(
        { error: "Time track already stopped" },
        { status: 400 }
      );
    }

    const endTime = new Date();
    const durationSeconds = Math.round(
      (endTime.getTime() - existing.startTime.getTime()) / 1000
    );

    const updated = await prisma.timeTrack.update({
      where: { id },
      data: {
        endTime,
        durationSeconds,
        note: note ?? null,
      },
      include: { task: true },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to stop time track" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const prisma = getPrisma();
    const { id } = await params;
    const existing = await prisma.timeTrack.findFirst({
      where: { id, userId: CURRENT_USER_ID },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Time track not found" },
        { status: 404 }
      );
    }
    await prisma.timeTrack.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to delete time track" },
      { status: 500 }
    );
  }
}
