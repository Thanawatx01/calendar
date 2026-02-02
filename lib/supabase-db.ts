import { supabase } from "./supabase";

// --- Types (camelCase = app/API) ---
export type TaskRow = {
  id: string;
  user_id: string | null;
  type: string;
  title: string;
  description: string | null;
  start_datetime: string | null;
  end_datetime: string | null;
  due_datetime: string | null;
  is_all_day: boolean;
  status: string;
  priority: number | null;
  color: string | null;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
};

export type TimeTrackRow = {
  id: string;
  user_id: string;
  task_id: string;
  start_time: string;
  end_time: string | null;
  duration_seconds: number | null;
  note: string | null;
  created_at: string;
};

export type Task = {
  id: string;
  userId: string | null;
  type: string;
  title: string;
  description: string | null;
  startDatetime: string | null;
  endDatetime: string | null;
  dueDatetime: string | null;
  isAllDay: boolean;
  status: string;
  priority: number | null;
  color: string | null;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  timeTracks?: TimeTrack[];
};

export type TimeTrack = {
  id: string;
  userId: string;
  taskId: string;
  startTime: string;
  endTime: string | null;
  durationSeconds: number | null;
  note: string | null;
  createdAt: string;
  task?: Task;
};

function taskRowToApp(row: TaskRow): Task {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    description: row.description,
    startDatetime: row.start_datetime,
    endDatetime: row.end_datetime,
    dueDatetime: row.due_datetime,
    isAllDay: row.is_all_day,
    status: row.status,
    priority: row.priority,
    color: row.color,
    parentId: row.parent_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function timeTrackRowToApp(row: TimeTrackRow & { task?: TaskRow }): TimeTrack {
  const t: TimeTrack = {
    id: row.id,
    userId: row.user_id,
    taskId: row.task_id,
    startTime: row.start_time,
    endTime: row.end_time,
    durationSeconds: row.duration_seconds,
    note: row.note,
    createdAt: row.created_at,
  };
  if (row.task) t.task = taskRowToApp(row.task);
  return t;
}

// --- Task ---
export async function getTasks(userId: string | null): Promise<Task[]> {
  let q = supabase
    .from("Task")
    .select(
      "id, user_id, type, title, description, start_datetime, end_datetime, due_datetime, is_all_day, status, priority, color, parent_id, created_at, updated_at"
    )
    .order("created_at", { ascending: false });
  if (userId != null) q = q.eq("user_id", userId);
  const { data, error } = await q;
  if (error) throw error;
  const tasks = (data as TaskRow[]).map(taskRowToApp);
  // Load timeTracks for each task
  for (const task of tasks) {
    const { data: tt } = await supabase
      .from("TimeTrack")
      .select("*")
      .eq("task_id", task.id)
      .order("start_time", { ascending: false });
    task.timeTracks = (tt ?? []).map((r) => timeTrackRowToApp(r as TimeTrackRow));
  }
  return tasks;
}

export async function getTaskById(
  id: string,
  userId: string | null
): Promise<Task | null> {
  let q = supabase.from("Task").select("*").eq("id", id);
  if (userId != null) q = q.eq("user_id", userId);
  const { data, error } = await q.single();
  if (error || !data) return null;
  const task = taskRowToApp(data as TaskRow);
  const { data: tt } = await supabase
    .from("TimeTrack")
    .select("*")
    .eq("task_id", id)
    .order("start_time", { ascending: false });
  task.timeTracks = (tt ?? []).map((r) => timeTrackRowToApp(r as TimeTrackRow));
  return task;
}

export async function createTask(data: {
  userId: string | null;
  type: string;
  title: string;
  description?: string | null;
  startDatetime?: string | null;
  endDatetime?: string | null;
  dueDatetime?: string | null;
  isAllDay?: boolean;
  status?: string;
  priority?: number | null;
  color?: string | null;
}): Promise<Task> {
  const row = {
    user_id: data.userId,
    type: data.type,
    title: data.title,
    description: data.description ?? null,
    start_datetime: data.startDatetime ?? null,
    end_datetime: data.endDatetime ?? null,
    due_datetime: data.dueDatetime ?? null,
    is_all_day: data.isAllDay ?? false,
    status: data.status ?? "pending",
    priority: data.priority ?? null,
    color: data.color ?? null,
  };
  const { data: inserted, error } = await supabase
    .from("Task")
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return taskRowToApp(inserted as TaskRow);
}

export async function updateTask(
  id: string,
  userId: string | null,
  data: Partial<{
    title: string;
    description: string | null;
    status: string;
    priority: number | null;
    color: string | null;
    dueDatetime: string | null;
  }>
): Promise<Task> {
  const row: Record<string, unknown> = {};
  if (data.title !== undefined) row.title = data.title;
  if (data.description !== undefined) row.description = data.description;
  if (data.status !== undefined) row.status = data.status;
  if (data.priority !== undefined) row.priority = data.priority;
  if (data.color !== undefined) row.color = data.color;
  if (data.dueDatetime !== undefined) row.due_datetime = data.dueDatetime;
  if (Object.keys(row).length === 0) {
    const t = await getTaskById(id, userId);
    if (!t) throw new Error("Task not found");
    return t;
  }
  let q = supabase.from("Task").update(row).eq("id", id);
  if (userId != null) q = q.eq("user_id", userId);
  const { data: updated, error } = await q.select().single();
  if (error) throw error;
  return taskRowToApp(updated as TaskRow);
}

export async function deleteTask(
  id: string,
  userId: string | null
): Promise<void> {
  let q = supabase.from("Task").delete().eq("id", id);
  if (userId != null) q = q.eq("user_id", userId);
  const { error } = await q;
  if (error) throw error;
}

export async function getTaskWithTimeTracksCount(
  id: string,
  userId: string | null
): Promise<{ task: Task; timeTracksCount: number } | null> {
  const task = await getTaskById(id, userId);
  if (!task) return null;
  const { count, error } = await supabase
    .from("TimeTrack")
    .select("*", { count: "exact", head: true })
    .eq("task_id", id);
  if (error) throw error;
  return { task, timeTracksCount: count ?? 0 };
}

// --- TimeTrack ---
export async function getTimeTracks(
  userId: string,
  activeOnly?: boolean
): Promise<TimeTrack[]> {
  let q = supabase
    .from("TimeTrack")
    .select("*, task:Task(*)")
    .eq("user_id", userId)
    .order("start_time", { ascending: false });
  if (activeOnly) q = q.is("end_time", null);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => {
    const { task, ...rest } = r as TimeTrackRow & { task: TaskRow };
    return timeTrackRowToApp({ ...rest, task });
  });
}

