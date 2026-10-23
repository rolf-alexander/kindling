import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { type Activity, db, type Hobby } from './db';
import { pencilIn, planAheadOptions } from './plans';
import type { World } from './suggest';

const hobby = (id: string, status: Hobby['status'] = 'active'): Hobby => ({ id, name: id, status, colour: 'sea', createdAt: 0 });
const activity = (id: string, hobbyId: string, planAhead = true): Activity => ({
  id, title: id, hobbyId, energy: 'high', planAhead, goalIds: [], createdAt: 0,
});
const world = (parts: Partial<World>): World => ({
  hobbies: [], projects: [], activities: [], steps: [], tasks: [], logs: [], plans: [], ...parts,
});

describe('planAheadOptions', () => {
  it('offers plan-ahead activities from active and want hobbies, longest-undone first', () => {
    const w = world({
      hobbies: [hobby('a'), hobby('b', 'want'), hobby('c', 'paused')],
      activities: [activity('shoot', 'a'), activity('trip', 'b'), activity('rest', 'c'), activity('quick', 'a', false)],
      logs: [{ id: 'l', at: 0, day: '2026-10-20', title: 'shoot', refType: 'activity', refId: 'shoot', hobbyId: 'a', goalIds: [] }],
    });
    expect(planAheadOptions(w, '2026-10-23', '2026-10-24').map((d) => d.title)).toEqual(['trip', 'shoot']);
  });

  it('leaves out what is already pencilled in for tomorrow', () => {
    const w = world({
      hobbies: [hobby('a')],
      activities: [activity('shoot', 'a')],
      plans: [{ id: 'p', day: '2026-10-24', refType: 'activity', refId: 'shoot' }],
    });
    expect(planAheadOptions(w, '2026-10-23', '2026-10-24')).toEqual([]);
  });
});

describe('pencilIn', () => {
  beforeEach(() => db.plans.clear());

  it('does not pencil the same thing in twice for one day', async () => {
    await pencilIn('2026-10-24', { refType: 'activity', refId: 'shoot' });
    await pencilIn('2026-10-24', { refType: 'activity', refId: 'shoot' });
    await pencilIn('2026-10-25', { refType: 'activity', refId: 'shoot' });
    expect(await db.plans.count()).toBe(2);
  });
});
