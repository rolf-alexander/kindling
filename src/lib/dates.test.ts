import { describe, expect, it } from 'vitest';
import { addDays, dayOf, isPlanningTime, monthGrid } from './dates';

describe('addDays', () => {
  it('crosses month and year ends', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
  });
});

describe('monthGrid', () => {
  it('starts weeks on Monday', () => {
    // 1 October 2026 is a Thursday: three empty slots (Mon, Tue, Wed) first.
    const grid = monthGrid(2026, 10, 1);
    expect(grid.slice(0, 4)).toEqual([null, null, null, '2026-10-01']);
    expect(grid.at(-1)).toBe('2026-10-31');
  });
});

describe('isPlanningTime', () => {
  it('is from 1pm until the 4am day boundary', () => {
    expect(isPlanningTime(new Date(2026, 9, 23, 12, 59))).toBe(false);
    expect(isPlanningTime(new Date(2026, 9, 23, 13, 0))).toBe(true);
    expect(isPlanningTime(new Date(2026, 9, 24, 1, 0))).toBe(true);
    expect(isPlanningTime(new Date(2026, 9, 24, 4, 0))).toBe(false);
  });
});

describe('dayOf', () => {
  it('counts the afternoon as that day', () => {
    expect(dayOf(new Date(2026, 9, 23, 15, 0))).toBe('2026-10-23');
  });

  it('counts 1am as the night before', () => {
    expect(dayOf(new Date(2026, 9, 24, 1, 0))).toBe('2026-10-23');
  });

  it('starts the new day at 4am', () => {
    expect(dayOf(new Date(2026, 9, 24, 4, 0))).toBe('2026-10-24');
  });

  it('handles month and year boundaries', () => {
    expect(dayOf(new Date(2027, 0, 1, 2, 0))).toBe('2026-12-31');
  });
});
