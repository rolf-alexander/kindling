import { db } from '../db';
import type { Existing, ImportPlan } from './plan';

export async function loadExisting(): Promise<Existing> {
  const [hobbies, projects, steps, activities, tasks, routines, goals, media] = await Promise.all([
    db.hobbies.toArray(), db.projects.toArray(), db.steps.toArray(), db.activities.toArray(),
    db.tasks.toArray(), db.routines.toArray(), db.goals.toArray(), db.media.toArray(),
  ]);
  return { hobbies, projects, steps, activities, tasks, routines, goals, media };
}

/** Saves everything in the plan at once: either all of it is saved or none of it is. */
export async function applyImport(plan: ImportPlan) {
  const tables = [db.hobbies, db.projects, db.steps, db.activities, db.tasks, db.routines, db.goals, db.media];
  await db.transaction('rw', tables, async () => {
    await db.hobbies.bulkAdd(plan.hobbies);
    await db.projects.bulkAdd(plan.projects);
    await db.steps.bulkAdd(plan.steps);
    await db.activities.bulkAdd(plan.activities);
    await db.tasks.bulkAdd(plan.tasks);
    await db.routines.bulkAdd(plan.routines);
    await db.goals.bulkAdd(plan.goals);
    await db.media.bulkAdd(plan.media);
  });
}
