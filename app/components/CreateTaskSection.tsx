"use client";

import { useState, useRef, useImperativeHandle, forwardRef } from "react";
import CreateTaskForm from "./CreateTaskForm";
import TaskList from "./TaskList";
import Link from "next/link";
import type { FilterStatus, FilterPriority } from "./FilterCard";

export type OpenTaskModalDetail = {
  mode: "create" | "edit";
  taskId?: string;
  startStr?: string;
  endStr?: string;
};

export type CreateTaskSectionRef = {
  openModal: (detail?: OpenTaskModalDetail) => void;
};

type CreateTaskSectionProps = {
  statusFilter?: FilterStatus;
  priorityFilter?: FilterPriority;
  searchQuery?: string;
  dateFrom?: string;
  dateTo?: string;
};

const CreateTaskSection = forwardRef<
  CreateTaskSectionRef,
  CreateTaskSectionProps
>(function CreateTaskSection(
  { statusFilter = "all", priorityFilter = "all", searchQuery = "", dateFrom = "", dateTo = "" },
  ref
) {
  const [taskListKey, setTaskListKey] = useState(0);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [prefillStart, setPrefillStart] = useState("");
  const [prefillEnd, setPrefillEnd] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);

  useImperativeHandle(ref, () => ({
    openModal(detail?: OpenTaskModalDetail) {
      if (!detail) {
        setModalMode("create");
        setEditTaskId(null);
        setPrefillStart("");
        setPrefillEnd("");
      } else {
        setModalMode(detail.mode);
        setEditTaskId(detail.taskId ?? null);
        setPrefillStart(detail.startStr ?? "");
        setPrefillEnd(detail.endStr ?? "");
      }
      dialogRef.current?.showModal();
    },
  }));

  const openModalCreate = () => {
    setModalMode("create");
    setEditTaskId(null);
    setPrefillStart("");
    setPrefillEnd("");
    dialogRef.current?.showModal();
  };

  const closeModal = () => {
    dialogRef.current?.close();
  };

  const handleSuccess = () => {
    setTaskListKey((k) => k + 1);
    closeModal();
    setEditTaskId(null);
    window.dispatchEvent(new CustomEvent("tasks-updated"));
  };

  return (
    <section className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="text-lg font-semibold">Tasks</h2>
        <div className="flex gap-2">
          <Link href="/tracking" className="btn btn-ghost btn-sm">
            จับเวลาที่รันอยู่
          </Link>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={openModalCreate}
          >
            สร้าง Task
          </button>
        </div>
      </div>
      <TaskList
        refreshKey={taskListKey}
        statusFilter={statusFilter}
        priorityFilter={priorityFilter}
        searchQuery={searchQuery}
        dateFrom={dateFrom}
        dateTo={dateTo}
      />

      <dialog ref={dialogRef} className="modal">
        <div className="modal-box max-w-xl">
          <h3 className="font-bold text-lg mb-4">
            {modalMode === "edit" ? "แก้ไข Task" : "สร้าง Task"}
          </h3>
          <CreateTaskForm
            mode={modalMode}
            editTaskId={editTaskId}
            prefillStart={prefillStart}
            prefillEnd={prefillEnd}
            onSuccess={handleSuccess}
            onCancel={closeModal}
          />
        </div>
        <form method="dialog" className="modal-backdrop bg-black/50">
          <button type="button" onClick={closeModal} aria-label="ปิด">
            ปิด
          </button>
        </form>
      </dialog>
    </section>
  );
});

export default CreateTaskSection;
