// Important tasks: one-off things like errands or "wax skis", at most config.maxOpenTasks open at once.
// A due date is only a reminder to yourself: nothing turns red or nags once it's passed.

import { config } from './config';
import { db, type Project, type Task } from './db';
import { newId } from './lib/ids';
import type { LogTarget } from './logging';

export const openTaskCount = () => db.tasks.filter((t) => !t.doneAt).count();

/** Adds a task or saves changes. Returns false (and adds nothing) if a new task would go over the cap. */
export async function saveTask(task: Omit<Task, 'id' | 'createdAt'> & { id?: string; createdAt?: number }) {
  if (!task.id && (await openTaskCount()) >= config.maxOpenTasks) return false;
  await db.tasks.put({
    ...task,
    title: task.title.trim(),
    note: task.note?.trim() || undefined,
    due: task.due || undefined,
    id: task.id ?? newId(),
    createdAt: task.createdAt ?? Date.now(),
  });
  return true;
}

export async function removeTask(id: string) {
  await db.tasks.delete(id);
}

/** What logging a task records. A task linked to a project goes on its hobby's timeline too. */
export function taskTarget(task: Task, projects: Project[]): LogTarget {
  const hobbyId = task.hobbyId ?? projects.find((p) => p.id === task.projectId)?.hobbyId;
  return { title: task.title, refType: 'task', refId: task.id, hobbyId, projectId: task.projectId, goalIds: [] };
}

/** Open tasks first by due date (undated last), then oldest first. */
export const byDue = (a: Task, b: Task) =>
  (a.due ?? '9999').localeCompare(b.due ?? '9999') || a.createdAt - b.createdAt;
