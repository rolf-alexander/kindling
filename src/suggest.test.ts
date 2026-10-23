import { describe, expect, it } from 'vitest';
import type { Activity, Energy, Hobby, HobbyStatus, Log } from './db';
import { suggest, type World } from './suggest';

const TODAY = '2026-10-23';

function hobby(id: string, status: HobbyStatus = 'active'): Hobby {
  return { id, name: id, status, colour: 'peach', createdAt: 0 };
}
function activity(id: string, hobbyId: string, energy: Energy, extra: Partial<Activity> = {}): Activity {
  return { id, title: id, hobbyId, energy, planAhead: false, goalIds: [], createdAt: 0, ...extra };
}
function log(refId: string, hobbyId: string, day: string): Log {
  return { id: `log-${refId}-${day}`, at: 0, day, title: refId, refType: 'activity', refId, hobbyId, goalIds: [] };
}
function world(parts: Partial<World>): World {
  return { hobbies: [], projects: [], activities: [], steps: [], tasks: [], logs: [], plans: [], ...parts };
}
const titles = (picks: ReturnType<typeof suggest>) => picks.map((p) => p?.title ?? null);

/** A predictable stand-in for Math.random. */
function seeded(seed = 1) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

describe('suggest', () => {
  it('gives one suggestion per energy level', () => {
    const w = world({
      hobbies: [hobby('a'), hobby('b'), hobby('c')],
      activities: [activity('a-low', 'a', 'low'), activity('b-med', 'b', 'medium'), activity('c-high', 'c', 'high')],
    });
    expect(titles(suggest(w, { today: TODAY }))).toEqual(['a-low', 'b-med', 'c-high']);
  });

  it('never shows two from the same hobby', () => {
    const w = world({
      hobbies: [hobby('a')],
      activities: [activity('a-low', 'a', 'low'), activity('a-med', 'a', 'medium'), activity('a-high', 'a', 'high')],
    });
    for (let seed = 1; seed < 20; seed++) {
      expect(suggest(w, { today: TODAY, random: seeded(seed) }).filter(Boolean)).toHaveLength(1);
    }
  });

  it('gives a level with only one option its option, rather than using that hobby up elsewhere', () => {
    // Hobby "a" is the only one with a high-energy activity, so it must go there.
    const w = world({
      hobbies: [hobby('a'), hobby('b')],
      activities: [activity('a-low', 'a', 'low'), activity('b-low', 'b', 'low'), activity('a-high', 'a', 'high')],
    });
    for (let seed = 1; seed < 20; seed++) {
      expect(titles(suggest(w, { today: TODAY, random: seeded(seed) }))).toEqual(['b-low', null, 'a-high']);
    }
  });

  it('includes want-to-pursue hobbies but not paused or semi-retired ones', () => {
    const w = world({
      hobbies: [hobby('want', 'want'), hobby('paused', 'paused'), hobby('retired', 'semiRetired')],
      activities: [activity('w', 'want', 'low'), activity('p', 'paused', 'medium'), activity('r', 'retired', 'high')],
    });
    expect(titles(suggest(w, { today: TODAY }))).toEqual(['w', null, null]);
  });

  it('skips plan-ahead activities, things done today and things pencilled in for today', () => {
    const w = world({
      hobbies: [hobby('a'), hobby('b'), hobby('c')],
      activities: [
        activity('shoot', 'a', 'low', { planAhead: true }),
        activity('done', 'b', 'medium'),
        activity('planned', 'c', 'high'),
      ],
      logs: [log('done', 'b', TODAY)],
      plans: [{ id: 'p', day: TODAY, refType: 'activity', refId: 'planned' }],
    });
    expect(titles(suggest(w, { today: TODAY }))).toEqual([null, null, null]);
  });

  it('suggests only the next step of a project, and tasks only when linked', () => {
    const w = world({
      hobbies: [hobby('a')],
      projects: [{ id: 'zine', name: 'Zine', status: 'active', createdAt: 0 }],
      steps: [
        { id: 'second', projectId: 'zine', title: 'second', energy: 'low', order: 1 },
        { id: 'first', projectId: 'zine', title: 'first', energy: 'low', order: 0 },
      ],
      tasks: [
        { id: 'admin', title: 'admin', energy: 'medium', createdAt: 0 },
        { id: 'wax', title: 'wax', hobbyId: 'a', energy: 'high', createdAt: 0 },
      ],
    });
    expect(titles(suggest(w, { today: TODAY }))).toEqual(['first', null, 'wax']);
  });

  it('keeps current suggestions that are still valid', () => {
    const w = world({
      hobbies: [hobby('a'), hobby('b')],
      activities: [activity('a1', 'a', 'low'), activity('b1', 'b', 'low')],
    });
    for (let seed = 1; seed < 10; seed++) {
      expect(titles(suggest(w, { today: TODAY, current: ['activity:b1', null, null], random: seeded(seed) })))
        .toEqual(['b1', null, null]);
    }
  });

  it('"show me others" avoids the current ones when there are alternatives', () => {
    const w = world({
      hobbies: [hobby('a'), hobby('b'), hobby('c')],
      activities: [activity('a1', 'a', 'low'), activity('b1', 'b', 'low'), activity('c1', 'c', 'medium')],
    });
    for (let seed = 1; seed < 10; seed++) {
      // a1 is avoided and b1 is the only other low option; c1 has no alternative so it comes back.
      expect(titles(suggest(w, { today: TODAY, avoid: ['activity:a1', 'activity:c1'], random: seeded(seed) })))
        .toEqual(['b1', 'c1', null]);
    }
  });

  it('favours things not done for a while', () => {
    const w = world({
      hobbies: [hobby('recent'), hobby('neglected')],
      activities: [activity('recent', 'recent', 'low'), activity('neglected', 'neglected', 'low')],
      logs: [log('recent', 'recent', '2026-10-22'), log('neglected', 'neglected', '2026-09-01')],
    });
    const random = seeded(7);
    let neglected = 0;
    for (let i = 0; i < 1000; i++) if (suggest(w, { today: TODAY, random })[0]?.title === 'neglected') neglected++;
    // Weights: recent = 1 + 1 + 1 = 3, neglected = 1 + 30 + 30 = 61, so about 95% of the time.
    expect(neglected).toBeGreaterThan(900);
  });
});
