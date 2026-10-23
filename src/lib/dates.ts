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

/** "today", "yesterday" or "5 days ago". */
export function daysAgo(moment: number) {
  const days = daysBetween(dayOf(new Date(moment)), today());
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}
