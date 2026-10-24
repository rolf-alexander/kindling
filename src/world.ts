// Loads everything the home screen needs in one go, and helpers for describing things on screen.

import { db, type Day } from './db';
import { colourVar } from './lib/labels';
import type { World } from './suggest';

/** Today's suggestions are saved so they don't reshuffle every time the app opens. */
export interface SavedSuggestions {
  day: Day;
  keys: (string | null)[];
}

export async function loadWorld(): Promise<World & { saved: SavedSuggestions | null }> {
  const [hobbies, projects, activities, steps, tasks, logs, plans, saved] = await Promise.all([
    db.hobbies.toArray(), db.projects.toArray(), db.activities.toArray(), db.steps.toArray(),
    db.tasks.toArray(), db.logs.toArray(), db.plans.toArray(), db.settings.get('suggestions'),
  ]);
  return { hobbies, projects, activities, steps, tasks, logs, plans, saved: (saved?.value as SavedSuggestions) ?? null };
}

export const saveSuggestions = (value: SavedSuggestions) => db.settings.put({ key: 'suggestions', value });

/** The small line under a title (hobby or project name) and the colour to show it in. */
export function contextFor(item: { refType: string; hobbyId?: string; projectId?: string }, world: World) {
  const hobby = item.hobbyId ? world.hobbies.find((h) => h.id === item.hobbyId) : undefined;
  const project = item.projectId ? world.projects.find((p) => p.id === item.projectId) : undefined;
  const name = item.refType === 'step' ? project?.name : hobby?.name ?? project?.name;
  const label = item.refType === 'task' ? ['Task', name].filter(Boolean).join(' · ')
    : item.refType === 'routine' ? 'Routine'
    : item.refType === 'media' ? 'Reading & Watching'
    : name ?? '';
  return { label, colour: hobby ? colourVar(hobby.colour) : 'var(--accent)' };
}
