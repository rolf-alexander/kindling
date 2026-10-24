import { describe, expect, it } from 'vitest';
import type { Hobby, Log } from './db';
import { buildRecap, hoursText, type RecapData } from './recap';

const at = (day: string) => new Date(`${day}T12:00:00`).getTime();
const photo: Hobby = {
  id: 'h1', name: 'Photography', status: 'active', colour: 'peach', createdAt: at('2026-01-01'),
  history: [{ at: at('2026-08-01'), status: 'paused' }, { at: at('2026-10-03'), status: 'active' }],
};
const hike: Hobby = { id: 'h2', name: 'Hiking', status: 'active', colour: 'sage', createdAt: at('2026-10-10') };

function log(day: string, extra: Partial<Log> = {}): Log {
  return { id: `${day}-${Math.random()}`, at: at(day), day, title: 'Walk', refType: 'activity', goalIds: [], ...extra };
}

const data = (logs: Log[]): RecapData => ({
  hobbies: [photo, hike], projects: [], goals: [{ id: 'g1', name: 'Outside', period: 'week', createdAt: 0 }], media: [], logs,
});

describe('buildRecap', () => {
  const recap = buildRecap(data([
    log('2026-10-02', { hobbyId: 'h1', durationMin: 60, goalIds: ['g1'] }),
    log('2026-10-02', { hobbyId: 'h2', durationMin: 30 }),
    log('2026-10-05', { hobbyId: 'h1', photoId: 'p1' }),
    log('2026-10-06', { title: 'Skin care', refType: 'routine' }),
    log('2026-09-30', { hobbyId: 'h2' }), // last month: not counted
  ]), '2026-10');

  it('counts days, time and hobbies for the month only', () => {
    expect(recap.activeDays).toBe(3);
    expect(recap.minutes).toBe(90);
    expect(recap.hobbies.map((h) => [h.hobby.name, h.count, h.minutes])).toEqual([['Photography', 2, 60], ['Hiking', 1, 30]]);
  });

  it('collects routines, goals and photos', () => {
    expect(recap.routines).toEqual([{ name: 'Skin care', count: 1 }]);
    expect(recap.goals.map((g) => [g.goal.name, g.count])).toEqual([['Outside', 1]]);
    expect(recap.photoIds).toEqual(['p1']);
  });

  it('notices moments: a hobby picked back up, a new hobby', () => {
    expect(recap.pickedBackUp.map((h) => h.name)).toEqual(['Photography']);
    expect(recap.newHobbies.map((h) => h.name)).toEqual(['Hiking']);
  });

  it('is calm about an empty month', () => {
    const quiet = buildRecap(data([]), '2026-11');
    expect(quiet.activeDays).toBe(0);
    expect(quiet.hobbies).toEqual([]);
  });
});

describe('hoursText', () => {
  it('reads naturally', () => {
    expect(hoursText(200)).toBe('3h 20m');
    expect(hoursText(45)).toBe('45m');
    expect(hoursText(120)).toBe('2h');
  });
});
