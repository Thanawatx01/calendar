"use client";

import { useState, useEffect, useRef } from "react";
import FullCalendarView from "./FullCalendar";
import CreateTaskSection from "./CreateTaskSection";
import FilterCard from "./FilterCard";
import SummaryCards from "./SummaryCards";
import type { FilterStatus, FilterPriority } from "./FilterCard";
import type { CreateTaskSectionRef } from "./CreateTaskSection";

export default function HomeContent() {
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState<FilterPriority>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [modalOpen, setModalOpen] = useState<Parameters<CreateTaskSectionRef["openModal"]>[0] | null>(null);
  const sectionRef = useRef<CreateTaskSectionRef | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setModalOpen(detail ?? undefined);
    };
    window.addEventListener("open-task-modal", handler);
    return () => window.removeEventListener("open-task-modal", handler);
  }, []);

  useEffect(() => {
    if (modalOpen === null) return;
    const id = setTimeout(() => {
      if (sectionRef.current) {
        sectionRef.current.openModal(modalOpen ?? undefined);
      }
      setModalOpen(null);
    }, 0);
    return () => clearTimeout(id);
  }, [modalOpen]);

  return (
    <div className="space-y-4">
      <FilterCard
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        priorityFilter={priorityFilter}
        onPriorityFilterChange={setPriorityFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
      />
      <SummaryCards />
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        <aside className="order-1">
          <div className="lg:sticky lg:top-4">
            <CreateTaskSection
              ref={sectionRef}
              statusFilter={statusFilter}
              priorityFilter={priorityFilter}
              searchQuery={searchQuery}
              dateFrom={dateFrom}
              dateTo={dateTo}
            />
          </div>
        </aside>
        <div className="order-2 min-w-0">
          <FullCalendarView
            statusFilter={statusFilter}
            priorityFilter={priorityFilter}
            searchQuery={searchQuery}
            dateFrom={dateFrom}
            dateTo={dateTo}
          />
        </div>
      </div>
    </div>
  );
}
