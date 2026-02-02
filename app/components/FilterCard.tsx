"use client";

import { STATUS_LABEL } from "@/lib/status";
import { PRIORITY_LABEL } from "@/lib/priority";

export type FilterStatus = "all" | "pending" | "in_progress" | "success";
export type FilterPriority = "all" | "1" | "2" | "3";

export default function FilterCard({
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  searchQuery,
  onSearchChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}: {
  statusFilter: FilterStatus;
  onStatusFilterChange: (v: FilterStatus) => void;
  priorityFilter: FilterPriority;
  onPriorityFilterChange: (v: FilterPriority) => void;
  searchQuery: string;
  onSearchChange: (v: string) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
}) {
  return (
    <div className="rounded-xl border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-sm font-medium text-base-content/80">ตัวกรอง:</span>
        <div className="flex flex-wrap gap-2">
          {(["all", "pending", "in_progress", "success"] as const).map(
            (key) => (
              <button
                key={key}
                type="button"
                onClick={() => onStatusFilterChange(key)}
                className={`btn btn-sm ${
                  statusFilter === key ? "btn-primary" : "btn-ghost"
                }`}
              >
                {key === "all" ? "ทั้งหมด" : STATUS_LABEL[key]}
              </button>
            )
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-base-content/60 self-center">ความสำคัญ:</span>
          {(["all", "1", "2", "3"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => onPriorityFilterChange(key)}
              className={`btn btn-sm ${
                priorityFilter === key ? "btn-primary" : "btn-ghost"
              }`}
            >
              {key === "all" ? "ทั้งหมด" : PRIORITY_LABEL[Number(key)]}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-base-content/60">วันที่:</span>
          <input
            type="date"
            className="input input-bordered input-sm w-[140px]"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            title="จากวันที่"
          />
          <span className="text-base-content/50">–</span>
          <input
            type="date"
            className="input input-bordered input-sm w-[140px]"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            title="ถึงวันที่"
          />
        </div>
        <div className="flex-1 min-w-[160px]">
          <input
            type="search"
            placeholder="ค้นหาชื่อ task..."
            className="input input-bordered input-sm w-full max-w-xs"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
