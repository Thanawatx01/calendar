"use client";

import { useEffect, useState, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import thLocale from "@fullcalendar/core/locales/th";
import type { EventClickArg, EventContentArg } from "@fullcalendar/core";
import { STATUS_LABEL, statusBadgeOutlineClass } from "@/lib/status";
import type { PriorityValue } from "@/lib/priority";
import { getPriorityLabel, priorityBadgeClass } from "@/lib/priority";
import { formatTotalDuration } from "@/lib/format";
import type { FilterStatus, FilterPriority } from "./FilterCard";

type Task = {
  id: string;
  title: string;
  status: string;
  priority?: number | null;
  color?: string | null;
  startDatetime?: string | null;
  endDatetime?: string | null;
  dueDatetime?: string | null;
  createdAt: string;
  timeTracks: {
    id: string;
    startTime: string;
    endTime: string | null;
    durationSeconds?: number | null;
  }[];
};

type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay?: boolean;
  backgroundColor?: string;
  borderColor?: string;
  extendedProps?: {
    taskId: string;
    status: string;
    priority?: number | null;
    timeSummary: string;
    totalDurationSummary: string;
  };
};

function isSameCalendarDay(startIso: string, endIso: string): boolean {
  const a = new Date(startIso);
  const b = new Date(endIso);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatTimeRange(startIso: string, endIso: string): string {
  const startDate = new Date(startIso);
  const endDate = new Date(endIso);
  const timeOpts: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  };
  const dateOpts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
  };
  if (isSameCalendarDay(startIso, endIso)) {
    return `${startDate.toLocaleTimeString("th-TH", timeOpts)} – ${endDate.toLocaleTimeString("th-TH", timeOpts)}`;
  }
  return `${startDate.toLocaleDateString("th-TH", dateOpts)} ${startDate.toLocaleTimeString("th-TH", timeOpts)} – ${endDate.toLocaleDateString("th-TH", dateOpts)} ${endDate.toLocaleTimeString("th-TH", timeOpts)}`;
}

function taskToSingleEvent(task: Task): CalendarEvent | null {
  const status = task.status || "pending";
  const color = task.color ?? "#3b82f6";

  const hasTimeTracks = task.timeTracks.length > 0;
  let startMs: number;
  let endMs: number;

  if (hasTimeTracks) {
    // ช่วงเวลา 16:24–17:24 = start_time ของ record แรกสุด กับ end_time ของ record สุดท้าย
    const trackStarts = task.timeTracks.map((t) => new Date(t.startTime).getTime());
    const trackEnds = task.timeTracks.map((t) =>
      t.endTime ? new Date(t.endTime).getTime() : Date.now()
    );
    startMs = Math.min(...trackStarts);
    endMs = Math.max(...trackEnds);
  } else {
    const taskStart = task.startDatetime ?? task.dueDatetime ?? task.createdAt;
    if (!taskStart) return null;
    startMs = new Date(taskStart).getTime();
    endMs = task.endDatetime
      ? new Date(task.endDatetime).getTime()
      : startMs + 60 * 60 * 1000;
  }

  const startIso = new Date(startMs).toISOString();
  const endIso = new Date(endMs).toISOString();
  const timeSummary = formatTimeRange(startIso, endIso);

  // "รวม" = ผลรวม durationSeconds ของทุก time track
  let totalSeconds = 0;
  task.timeTracks.forEach((track) => {
    if (track.durationSeconds != null) {
      totalSeconds += track.durationSeconds;
    } else if (track.endTime) {
      totalSeconds += Math.round(
        (new Date(track.endTime).getTime() - new Date(track.startTime).getTime()) / 1000
      );
    } else {
      totalSeconds += Math.round((Date.now() - new Date(track.startTime).getTime()) / 1000);
    }
  });
  const totalDurationSummary = totalSeconds > 0 ? formatTotalDuration(totalSeconds) : "";

  return {
    id: `task-${task.id}`,
    title: task.title,
    start: startIso,
    end: endIso,
    backgroundColor: color,
    borderColor: color,
    extendedProps: {
      taskId: task.id,
      status,
      priority: task.priority ?? null,
      timeSummary,
      totalDurationSummary,
    },
  };
}

