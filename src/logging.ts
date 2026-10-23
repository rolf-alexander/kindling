// Recording that you did something, and undoing it.

import { db, type RefType } from './db';
import { today } from './lib/dates';
import { newId } from './lib/ids';

/** What a log is about. A Doable (see suggest.ts) fits this shape, and so does something new ("adhoc"). */
export interface LogTarget {
  title: string;
  refType: RefType;
  refId?: string;
  hobbyId?: string;
  projectId?: string;
  goalIds: string[];
}

export interface LogDetails {
  note?: string;
  durationMin?: number;
  photoId?: string;
  /** For a project step: false means "worked on it" rather than "step done". */
  stepFinished?: boolean;
}

/** Everything needed to take a log back, including its side effects. */
export interface Undo {
  logId: string;
  title: string;
  finishedStepId?: string;
  finishedTaskId?: string;
  unpausedHobbyId?: string;
}

export async function logIt(target: LogTarget, details: LogDetails = {}): Promise<Undo> {
  const tables = [db.logs, db.steps, db.tasks, db.hobbies];
  return db.transaction('rw', tables, async () => {
    const now = Date.now();
    const undo: Undo = { logId: newId(), title: target.title };
    await db.logs.add({
      id: undo.logId,
      at: now,
      day: today(),
      title: target.title,
      refType: target.refType,
      refId: target.refId,
      hobbyId: target.hobbyId,
      projectId: target.projectId,
      goalIds: target.goalIds,
      note: details.note || undefined,
      durationMin: details.durationMin,
      photoId: details.photoId,
    });

    if (target.refType === 'step' && target.refId && details.stepFinished !== false) {
      await db.steps.update(target.refId, { doneAt: now });
      undo.finishedStepId = target.refId;
    }
    // One tap marks a task done, which archives it.
    if (target.refType === 'task' && target.refId) {
      await db.tasks.update(target.refId, { doneAt: now });
      undo.finishedTaskId = target.refId;
    }
    // Doing something from a paused hobby brings it back to active.
    if (target.hobbyId) {
      const hobby = await db.hobbies.get(target.hobbyId);
      if (hobby?.status === 'paused') {
        await db.hobbies.update(hobby.id, { status: 'active', history: [...(hobby.history ?? []), { at: now, status: 'active' }] });
        undo.unpausedHobbyId = hobby.id;
      }
    }
    return undo;
  });
}

export async function undoLog(undo: Undo) {
  const tables = [db.logs, db.photos, db.steps, db.tasks, db.hobbies];
  await db.transaction('rw', tables, async () => {
    const log = await db.logs.get(undo.logId);
    if (log?.photoId) await db.photos.delete(log.photoId);
    await db.logs.delete(undo.logId);
    // Setting a field to undefined removes it, so the step/task is open again.
    if (undo.finishedStepId) await db.steps.update(undo.finishedStepId, { doneAt: undefined });
    if (undo.finishedTaskId) await db.tasks.update(undo.finishedTaskId, { doneAt: undefined });
    if (undo.unpausedHobbyId) {
      const hobby = await db.hobbies.get(undo.unpausedHobbyId);
      await db.hobbies.update(undo.unpausedHobbyId, { status: 'paused', history: hobby?.history?.slice(0, -1) });
    }
  });
}

/** Adds or changes the optional details of an existing log. */
export async function updateLogDetails(logId: string, details: Pick<LogDetails, 'note' | 'durationMin' | 'photoId'>) {
  const log = await db.logs.get(logId);
  if (log?.photoId && log.photoId !== details.photoId) await db.photos.delete(log.photoId);
  await db.logs.update(logId, {
    note: details.note || undefined,
    durationMin: details.durationMin,
    photoId: details.photoId,
  });
}
