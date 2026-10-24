import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, type Goal, type Log } from './db';
import { logsThisPeriod, periodStart, recentPeriods, removeGoal, restingWith } from './goals';

const outside: Goal = { id: 'g1', name: 'Outside', target: 3, period: 'week', createdAt: 0 };

function log(day: string, goalIds = ['g1']): Log {
  return { id: `log-${day}-${Math.random()}`, at: Date.parse(day), day, title: 'Walk', refType: 'adhoc', goalIds };
}

describe('periodStart', () => {
  it('starts weeks on Monday', () => {
    // Friday 23 October 2026 → Monday 19 October.
    expect(periodStart('2026-10-23', 'week')).toBe('2026-10-19');
    expect(periodStart('2026-10-19', 'week')).toBe('2026-10-19');
    // Sunday belongs to the week that started the Monday before.
    expect(periodStart('2026-10-25', 'week')).toBe('2026-10-19');
  });

  it('starts months on the 1st', () => {
    expect(periodStart('2026-10-23', 'month')).toBe('2026-10-01');
  });
});

describe('logsThisPeriod', () => {
  it('counts only this period, and only logs tagged with the goal', () => {
    const logs = [log('2026-10-18'), log('2026-10-19'), log('2026-10-22'), log('2026-10-23', ['other']), log('2026-10-26')];
    expect(logsThisPeriod(outside, logs, '2026-10-23').map((l) => l.day)).toEqual(['2026-10-19', '2026-10-22']);
  });

  it('starts each period fresh', () => {
    const logs = [log('2026-10-19'), log('2026-10-20'), log('2026-10-21')];
    expect(logsThisPeriod(outside, logs, '2026-10-26')).toEqual([]);
  });

  it('counts a whole month', () => {
    const monthly: Goal = { ...outside, period: 'month' };
    const logs = [log('2026-09-30'), log('2026-10-01'), log('2026-10-31'), log('2026-11-01')];
    expect(logsThisPeriod(monthly, logs, '2026-10-15')).toHaveLength(2);
  });
});

describe('recentPeriods', () => {
  it('shades weeks by how close they came to the target, oldest first', () => {
    const logs = [log('2026-10-05'), log('2026-10-12'), log('2026-10-13'), log('2026-10-14'), log('2026-10-15')];
    const weeks = recentPeriods(outside, logs, '2026-10-23', 4);
    expect(weeks.map((w) => w.start)).toEqual(['2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19']);
    expect(weeks.map((w) => w.level)).toEqual([0, 1, 3, 0]);
  });

  it('goes back through months', () => {
    const months = recentPeriods({ ...outside, period: 'month' }, [], '2026-01-10', 3);
    expect(months.map((m) => m.start)).toEqual(['2025-11-01', '2025-12-01', '2026-01-01']);
  });
});

describe('restingWith', () => {
  it('rests a goal whose hobby is paused', () => {
    const hobbies = [{ id: 'h1', name: 'Hiking', status: 'paused' as const, colour: 'sage', createdAt: 0 }];
    expect(restingWith({ ...outside, hobbyId: 'h1' }, hobbies)?.name).toBe('Hiking');
    expect(restingWith(outside, hobbies)).toBeUndefined();
  });
});

describe('removeGoal', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
  });

  it('unlinks the goal from activities and routines', async () => {
    await db.goals.add(outside);
    await db.activities.add({ id: 'a1', title: 'Walk', energy: 'low', planAhead: false, goalIds: ['g1', 'g2'], createdAt: 0 });
    await db.routines.add({ id: 'r1', name: 'Stretch', steps: [], goalIds: ['g1'], createdAt: 0 });
    await removeGoal('g1');
    expect(await db.goals.count()).toBe(0);
    expect((await db.activities.get('a1'))!.goalIds).toEqual(['g2']);
    expect((await db.routines.get('r1'))!.goalIds).toEqual([]);
  });
});
