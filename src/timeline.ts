// Turns a hobby's logs and moments into a story, newest first, grouped by month.
// It shows a relationship, not a score: no totals, no streaks, and breaks are just "5 weeks in between".

import type { Day, Hobby, HobbyStatus, Log, Project } from './db';
import { daysBetween } from './lib/dates';

export type TimelineItem =
  | { kind: 'log'; at: number; log: Log }
  | { kind: 'status'; at: number; status: HobbyStatus; from?: HobbyStatus }
  | { kind: 'started'; at: number }
  | { kind: 'project'; at: number; name: string; finished: boolean }
  | { kind: 'gap'; weeks: number };

export interface TimelineMonth {
  key: string; // "2026-10"
  label: string; // "October 2026"
  items: TimelineItem[];
}

/** Breaks of at least this many days get a quiet "N weeks later" between entries. */
const GAP_DAYS = 21;

const monthKey = (at: number) => {
  const d = new Date(at);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/** For a hobby's page pass the hobby; for a project's page pass null and the project in `projects`. */
export function buildTimeline(hobby: Pick<Hobby, 'createdAt' | 'history'> | null, logs: Log[], projects: Project[]): TimelineMonth[] {
  const events: Exclude<TimelineItem, { kind: 'gap' }>[] = logs.map((log) => ({ kind: 'log' as const, at: log.at, log }));
  if (hobby) events.push({ kind: 'started', at: hobby.createdAt });
  let previous: HobbyStatus | undefined;
  for (const change of hobby?.history ?? []) {
    events.push({ kind: 'status', at: change.at, status: change.status, from: previous });
    previous = change.status;
  }
  for (const p of projects) {
    events.push({ kind: 'project', at: p.createdAt, name: p.name, finished: false });
    if (p.finishedAt) events.push({ kind: 'project', at: p.finishedAt, name: p.name, finished: true });
  }
  events.sort((a, b) => b.at - a.at);

  // Newest first: a quiet gap goes between a log and the next older one when they're far apart,
  // unless a status change (like a pause) in between already explains the break.
  const items: TimelineItem[] = [];
  let newerLog: Log | undefined;
  let explained = false;
  for (const event of events) {
    if (event.kind === 'status') explained = true;
    if (event.kind === 'log') {
      if (newerLog && !explained) {
        const days = daysBetween(event.log.day, newerLog.day);
        if (days >= GAP_DAYS) items.push({ kind: 'gap', weeks: Math.round(days / 7) });
      }
      newerLog = event.log;
      explained = false;
    }
    items.push(event);
  }

  const months: TimelineMonth[] = [];
  let currentKey: string | undefined;
  for (const item of items) {
    // A gap has no date of its own, so it stays in the month of the newer entry above it.
    if (item.kind !== 'gap' && monthKey(item.at) !== currentKey) {
      currentKey = monthKey(item.at);
      months.push({
        key: currentKey,
        label: new Date(item.at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
        items: [],
      });
    }
    months.at(-1)?.items.push(item);
  }
  return months;
}

/**
 * The last 12 months as soft dots: 0 = nothing, 1 = a little, 2 = some, 3 = lots.
 * Deliberately no numbers, so it reads like seasons rather than a score.
 */
export function yearStrip(logs: Log[], today: Day) {
  const [year, month] = today.split('-').map(Number);
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(year, month - 1 - (11 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return { key, letter: d.toLocaleDateString(undefined, { month: 'narrow' }), count: 0 };
  });
  const byKey = new Map(months.map((m) => [m.key, m]));
  for (const log of logs) {
    const m = byKey.get(log.day.slice(0, 7));
    if (m) m.count++;
  }
  return months.map(({ key, letter, count }) => ({
    key, letter, level: count === 0 ? 0 : count <= 2 ? 1 : count <= 5 ? 2 : 3,
  }));
}
