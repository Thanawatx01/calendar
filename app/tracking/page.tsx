"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import StopTrackModal from "../components/StopTrackModal";

type TimeTrackWithTask = {
  id: string;
  startTime: string;
  endTime: string | null;
  task: { id: string; title: string };
};

function formatElapsed(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const ss = s % 60;
  if (h > 0) return `${h}:${mm.toString().padStart(2, "0")}:${ss.toString().padStart(2, "0")}`;
  return `${mm}:${ss.toString().padStart(2, "0")}`;
}

export default function TrackingPage() {
  const [tracks, setTracks] = useState<TimeTrackWithTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [stopModalTrack, setStopModalTrack] = useState<TimeTrackWithTask | null>(null);
  const [now, setNow] = useState(Date.now());

  const fetchActive = async () => {
    try {
      const res = await fetch("/api/time-tracks?active=true");
      const data = await res.json();
      if (res.ok) setTracks(data);
    } catch {
      setTracks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActive();
  }, []);

  useEffect(() => {
    if (tracks.length === 0) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [tracks.length]);

  const handleStopped = () => {
    setStopModalTrack(null);
    fetchActive();
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">จับเวลาอยู่</h1>
        <Link href="/" className="btn btn-ghost btn-sm">
          ← กลับไปปฏิทิน
        </Link>
      </div>

      {tracks.length === 0 ? (
        <div className="rounded-box bg-base-200 p-8 text-center">
          <p className="text-base-content/80">ไม่มีรอบจับเวลาที่กำลังรันอยู่</p>
          <p className="mt-2 text-sm text-base-content/60">
            ไปที่หน้าหลัก เลือก Task แล้วกดปุ่ม &quot;จับเวลา&quot; เพื่อเริ่ม
          </p>
          <Link href="/" className="btn btn-primary mt-4">
            ไปหน้าหลัก
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {tracks.map((track) => {
            const start = new Date(track.startTime).getTime();
            const elapsed = now - start;
            return (
              <li
                key={track.id}
                className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{track.task.title}</p>
                    <p className="text-sm text-base-content/70">
                      เริ่ม {new Date(track.startTime).toLocaleString("th-TH")}
                    </p>
                    <p className="mt-1 font-mono text-lg text-primary">
                      {formatElapsed(elapsed)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-error btn-sm"
                    onClick={() => setStopModalTrack(track)}
                  >
                    หยุดจับเวลา
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {stopModalTrack && (
        <StopTrackModal
          track={stopModalTrack}
          onClose={() => setStopModalTrack(null)}
          onStopped={handleStopped}
        />
      )}
    </div>
  );
}