function filterTasks(
  tasks: Task[],
  statusFilter: FilterStatus,
  priorityFilter: FilterPriority,
  searchQuery: string,
  dateFrom: string,
  dateTo: string
): Task[] {
  let list = tasks;
  if (statusFilter !== "all") {
    list = list.filter((t) => t.status === statusFilter);
  }
  if (priorityFilter !== "all") {
    const p = Number(priorityFilter);
    list = list.filter((t) => t.priority === p);
  }
  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    list = list.filter((t) => t.title.toLowerCase().includes(q));
  }
  if (dateFrom || dateTo) {
    const from = dateFrom ? new Date(dateFrom).getTime() : 0;
    const to = dateTo ? new Date(dateTo).getTime() + 86400000 : Infinity;
    list = list.filter((t) => {
      const ev = taskToSingleEvent(t);
      if (!ev) return false;
      const evStart = new Date(ev.start).getTime();
      const evEnd = new Date(ev.end).getTime();
      return evEnd >= from && evStart <= to;
    });
  }
  return list;
}

export default function FullCalendarView({
  statusFilter,
  priorityFilter,
  searchQuery,
  dateFrom,
  dateTo,
}: {
  statusFilter: FilterStatus;
  priorityFilter: FilterPriority;
  searchQuery: string;
  dateFrom: string;
  dateTo: string;
}) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      const tasks: Task[] = await res.json();
      if (!res.ok) throw new Error("โหลดไม่สำเร็จ");
      const filtered = filterTasks(
        tasks,
        statusFilter,
        priorityFilter,
        searchQuery,
        dateFrom,
        dateTo
      );
      const all = filtered
        .map((t) => taskToSingleEvent(t))
        .filter((e): e is CalendarEvent => e != null);
      setEvents(all);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, searchQuery, dateFrom, dateTo]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    const onTasksUpdated = () => fetchEvents();
    window.addEventListener("tasks-updated", onTasksUpdated);
    return () => window.removeEventListener("tasks-updated", onTasksUpdated);
  }, [fetchEvents]);

  const handleDatesSet = () => {
    fetchEvents();
  };

  const handleEventClick = (arg: EventClickArg) => {
    arg.jsEvent.preventDefault();
    const taskId = arg.event.extendedProps?.taskId;
    if (taskId) {
      window.dispatchEvent(
        new CustomEvent("open-task-modal", { detail: { mode: "edit", taskId } })
      );
    }
  };

  const handleDateSelect = () => {
    window.dispatchEvent(
      new CustomEvent("open-task-modal", {
        detail: { mode: "create" },
      })
    );
  };

  const renderEventContent = (arg: EventContentArg) => {
    const status = (arg.event.extendedProps?.status as string) || "pending";
    const label = STATUS_LABEL[status] ?? status;
    const badgeClass = statusBadgeOutlineClass(status);
    const priority = arg.event.extendedProps?.priority as PriorityValue;
    const priorityLabel = getPriorityLabel(priority);
    const priorityBadge = priorityBadgeClass(priority);
    const title = arg.event.title;
    const timeSummary =
      (arg.event.extendedProps?.timeSummary as string) || "";
    const totalDurationSummary =
      (arg.event.extendedProps?.totalDurationSummary as string) || "";
    return {
      html: `<div class="fc-event-main-frame flex flex-col gap-0.5 p-1 min-w-0 overflow-hidden">
        <div class="flex items-center gap-1.5 flex-wrap min-w-0">
          <span class="truncate font-medium min-w-0">${escapeHtml(title)}</span>
          <span class="badge badge-xs ${badgeClass} shrink-0">${escapeHtml(label)}</span>
          <span class="badge badge-xs ${priorityBadge} shrink-0">${escapeHtml(priorityLabel)}</span>
        </div>
        ${timeSummary ? `<div class="text-[10px] opacity-80 break-all min-w-0 overflow-hidden">${escapeHtml(timeSummary)}</div>` : ""}
        ${totalDurationSummary ? `<div class="text-[10px] opacity-80 break-all min-w-0 overflow-hidden">${escapeHtml(totalDurationSummary)}</div>` : ""}
      </div>`,
    };
  };

  return (
    <div className="fc-wrapper fc-calendar-round rounded-2xl overflow-hidden bg-base-100 p-4 shadow-xl relative border border-base-200/80">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-base-100/80 rounded-xl">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      )}
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
        }}
        buttonText={{
          today: "วันนี้",
          month: "เดือน",
          week: "สัปดาห์",
          day: "วัน",
          list: "รายการ",
        }}
        locale={thLocale}
        events={events}
        eventDisplay="block"
        editable={false}
        selectable
        selectMirror
        dayMaxEvents
        weekends
        datesSet={handleDatesSet}
        eventClick={handleEventClick}
        select={handleDateSelect}
        eventContent={renderEventContent}
        height="auto"
        contentHeight="calc(100vh - 10rem)"
        slotMinTime="06:00:00"
        slotMaxTime="22:00:00"
      />
    </div>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
