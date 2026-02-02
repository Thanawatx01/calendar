export const PRIORITY_LABEL: Record<number, string> = {
  1: "ต่ำ",
  2: "ปานกลาง",
  3: "สูง",
};

export type PriorityValue = 1 | 2 | 3 | null | undefined;

export function priorityBadgeClass(priority: PriorityValue): string {
  switch (priority) {
    case 1:
      return "badge-ghost";
    case 2:
      return "badge-warning badge-outline";
    case 3:
      return "badge-error badge-outline";
    default:
      return "badge-neutral";
  }
}

export function getPriorityLabel(priority: PriorityValue): string {
  if (priority == null) return "ไม่ระบุ";
  return PRIORITY_LABEL[priority] ?? "ไม่ระบุ";
}
