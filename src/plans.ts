// Pencilling things in for a day ("planner lite"). A plan shows first on its day and quietly lapses if not done:
// nothing records a missed plan (D6), it simply stops showing once the day has passed.

import { db, type Day } from './db';
import { newId } from './lib/ids';
import { type Doable, isSuggestible, keyOf, toDoables, weigher, type World } from './suggest';

export async function pencilIn(day: Day, d: Pick<Doable, 'refType' | 'refId'>) {
  const already = await db.plans.where('day').equals(day).filter((p) => p.refId === d.refId).count();
  if (!already) await db.plans.add({ id: newId(), day, refType: d.refType, refId: d.refId });
}

export async function removePlan(id: string) {
  await db.plans.delete(id);
}

/**
 * What the "plan something for tomorrow" card offers: plan-ahead activities from active and want-to-pursue
 * hobbies, the ones not done for longest first. Ones already pencilled in for tomorrow are left out.
 */
export function planAheadOptions(world: World, today: Day, tomorrow: Day, count = 2): Doable[] {
  const planned = new Set(world.plans.filter((p) => p.day === tomorrow).map((p) => keyOf(p.refType, p.refId)));
  const weight = weigher(world.logs, today);
  return toDoables(world)
    .filter((d) => d.planAhead && isSuggestible(d, world, true) && !planned.has(d.key))
    .sort((a, b) => weight(b) - weight(a) || a.title.localeCompare(b.title))
    .slice(0, count);
}
