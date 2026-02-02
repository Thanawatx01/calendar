export const STATUS_LABEL: Record<string, string> = {
  pending: "รอดำเนินการ",
  in_progress: "กำลังทำ",
  success: "สำเร็จ",
};

export type StatusVariant = "pending" | "in_progress" | "success";

export function statusBadgeClass(status: string): string {
  switch (status) {
    case "pending":
      return "badge-warning";
    case "in_progress":
      return "badge-error";
    case "success":
      return "badge-success";
    default:
      return "badge-ghost";
  }
}

/** คลาส badge แบบ border (outline) สำหรับสถานะ */
export function statusBadgeOutlineClass(status: string): string {
  return `badge-outline ${statusBadgeClass(status)}`;
}
