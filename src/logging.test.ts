import 'fake-indexeddb/auto'; // a stand-in for the phone's database, so these tests can run on a computer
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { logIt, undoLog, updateLogDetails } from './logging';

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe('logIt', () => {
  it('records a log with a snapshot of what it was about', async () => {
    const undo = await logIt({ title: 'Edit photos', refType: 'activity', refId: 'a1', hobbyId: 'h1', goalIds: ['g1'] });
    const log = await db.logs.get(undo.logId);
    expect(log).toMatchObject({ title: 'Edit photos', refType: 'activity', refId: 'a1', hobbyId: 'h1', goalIds: ['g1'] });
    expect(log!.day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('brings a paused hobby back to active, and undo pauses it again', async () => {
    await db.hobbies.add({ id: 'h1', name: 'Chess', status: 'paused', colour: 'sky', createdAt: 0 });
    const undo = await logIt({ title: 'Puzzle', refType: 'adhoc', hobbyId: 'h1', goalIds: [] });
    expect((await db.hobbies.get('h1'))!.status).toBe('active');
    await undoLog(undo);
    expect((await db.hobbies.get('h1'))!.status).toBe('paused');
    expect(await db.logs.count()).toBe(0);
  });

  it('marks a task done, and undo reopens it', async () => {
    await db.tasks.add({ id: 't1', title: 'Wax skis', energy: 'medium', createdAt: 0 });
    const undo = await logIt({ title: 'Wax skis', refType: 'task', refId: 't1', goalIds: [] });
    expect((await db.tasks.get('t1'))!.doneAt).toBeTypeOf('number');
    await undoLog(undo);
    expect((await db.tasks.get('t1'))!.doneAt).toBeUndefined();
  });

  it('finishes a project step, unless it was only worked on', async () => {
    await db.steps.bulkAdd([
      { id: 's1', projectId: 'p1', title: 'Pick shots', energy: 'low', order: 0 },
      { id: 's2', projectId: 'p1', title: 'Layout', energy: 'low', order: 1 },
    ]);
    await logIt({ title: 'Pick shots', refType: 'step', refId: 's1', projectId: 'p1', goalIds: [] });
    await logIt({ title: 'Layout', refType: 'step', refId: 's2', projectId: 'p1', goalIds: [] }, { stepFinished: false });
    expect((await db.steps.get('s1'))!.doneAt).toBeTypeOf('number');
    expect((await db.steps.get('s2'))!.doneAt).toBeUndefined();
    expect(await db.logs.count()).toBe(2);
  });

  it('can add details afterwards', async () => {
    const undo = await logIt({ title: 'Walk', refType: 'adhoc', goalIds: [] });
    await updateLogDetails(undo.logId, { note: 'Lovely light', durationMin: 45 });
    expect(await db.logs.get(undo.logId)).toMatchObject({ note: 'Lovely light', durationMin: 45 });
  });
});
