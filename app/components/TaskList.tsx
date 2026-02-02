"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { STATUS_LABEL, statusBadgeOutlineClass } from "@/lib/status";
import type { PriorityValue } from "@/lib/priority";
import { getPriorityLabel, priorityBadgeClass } from "@/lib/priority";

type Task = {
  id: string;
  title: string;
  type: string;
  status: string;
  priority?: number | null;
  dueDatetime?: string | null;
  color?: string | null;
  createdAt?: string;
  timeTracks?: { id: string; startTime: string; endTime: string | null }[];
};

import type { FilterStatus, FilterPriority } from "./FilterCard";

/** ยังเป็นวันนี้ไหม (client) — เริ่มจับเวลาได้เฉพาะวันนี้ */
function isStillToday(): boolean {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  return now >= startOfToday && now < startOfTomorrow;
}

/** จับเวลาได้เมื่อถึงวัน due หรือ (ไม่มี due = วันนี้เท่านั้น) */
function canStartTracking(task: Task): boolean {
  if (task.dueDatetime) {
    const due = new Date(task.dueDatetime);
    due.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now.getTime() >= due.getTime();
  }
  return isStillToday();
}

function taskRangeOverlaps(
  task: Task,
  dateFrom: string,
  dateTo: string
): boolean {
  if (!dateFrom && !dateTo) return true;
  const from = dateFrom ? new Date(dateFrom).getTime() : 0;
  const to = dateTo ? new Date(dateTo).getTime() + 86400000 : Infinity;
  const starts: number[] = [];
  const ends: number[] = [];
  if (task.createdAt) {
    starts.push(new Date(task.createdAt).getTime());
    ends.push(new Date(task.createdAt).getTime() + 3600000);
  }
  (task.timeTracks ?? []).forEach((t) => {
    starts.push(new Date(t.startTime).getTime());
    ends.push(t.endTime ? new Date(t.endTime).getTime() : Date.now());
  });
  if (starts.length === 0) return true;
  const taskStart = Math.min(...starts);
  const taskEnd = Math.max(...ends);
  return taskEnd >= from && taskStart <= to;
}

export default function TaskList({
  onStartTracking,
  refreshKey,
  statusFilter = "all",
  priorityFilter = "all",
  searchQuery = "",
  dateFrom = "",
  dateTo = "",
}: {
  onStartTracking?: (taskId: string) => void;
  refreshKey?: number;
  statusFilter?: FilterStatus;
  priorityFilter?: FilterPriority;
  searchQuery?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();

  const PAGE_SIZE = 10;

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (res.ok) setTasks(data);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [refreshKey]);

  let filtered =
    statusFilter === "all"
      ? tasks
      : tasks.filter((t) => t.status === statusFilter);
  if (priorityFilter !== "all") {
    const p = Number(priorityFilter);
    filtered = filtered.filter((t) => t.priority === p);
  }
  if (dateFrom || dateTo) {
    filtered = filtered.filter((t) => taskRangeOverlaps(t, dateFrom, dateTo));
  }
  const displayed = searchQuery.trim()
    ? filtered.filter((t) =>
        t.title.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : filtered;

  // เรียงจาก createdAt ล่าสุดก่อน แล้วแบ่งหน้า 10 รายการ
  const sorted = [...displayed].sort(
    (a, b) =>
      new Date(b.createdAt ?? 0).getTime() -
      new Date(a.createdAt ?? 0).getTime()
  );
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const pageTasks = sorted.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, priorityFilter, searchQuery, dateFrom, dateTo]);

  const handleStartTracking = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task && !canStartTracking(task)) {
      alert(task.dueDatetime ? "สามารถจับเวลาได้เมื่อถึงวันครบกำหนด (due)" : "เริ่มจับเวลาได้เฉพาะวันนี้เท่านั้น");
      return;
    }
    setStartingId(taskId);
    try {
      const res = await fetch("/api/time-tracks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "เริ่มจับเวลาไม่สำเร็จ");
      if (onStartTracking) onStartTracking(taskId);
      else router.push("/tracking");
    } catch (e) {
      alert(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setStartingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <span className="loading loading-spinner loading-md text-primary" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <p className="text-sm text-base-content/70 py-2">
        ยังไม่มี Task สร้าง Task ใหม่แล้วกดจับเวลาได้
      </p>
    );
  }

  if (displayed.length === 0) {
    return (
      <p className="text-sm text-base-content/70 py-2">
        ไม่มี Task ตามตัวกรอง
      </p>
    );
  }

  const openEditModal = (taskId: string) => {
    window.dispatchEvent(
      new CustomEvent("open-task-modal", { detail: { mode: "edit", taskId } })
    );
  };

  return (
    <>
    <ul className="space-y-2">
      {pageTasks.map((task) => (
        <li
          key={task.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-base-200/80 px-3 py-2.5 border-l-4 shadow-sm"
          style={{
            borderLeftColor: task.color || "transparent",
          }}
        >
          <button
            type="button"
            className="min-w-0 flex-1 text-left hover:opacity-80 transition-opacity"
            onClick={() => openEditModal(task.id)}
          >
            <span className="font-medium truncate block">{task.title}</span>
            <div className="flex flex-wrap gap-1 mt-1">
              <span
                className={`badge badge-sm ${statusBadgeOutlineClass(task.status)}`}
              >
                {STATUS_LABEL[task.status] ?? task.status}
              </span>
              <span
                className={`badge badge-sm ${priorityBadgeClass((task.priority ?? undefined) as PriorityValue)}`}
                title="ความสำคัญ"
              >
                {getPriorityLabel((task.priority ?? undefined) as PriorityValue)}
              </span>
            </div>
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              handleStartTracking(task.id);
            }}
            disabled={!!startingId || !canStartTracking(task)}
            title={
              !canStartTracking(task)
                ? task.dueDatetime
                  ? "จับเวลาได้เมื่อถึงวันครบกำหนด (due)"
                  : "เริ่มจับเวลาได้เฉพาะวันนี้เท่านั้น"
                : undefined
            }
          >
            {startingId === task.id ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              "จับเวลา"
            )}
          </button>
        </li>
      ))}
    </ul>
    {totalPages > 1 && (
      <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-base-300">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={safePage <= 1}
        >
          ก่อนหน้า
        </button>
        <span className="text-sm text-base-content/70">
          หน้า {safePage} / {totalPages}
        </span>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={safePage >= totalPages}
        >
          ถัดไป
        </button>
      </div>
    )}
    </>
  );
}
