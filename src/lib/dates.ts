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
