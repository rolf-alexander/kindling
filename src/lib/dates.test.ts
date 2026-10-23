import { describe, expect, it } from 'vitest';
import { dayOf } from './dates';

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
