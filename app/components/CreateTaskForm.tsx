"use client";

import { useState, useEffect } from "react";
import { formatDuration as formatDurationLib } from "@/lib/format";

type TaskStatus = "pending" | "in_progress" | "success";

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "pending", label: "รอดำเนินการ" },
  { value: "in_progress", label: "กำลังทำ" },
  { value: "success", label: "สำเร็จ" },
];

const COLOR_OPTIONS: { value: string; label: string }[] = [
  { value: "#3b82f6", label: "น้ำเงิน" },
  { value: "#22c55e", label: "เขียว" },
  { value: "#eab308", label: "เหลือง" },
  { value: "#ef4444", label: "แดง" },
  { value: "#8b5cf6", label: "ม่วง" },
  { value: "#ec4899", label: "ชมพู" },
  { value: "#06b6d4", label: "ฟ้า" },
  { value: "#f97316", label: "ส้ม" },
];

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}`;
}

type TimeTrackItem = {
  id: string;
  startTime: string;
  endTime: string | null;
  durationSeconds: number | null;
  note: string | null;
};

function isSameCalendarDay(a: string, b: string): boolean {
  const d1 = new Date(a);
  const d2 = new Date(b);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/** แสดงช่วงเวลา ถ้าข้ามวันใส่วันที่ด้วย */
function formatTimeRangeDisplay(startIso: string, endIso: string | null): string {
  const startDate = new Date(startIso);
  const timeOpts: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  };
  const dateOpts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
  };
  if (!endIso) {
    return `${startDate.toLocaleDateString("th-TH", dateOpts)} ${startDate.toLocaleTimeString("th-TH", timeOpts)} – รันอยู่...`;
  }
  const endDate = new Date(endIso);
  if (isSameCalendarDay(startIso, endIso)) {
    return `${startDate.toLocaleTimeString("th-TH", timeOpts)} – ${endDate.toLocaleTimeString("th-TH", timeOpts)}`;
  }
  return `${startDate.toLocaleDateString("th-TH", dateOpts)} ${startDate.toLocaleTimeString("th-TH", timeOpts)} – ${endDate.toLocaleDateString("th-TH", dateOpts)} ${endDate.toLocaleTimeString("th-TH", timeOpts)}`;
}

export default function CreateTaskForm({
  mode = "create",
  editTaskId = null,
  prefillStart = "",
  prefillEnd = "",
  onSuccess,
  onCancel,
}: {
  mode?: "create" | "edit";
  editTaskId?: string | null;
  prefillStart?: string;
  prefillEnd?: string;
  onSuccess?: (task: { id: string; title: string }) => void;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("pending");
  const [color, setColor] = useState<string>("");
  const [priority, setPriority] = useState<number | "">("");
  const [dueDatetime, setDueDatetime] = useState("");
  const [workStartTime, setWorkStartTime] = useState("");
  const [workEndTime, setWorkEndTime] = useState("");
  const [workNote, setWorkNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadEdit, setLoadEdit] = useState(true);
  const [timeTracks, setTimeTracks] = useState<TimeTrackItem[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingTask, setDeletingTask] = useState(false);

  useEffect(() => {
    if (mode === "edit" && editTaskId) setLoadEdit(true);
  }, [mode, editTaskId]);

  useEffect(() => {
    if (prefillStart) setWorkStartTime(toDatetimeLocal(prefillStart));
    if (prefillEnd) setWorkEndTime(toDatetimeLocal(prefillEnd));
  }, [prefillStart, prefillEnd]);

  useEffect(() => {
    if (mode !== "edit" || !editTaskId || !loadEdit) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/tasks/${editTaskId}`);
        const task = await res.json();
        if (!res.ok || cancelled) return;
        setTitle(task.title ?? "");
        setDescription(task.description ?? "");
        setStatus(
          task.status && ["pending", "in_progress", "success"].includes(task.status)
            ? task.status
            : "pending"
        );
        setColor(task.color ?? "");
        setPriority(task.priority ?? "");
        setDueDatetime(task.dueDatetime ? toDatetimeLocal(task.dueDatetime) : "");
        setTimeTracks(
          (task.timeTracks ?? []).map((t: { id: string; startTime: string; endTime: string | null; durationSeconds: number | null; note: string | null }) => ({
            id: t.id,
            startTime: t.startTime,
            endTime: t.endTime,
            durationSeconds: t.durationSeconds,
            note: t.note,
          }))
        );
      } catch {
        if (!cancelled) setError("โหลด task ไม่สำเร็จ");
      } finally {
        if (!cancelled) setLoadEdit(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, editTaskId, loadEdit]);

  const refetchTaskTimeTracks = async () => {
    if (mode !== "edit" || !editTaskId) return;
    try {
      const res = await fetch(`/api/tasks/${editTaskId}`);
      const task = await res.json();
      if (res.ok && task.timeTracks) {
        setTimeTracks(
          task.timeTracks.map((t: { id: string; startTime: string; endTime: string | null; durationSeconds: number | null; note: string | null }) => ({
            id: t.id,
            startTime: t.startTime,
            endTime: t.endTime,
            durationSeconds: t.durationSeconds,
            note: t.note,
          }))
        );
      }
    } catch {
      // ignore
    }
  };

  const hasPastTime = workStartTime && workEndTime;

  const handleDeleteTask = async () => {
    if (mode !== "edit" || !editTaskId) return;
    if (!confirm("ต้องการลบ task นี้และรายการจับเวลาทั้งหมดใช่หรือไม่?")) return;
    setError("");
    setDeletingTask(true);
    try {
      const res = await fetch(`/api/tasks/${editTaskId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "ลบไม่สำเร็จ");
      onSuccess?.({ id: editTaskId, title: title });
      onCancel?.();
      window.dispatchEvent(new CustomEvent("tasks-updated"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "ลบ task ไม่สำเร็จ");
    } finally {
      setDeletingTask(false);
    }
  };

  const handleDeleteTrack = async (trackId: string) => {
    setError("");
    setDeletingId(trackId);
    try {
      const res = await fetch(`/api/time-tracks/${trackId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "ลบไม่สำเร็จ");
      await refetchTaskTimeTracks();
      window.dispatchEvent(new CustomEvent("tasks-updated"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "ลบรายการเวลาไม่สำเร็จ");
    } finally {
      setDeletingId(null);
    }
  };

  async function parseJsonRes(res: Response) {
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      const text = await res.text();
      throw new Error(
        text.startsWith("<!")
          ? "เซิร์ฟเวอร์ส่งกลับหน้า HTML แทนข้อมูล — ตรวจสอบว่า API และ DB ทำงานปกติ หรือลองรีเฟรชหน้า"
          : text || "ตอบกลับไม่ใช่ JSON"
      );
    }
    return res.json();
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (hasPastTime) {
        const start = new Date(workStartTime).getTime();
        const end = new Date(workEndTime).getTime();
        if (end <= start) {
          throw new Error("เวลาสิ้นสุดต้องหลังเวลาเริ่ม");
        }
        if (dueDatetime) {
          const dueMs = new Date(dueDatetime).getTime();
          const oneDayMs = 24 * 60 * 60 * 1000;
          const dueStart = dueMs - oneDayMs;
          const dueEnd = dueMs + oneDayMs;
          if (start < dueStart || start > dueEnd || end < dueStart || end > dueEnd) {
            throw new Error("ช่วงเวลาที่บันทึกต้องอยู่ภายใน due ± 1 วัน");
          }
        }
      }

      let taskData: { id: string; title: string };
      if (mode === "edit" && editTaskId) {
        const patchRes = await fetch(`/api/tasks/${editTaskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || undefined,
            status,
            priority: priority === "" ? undefined : priority,
            color: color || undefined,
            dueDatetime: dueDatetime || undefined,
          }),
        });
        const patchData = await parseJsonRes(patchRes) as { id?: string; title?: string; error?: string };
        if (!patchRes.ok) throw new Error(patchData.error ?? "แก้ไขไม่สำเร็จ");
        taskData = { id: patchData.id!, title: patchData.title! };
        if (hasPastTime) {
          const trackRes = await fetch("/api/time-tracks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              taskId: editTaskId,
              startTime: workStartTime,
              endTime: workEndTime,
              note: workNote.trim() || undefined,
            }),
          });
          await parseJsonRes(trackRes);
          if (!trackRes.ok) throw new Error("บันทึกเวลาย้อนหลังไม่สำเร็จ");
          await refetchTaskTimeTracks();
          setWorkStartTime("");
          setWorkEndTime("");
          setWorkNote("");
          window.dispatchEvent(new CustomEvent("tasks-updated"));
          setLoading(false);
          return;
        }
      } else {
        const taskRes = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "todo",
            title: title.trim(),
            description: description.trim() || undefined,
            status,
            priority: priority === "" ? undefined : priority,
            color: color || undefined,
            dueDatetime: dueDatetime || undefined,
          }),
        });
        const createData = await parseJsonRes(taskRes) as { id?: string; title?: string; error?: string };
        if (!taskRes.ok) throw new Error(createData.error ?? "สร้าง task ไม่สำเร็จ");
        taskData = { id: createData.id!, title: createData.title! };

        if (hasPastTime) {
          const trackRes = await fetch("/api/time-tracks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              taskId: taskData.id,
              startTime: workStartTime,
              endTime: workEndTime,
              note: workNote.trim() || undefined,
            }),
          });
          await parseJsonRes(trackRes);
          if (!trackRes.ok)
            throw new Error("บันทึกเวลาย้อนหลังไม่สำเร็จ");
        }
      }

      onSuccess?.(taskData);
      setTitle("");
      setDescription("");
      setDueDatetime("");
      setWorkStartTime("");
      setWorkEndTime("");
      setWorkNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="form-control">
        <label className="label">
          <span className="label-text">หัวข้อ *</span>
        </label>
        <input
          type="text"
          className="input input-bordered w-full"
          placeholder="ชื่อ task"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text">รายละเอียด</span>
        </label>
        <textarea
          className="textarea textarea-bordered w-full"
          placeholder="หมายเหตุ (ถ้ามี)"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text">วันครบกำหนด (due)</span>
        </label>
        <input
          type="datetime-local"
          className="input input-bordered w-full"
          value={dueDatetime}
          onChange={(e) => setDueDatetime(e.target.value)}
          disabled={timeTracks.length > 0}
          title={
            timeTracks.length > 0
              ? "ไม่สามารถเปลี่ยน due ได้เมื่อมีรายการจับเวลาแล้ว"
              : "กำหนดวันที่จะจับเวลาได้ (ว่าง = จับได้เฉพาะวันนี้)"
          }
        />
        <label className="label">
          <span className="label-text-alt text-base-content/60">
            {timeTracks.length > 0
              ? "ไม่สามารถเปลี่ยน due ได้เมื่อมีรายการจับเวลาแล้ว"
              : "กำหนดวันที่จะจับเวลาได้ ถ้าว่าง = จับได้เฉพาะวันนี้"}
          </span>
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="form-control">
          <label className="label">
            <span className="label-text">สถานะ</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskStatus)}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="form-control">
          <label className="label">
            <span className="label-text">ความสำคัญ (1–3)</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={priority === "" ? "" : priority}
            onChange={(e) =>
              setPriority(e.target.value === "" ? "" : Number(e.target.value))
            }
          >
            <option value="">ไม่ระบุ</option>
            <option value="1">1 - ต่ำ</option>
            <option value="2">2 - ปานกลาง</option>
            <option value="3">3 - สูง</option>
          </select>
        </div>
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text">สี</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {COLOR_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <input
                type="radio"
                name="color"
                className="sr-only peer"
                value={opt.value}
                checked={color === opt.value}
                onChange={() => setColor(opt.value)}
              />
              <span
                className="w-6 h-6 rounded-full border-2 border-base-300 peer-checked:border-primary"
                style={{ backgroundColor: opt.value }}
                title={opt.label}
              />
              <span className="text-xs text-base-content/70 hidden sm:inline">
                {opt.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {mode === "edit" && (
        <div className="form-control">
          <label className="label">
            <span className="label-text">รายการเวลาที่จับทั้งหมด</span>
          </label>
          {timeTracks.length === 0 ? (
            <p className="text-sm text-base-content/60 py-2">ยังไม่มีรายการจับเวลา</p>
          ) : (
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {timeTracks.map((track) => {
                const timeRangeText = formatTimeRangeDisplay(track.startTime, track.endTime);
                const duration =
                  track.durationSeconds != null
                    ? formatDurationLib(track.durationSeconds)
                    : track.endTime
                      ? formatDurationLib(
                          Math.round(
                            (new Date(track.endTime).getTime() - new Date(track.startTime).getTime()) / 1000
                          )
                        )
                      : null;
                return (
                  <li
                    key={track.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-base-200/80 px-3 py-2 text-sm border border-base-300"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-medium">{timeRangeText}</span>
                      {duration != null && (
                        <span className="text-base-content/60 ml-1"> ({duration})</span>
                      )}
                      {track.note && (
                        <p className="text-xs text-base-content/60 mt-0.5 truncate" title={track.note}>
                          {track.note}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs text-error"
                      onClick={() => handleDeleteTrack(track.id)}
                      disabled={!!deletingId}
                      aria-label="ลบรายการ"
                    >
                      {deletingId === track.id ? (
                        <span className="loading loading-spinner loading-xs" />
                      ) : (
                        "ลบ"
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <div className="divider text-sm text-base-content/60">
        บันทึกเวลาที่ทำแล้ว (ไม่บังคับ)
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="form-control">
          <label className="label">
            <span className="label-text">เวลาเริ่ม</span>
          </label>
          <input
            type="datetime-local"
            className="input input-bordered w-full"
            value={workStartTime}
            onChange={(e) => setWorkStartTime(e.target.value)}
          />
        </div>
        <div className="form-control">
          <label className="label">
            <span className="label-text">เวลาสิ้นสุด</span>
          </label>
          <input
            type="datetime-local"
            className="input input-bordered w-full"
            value={workEndTime}
            onChange={(e) => setWorkEndTime(e.target.value)}
          />
        </div>
      </div>
      <div className="form-control">
        <label className="label">
          <span className="label-text">หมายเหตุ (รอบนี้)</span>
        </label>
        <textarea
          className="textarea textarea-bordered w-full"
          placeholder="สรุปสิ่งที่ทำ..."
          rows={2}
          value={workNote}
          onChange={(e) => setWorkNote(e.target.value)}
        />
      </div>

      {error && (
        <div className="alert alert-error text-sm">
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2 justify-between">
        <div>
          {mode === "edit" && onCancel && (
            <button
              type="button"
              className="btn btn-ghost btn-sm text-error"
              onClick={handleDeleteTask}
              disabled={loading || deletingTask}
            >
              {deletingTask ? "กำลังลบ..." : "ลบ Task"}
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {onCancel && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onCancel}
              disabled={loading || deletingTask}
            >
              ยกเลิก
            </button>
          )}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || deletingTask || !title.trim()}
          >
            {loading
              ? mode === "edit"
                ? "กำลังบันทึก..."
                : "กำลังสร้าง..."
              : mode === "edit"
                ? "บันทึก"
                : "สร้าง Task"}
          </button>
        </div>
      </div>
    </form>
  );
}
