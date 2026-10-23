import { config } from '../config';
import type { Day } from '../db';

/** Which Kindling day a moment belongs to. Before 4am counts as the previous day. */
export function dayOf(moment: Date, dayStartsAtHour = config.dayStartsAtHour): Day {
  const shifted = new Date(moment);
  shifted.setHours(shifted.getHours() - dayStartsAtHour);
  const y = shifted.getFullYear();
  const m = String(shifted.getMonth() + 1).padStart(2, '0');
  const d = String(shifted.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const today = () => dayOf(new Date());

/** Whole days from one day to another, e.g. "2026-10-21" → "2026-10-23" is 2. */
export function daysBetween(from: Day, to: Day) {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

/** The day a number of days before or after another, e.g. addDays("2026-10-31", 1) is "2026-11-01". */
export function addDays(day: Day, days: number): Day {
  const [y, m, d] = day.split('-').map(Number);
  return dayOf(new Date(y, m - 1, d + days, 12), 0);
}

/** Midday on a day, as a timestamp: used for things logged on a past day. */
export function middayOf(day: Day): number {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, 12).getTime();
}

/** A month laid out for a calendar grid: empty slots (null) first, so the 1st lands on the right weekday. */
export function monthGrid(year: number, month: number, weekStartsOn = config.weekStartsOn): (Day | null)[] {
  const lead = (new Date(year, month - 1, 1).getDay() - weekStartsOn + 7) % 7;
  const length = new Date(year, month, 0).getDate();
  const days = Array.from({ length }, (_, i) => dayOf(new Date(year, month - 1, i + 1, 12), 0));
  return [...Array<null>(lead).fill(null), ...days];
}

/** Whether it's late enough in the (4am-to-4am) day to offer planning tomorrow. 1am still counts as evening. */
export function isPlanningTime(now = new Date()) {
  const hoursIntoDay = (now.getHours() - config.dayStartsAtHour + 24) % 24;
  return hoursIntoDay >= config.planCardFromHour - config.dayStartsAtHour;
}

/** A day written out, e.g. "Friday 23 October". */
export function formatDay(day: Day) {
  return new Date(middayOf(day)).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

/** "today", "yesterday" or "5 days ago". */
export function daysAgo(moment: number) {
  const days = daysBetween(dayOf(new Date(moment)), today());
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}
