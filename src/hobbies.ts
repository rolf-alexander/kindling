// Changing hobbies and their activities.

import { db, type Activity, type HobbyStatus } from './db';
import { newId } from './lib/ids';
import { HOBBY_COLOURS } from './lib/labels';

export async function createHobby(name: string, status: HobbyStatus): Promise<string> {
  const count = await db.hobbies.count();
  const id = newId();
  await db.hobbies.add({
    id, name: name.trim(), status, colour: HOBBY_COLOURS[count % HOBBY_COLOURS.length], createdAt: Date.now(),
  });
  return id;
}

/** Changes a hobby's status and remembers when, for its timeline. */
export async function setHobbyStatus(id: string, status: HobbyStatus) {
  const hobby = await db.hobbies.get(id);
  if (!hobby || hobby.status === status) return;
  await db.hobbies.update(id, { status, history: [...(hobby.history ?? []), { at: Date.now(), status }] });
}

export async function updateHobby(id: string, changes: { name?: string; colour?: string }) {
  await db.hobbies.update(id, { ...changes, ...(changes.name ? { name: changes.name.trim() } : {}) });
}

/** Adds a new activity or saves changes to an existing one. */
export async function saveActivity(activity: Omit<Activity, 'id' | 'createdAt'> & { id?: string; createdAt?: number }) {
  await db.activities.put({ ...activity, title: activity.title.trim(), id: activity.id ?? newId(), createdAt: activity.createdAt ?? Date.now() });
}

/** Removes an activity from suggestions and lists. Its past logs stay on the timeline. */
export async function archiveActivity(id: string) {
  await db.activities.update(id, { archived: true });
}

/** Finds a goal by name, or creates it as a plain tag. Returns its ID. */
export async function goalIdFor(name: string): Promise<string> {
  const goals = await db.goals.toArray();
  const existing = goals.find((g) => g.name.toLowerCase() === name.trim().toLowerCase());
  if (existing) return existing.id;
  const id = newId();
  await db.goals.add({ id, name: name.trim(), period: 'week', createdAt: Date.now() });
  return id;
}
