// Self-care routines. They're logged with one tap, count towards goals, and never appear on Today.

import { db, type Routine } from './db';
import { newId } from './lib/ids';
import type { LogTarget } from './logging';

/** Adds a new routine or saves changes. Steps are written one per line; blank lines are dropped. */
export async function saveRoutine(routine: Omit<Routine, 'id' | 'createdAt'> & { id?: string; createdAt?: number }) {
  await db.routines.put({
    ...routine,
    name: routine.name.trim(),
    steps: routine.steps.map((s) => s.trim()).filter(Boolean),
    id: routine.id ?? newId(),
    createdAt: routine.createdAt ?? Date.now(),
  });
}

/** Removes a routine. Its past logs stay on the calendar. */
export async function removeRoutine(id: string) {
  await db.routines.delete(id);
}

export const routineTarget = (r: Routine): LogTarget => ({ title: r.name, refType: 'routine', refId: r.id, goalIds: r.goalIds });
