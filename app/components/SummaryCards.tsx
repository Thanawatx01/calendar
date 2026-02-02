"use client";

import { useEffect, useState } from "react";
import { formatDuration } from "@/lib/format";

type TimeTrack = {
  id: string;
  startTime: string;
  endTime: string | null;
  durationSeconds: number | null;
};

type Task = {
  id: string;
  title: string;
  status: string;
  timeTracks: TimeTrack[];
};

function getTodayStartEnd(): { start: number; end: number } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const end = start + 24 * 60 * 60 * 1000;
  return { start, end };
}

function getWeekStart(): number {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.getFullYear(), now.getMonth(), diff);
  monday.setHours(0, 0, 0, 0);
  return monday.getTime();
}

export default function SummaryCards() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/tasks")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setTasks(data);
      })
      .catch(() => {
        if (!cancelled) setTasks([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onUpdate = () => {
      fetch("/api/tasks")
        .then((res) => res.json())
        .then((data) => Array.isArray(data) && setTasks(data))
        .catch(() => {});
    };
    window.addEventListener("tasks-updated", onUpdate);
    return () => window.removeEventListener("tasks-updated", onUpdate);
  }, []);

  const { todaySeconds, weekSeconds, totalTasks, successCount, pendingCount, inProgressCount } =
    (() => {
      const { start: todayStart, end: todayEnd } = getTodayStartEnd();
      const weekStart = getWeekStart();

      let todaySeconds = 0;
      let weekSeconds = 0;

      tasks.forEach((task) => {
        (task.timeTracks ?? []).forEach((track) => {
          const startMs = new Date(track.startTime).getTime();
          const duration = track.durationSeconds ?? 0;
          if (startMs >= todayStart && startMs < todayEnd) {
            todaySeconds += duration;
          }
          if (startMs >= weekStart) {
            weekSeconds += duration;
          }
        });
      });

      const totalTasks = tasks.length;
      const successCount = tasks.filter((t) => t.status === "success").length;
      const pendingCount = tasks.filter((t) => t.status === "pending").length;
      const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;

      return {
        todaySeconds,
        weekSeconds,
        totalTasks,
        successCount,
        pendingCount,
        inProgressCount,
      };
    })();

  const daysInWeekSoFar = (() => {
    const now = new Date();
    const day = now.getDay();
    const mondayOffset = day === 0 ? 6 : day - 1;
    return Math.min(mondayOffset + 1, 7);
  })();
  const avgPerDaySeconds = daysInWeekSoFar > 0 ? weekSeconds / daysInWeekSoFar : 0;

  if (loading) {
    return (
      <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
        <div className="flex justify-center py-6">
          <span className="loading loading-spinner loading-md text-primary" />
        </div>
      </div>
    );
  }

  const cards = [
    {
      title: "วันนี้ทำไป",
      value: formatDuration(todaySeconds),
      sub: "เวลาที่จับวันนี้",
    },
    {
      title: "สัปดาห์นี้",
      value: formatDuration(weekSeconds),
      sub: "เวลารวมในสัปดาห์",
    },
    {
      title: "เฉลี่ยต่อวัน",
      value: formatDuration(Math.round(avgPerDaySeconds)),
      sub: "เฉลี่ยจากสัปดาห์นี้",
    },
    {
      title: "Task ทั้งหมด",
      value: totalTasks,
      sub: "รายการ",
    },
    {
      title: "เสร็จแล้ว",
      value: successCount,
      sub: "สำเร็จ",
    },
    {
      title: "รอดำเนินการ",
      value: pendingCount,
      sub: "รอ",
    },
    {
      title: "กำลังทำ",
      value: inProgressCount,
      sub: "กำลังจับเวลา",
    },
  ];

  return (
    <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-base-content/80 mb-3">สรุป</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {cards.map((card) => (
          <div
            key={card.title}
            className="rounded-lg bg-base-200/80 border border-base-300 px-3 py-2.5"
          >
            <p className="text-xs text-base-content/60 truncate" title={card.title}>
              {card.title}
            </p>
            <p className="text-lg font-semibold mt-0.5 truncate" title={String(card.value)}>
              {card.value}
            </p>
            <p className="text-[10px] text-base-content/50">{card.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