export async function createTimeTrack(data: {
  userId: string;
  taskId: string;
  startTime: string;
  endTime?: string | null;
  durationSeconds?: number | null;
  note?: string | null;
}): Promise<TimeTrack> {
  const row = {
    user_id: data.userId,
    task_id: data.taskId,
    start_time: data.startTime,
    end_time: data.endTime ?? null,
    duration_seconds: data.durationSeconds ?? null,
    note: data.note ?? null,
  };
  const { data: inserted, error } = await supabase
    .from("TimeTrack")
    .insert(row)
    .select("*, task:Task(*)")
    .single();
  if (error) throw error;
  const r = inserted as TimeTrackRow & { task: TaskRow };
  return timeTrackRowToApp(r);
}

export async function getTimeTrackById(
  id: string,
  userId: string
): Promise<TimeTrack | null> {
  const { data, error } = await supabase
    .from("TimeTrack")
    .select("*, task:Task(*)")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  if (error || !data) return null;
  return timeTrackRowToApp(data as TimeTrackRow & { task: TaskRow });
}

export async function updateTimeTrack(
  id: string,
  userId: string,
  data: Partial<{
    endTime: string;
    durationSeconds: number;
    note: string | null;
  }>
): Promise<TimeTrack> {
  const row: Record<string, unknown> = {};
  if (data.endTime !== undefined) row.end_time = data.endTime;
  if (data.durationSeconds !== undefined)
    row.duration_seconds = data.durationSeconds;
  if (data.note !== undefined) row.note = data.note;
  const { data: updated, error } = await supabase
    .from("TimeTrack")
    .update(row)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*, task:Task(*)")
    .single();
  if (error) throw error;
  return timeTrackRowToApp(updated as TimeTrackRow & { task: TaskRow });
}

export async function deleteTimeTrack(id: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("TimeTrack")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}
