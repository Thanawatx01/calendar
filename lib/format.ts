/**
 * แสดงระยะเวลาจากหน่วยเล็กไปใหญ่: วินาที → นาที → ชม → วัน
 * ไม่ถึงนาที: "45 วินาที"
 * มีนาที: "1 นาที 32 วินาที"
 * มีชม: "1 ชม. 5 นาที 32 วินาที"
 * มีวัน: "2 วัน 3 ชม. 5 นาที 32 วินาที"
 */
export function formatDuration(seconds: number): string {
  if (seconds < 0) seconds = 0;
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts: string[] = [];
  if (s > 0 || (m === 0 && h === 0 && d === 0)) parts.push(`${s} วินาที`);
  if (m > 0) parts.push(`${m} นาที`);
  if (h > 0) parts.push(`${h} ชม.`);
  if (d > 0) parts.push(`${d} วัน`);
  return parts.reverse().join(" ");
}

/** สำหรับข้อความ "รวม X ชม. Y นาที" ในปฏิทิน - ใช้รูปแบบเดียวกัน */
export function formatTotalDuration(seconds: number): string {
  if (seconds <= 0) return "";
  return `รวม ${formatDuration(seconds)}`;
}
