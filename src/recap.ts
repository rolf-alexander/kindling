// A month in review, like Gentler Streak's monthly recap: what you made time for, never what you didn't.
// No comparisons with other months, no totals to beat. A quiet month is just a quiet month.

import type { Goal, Hobby, Log, Media, Project } from './db';

export interface RecapData {
  hobbies: Hobby[];
  projects: Project[];
  logs: Log[];
  goals: Goal[];
  media: Media[];
}

/** "2026-10" for a timestamp, in local time. */
export const monthOf = (at: number) => {
  const d = new Date(at);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const tally = <T>(items: T[], keyOf: (item: T) => string | undefined) => {
  const counts = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    if (key) counts.set(key, [...(counts.get(key) ?? []), item]);
  }
  return counts;
};
const minutesOf = (logs: Log[]) => logs.reduce((sum, l) => sum + (l.durationMin ?? 0), 0);

export function buildRecap(data: RecapData, month: string) {
  const logs = data.logs.filter((l) => l.day.startsWith(month)).sort((a, b) => a.at - b.at);
  const inMonth = (at?: number) => at !== undefined && monthOf(at) === month;

  const hobbies = [...tally(logs, (l) => l.hobbyId)]
    .map(([id, ls]) => ({ hobby: data.hobbies.find((h) => h.id === id), count: ls.length, minutes: minutesOf(ls) }))
    .filter((x): x is { hobby: Hobby; count: number; minutes: number } => !!x.hobby)
    .sort((a, b) => b.count - a.count || a.hobby.name.localeCompare(b.hobby.name));

  const routines = [...tally(logs.filter((l) => l.refType === 'routine'), (l) => l.title)]
    .map(([name, ls]) => ({ name, count: ls.length }))
    .sort((a, b) => b.count - a.count);

  const goals = data.goals
    .map((goal) => ({ goal, count: logs.filter((l) => l.goalIds.includes(goal.id)).length }))
    .filter((g) => g.count > 0)
    .sort((a, b) => b.count - a.count);

  // Hobbies that came back from a rest this month.
  const pickedBackUp = data.hobbies.filter((h) => (h.history ?? []).some((change, i, all) =>
    inMonth(change.at) && change.status === 'active' && ['paused', 'semiRetired'].includes(all[i - 1]?.status ?? '')));

  return {
    month,
    logs,
    activeDays: new Set(logs.map((l) => l.day)).size,
    minutes: minutesOf(logs),
    hobbies,
    routines,
    goals,
    stepsDone: logs.filter((l) => l.refType === 'step').length,
    tasksDone: logs.filter((l) => l.refType === 'task').length,
    finishedMedia: data.media.filter((m) => m.status === 'finished' && inMonth(m.finishedAt)),
    projectsStarted: data.projects.filter((p) => inMonth(p.createdAt)),
    projectsFinished: data.projects.filter((p) => p.status === 'finished' && inMonth(p.finishedAt)),
    newHobbies: data.hobbies.filter((h) => inMonth(h.createdAt)),
    pickedBackUp,
    /** Photos from this month's logs, newest first. */
    photoIds: logs.filter((l) => l.photoId).map((l) => l.photoId!).reverse(),
  };
}

export type Recap = ReturnType<typeof buildRecap>;

/** "3h 20m", "45m" or "2h". */
export function hoursText(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h && `${h}h`, m && `${m}m`].filter(Boolean).join(' ') || '0m';
}
