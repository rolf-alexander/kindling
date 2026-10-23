import { describe, expect, it } from 'vitest';
import type { Hobby, Log } from './db';
import { buildTimeline, yearStrip } from './timeline';

const at = (day: string) => new Date(`${day}T12:00:00`).getTime();
const log = (day: string, title = day): Log => ({
  id: day, at: at(day), day, title, refType: 'adhoc', hobbyId: 'h', goalIds: [],
});
const hobby: Hobby = {
  id: 'h', name: 'Chess', status: 'active', colour: 'sky', createdAt: at('2026-01-05'),
  history: [{ at: at('2026-03-01'), status: 'paused' }, { at: at('2026-06-10'), status: 'active' }],
};

describe('buildTimeline', () => {
  const months = buildTimeline(hobby, [log('2026-02-01'), log('2026-02-10'), log('2026-06-10'), log('2026-06-12')], []);
  const kinds = months.flatMap((m) => m.items.map((i) => (i.kind === 'gap' ? `gap:${i.weeks}` : i.kind)));

  it('tells the story newest first, grouped by month', () => {
    expect(months.map((m) => m.key)).toEqual(['2026-06', '2026-03', '2026-02', '2026-01']);
    // Same-time events sort with the log first (it was added to the list first), then the status change.
    // No gap here: the pause and the return already explain the break.
    expect(kinds).toEqual(['log', 'log', 'status', 'status', 'log', 'log', 'started']);
  });

  it('shows an unexplained long break as a quiet gap, but not a short one', () => {
    const plain = { ...hobby, history: [] };
    const items = buildTimeline(plain, [log('2026-02-01'), log('2026-02-10'), log('2026-04-10')], [])
      .flatMap((m) => m.items.map((i) => (i.kind === 'gap' ? `gap:${i.weeks}` : i.kind)));
    expect(items).toEqual(['log', 'gap:8', 'log', 'log', 'started']);
  });

  it('knows a return from a pause', () => {
    const back = months[0].items.find((i) => i.kind === 'status');
    expect(back).toMatchObject({ status: 'active', from: 'paused' });
  });
});

describe('yearStrip', () => {
  it('shades each of the last 12 months without numbers', () => {
    const logs = [log('2026-10-01'), log('2026-10-02'), log('2026-10-03'), log('2026-09-01'), log('2025-10-20')];
    const strip = yearStrip(logs, '2026-10-23');
    expect(strip).toHaveLength(12);
    expect(strip[0].key).toBe('2025-11');
    expect(strip.at(-1)).toMatchObject({ key: '2026-10', level: 2 });
    expect(strip.at(-2)).toMatchObject({ key: '2026-09', level: 1 });
    expect(strip.some((m) => m.key === '2025-10')).toBe(false);
  });
});
