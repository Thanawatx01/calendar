"use client";

import { useState, useEffect, useRef } from "react";

type TimeTrack = {
  id: string;
  startTime: string;
  task: { id: string; title: string };
};

export default function StopTrackModal({
  track,
  onClose,
  onStopped,
}: {
  track: TimeTrack;
  onClose: () => void;
  onStopped: () => void;
}) {
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/time-tracks/${track.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "หยุดไม่สำเร็จ");
      onStopped();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  return (
    <dialog ref={dialogRef} className="modal">
      <div className="modal-box">
        <h3 className="font-bold text-lg">หยุดจับเวลา</h3>
        <p className="text-base-content/80 mt-1">
          Task: <strong>{track.task.title}</strong>
        </p>
        <form onSubmit={handleSubmit} className="mt-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">หมายเหตุ (ไม่บังคับ)</span>
            </label>
            <textarea
              className="textarea textarea-bordered w-full"
              placeholder="สรุปสิ่งที่ทำ หรือหมายเหตุ..."
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          {error && (
            <div className="alert alert-error text-sm mt-2">
              <span>{error}</span>
            </div>
          )}
          <div className="modal-action">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={loading}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? "กำลังบันทึก..." : "หยุดและบันทึก"}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop bg-black/50">
        <button type="button" onClick={onClose} aria-label="ปิด">
          ปิด
        </button>
      </form>
    </dialog>
  );
}
