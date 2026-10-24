// Goals: tags like "Outside" that logs count towards, with an optional target per week or month.
// Progress only ever counts what you did. Each period starts fresh, and nothing records a shortfall (D6, D21).

import { config } from './config';
import { db, type Day, type Goal, type Hobby, type Log } from './db';
import { addDays, middayOf } from './lib/dates';
import { newId } from './lib/ids';

/** The first day of the week or month that `day` falls in. Weeks start on config.weekStartsOn (Monday). */
export function periodStart(day: Day, period: Goal['period']): Day {
  if (period === 'month') return `${day.slice(0, 7)}-01`;
  const weekday = new Date(middayOf(day)).getDay();
  return addDays(day, -((weekday - config.weekStartsOn + 7) % 7));
}

/** The first day of the next period, so a period is every day from periodStart up to (not including) this. */
function periodEnd(start: Day, period: Goal['period']): Day {
  if (period === 'week') return addDays(start, 7);
  const [y, m] = start.split('-').map(Number);
  return addDays(start, new Date(y, m, 0).getDate());
}

/** Logs that count towards a goal in the period containing `day`, oldest first. */
export function logsThisPeriod(goal: Goal, logs: Log[], day: Day): Log[] {
  const start = periodStart(day, goal.period);
  const end = periodEnd(start, goal.period);
  return logs
    .filter((l) => l.goalIds.includes(goal.id) && l.day >= start && l.day < end)
    .sort((a, b) => a.at - b.at);
}

/** A goal that belongs to a paused or semi-retired hobby rests with it: no target is shown. */
export function restingWith(goal: Goal, hobbies: Hobby[]): Hobby | undefined {
  const hobby = goal.hobbyId ? hobbies.find((h) => h.id === goal.hobbyId) : undefined;
  return hobby && (hobby.status === 'paused' || hobby.status === 'semiRetired') ? hobby : undefined;
}

/**
 * The last few periods as soft dots, oldest first: 0 = nothing, up to 3 = plenty.
 * With a target, 3 means it was reached. Like the hobby year strip, there are no numbers.
 */
export function recentPeriods(goal: Goal, logs: Log[], day: Day, count = 8) {
  const starts: Day[] = [periodStart(day, goal.period)];
  while (starts.length < count) starts.unshift(periodStart(addDays(starts[0], -1), goal.period));
  return starts.map((start) => {
    const done = logsThisPeriod(goal, logs, start).length;
    const level = done === 0 ? 0
      : goal.target ? Math.min(3, Math.ceil((3 * done) / goal.target))
      : done === 1 ? 1 : done <= 3 ? 2 : 3;
    return { start, level };
  });
}

export async function saveGoal(goal: Omit<Goal, 'id' | 'createdAt'> & { id?: string; createdAt?: number }) {
  await db.goals.put({ ...goal, name: goal.name.trim(), id: goal.id ?? newId(), createdAt: goal.createdAt ?? Date.now() });
}

/** Removes a goal and unlinks it from activities and routines. Past logs keep their snapshot (D5). */
export async function removeGoal(id: string) {
  await db.transaction('rw', [db.goals, db.activities, db.routines], async () => {
    await db.goals.delete(id);
    const unlink = (item: { goalIds: string[] }) => {
      item.goalIds = item.goalIds.filter((g) => g !== id);
    };
    await db.activities.filter((a) => a.goalIds.includes(id)).modify(unlink);
    await db.routines.filter((r) => r.goalIds.includes(id)).modify(unlink);
  });
}
