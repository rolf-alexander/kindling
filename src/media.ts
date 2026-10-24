// Books and shows: Up next (at most config.maxUpNext) → Currently (with a cover photo you take) → Finished.
// Finishing one logs it to the Reading & Watching timeline rather than to a hobby (D9).

import { config } from './config';
import { db, type Media } from './db';
import { newId } from './lib/ids';
import { logIt, type Undo, undoLog } from './logging';

const upNext = () => db.media.where('status').equals('upNext').toArray();

/** Adds to the end of Up next. Returns false (and adds nothing) if Up next is full. */
export async function addMedia(kind: Media['kind'], title: string) {
  const list = await upNext();
  if (list.length >= config.maxUpNext) return false;
  const order = Math.max(-1, ...list.map((m) => m.order)) + 1;
  await db.media.add({ id: newId(), kind, title: title.trim(), status: 'upNext', order });
  return true;
}

export async function updateMedia(id: string, changes: { title: string; kind: Media['kind'] }) {
  // A new title is worth a fresh cover search (only used while it has no cover).
  await db.media.update(id, { title: changes.title.trim(), kind: changes.kind, coverLookedUp: false });
}

export async function startMedia(id: string) {
  await db.media.update(id, { status: 'current', startedAt: Date.now() });
}

/** Puts something back in Up next. Returns false if Up next is full. */
export async function backToUpNext(id: string) {
  const list = await upNext();
  if (list.length >= config.maxUpNext) return false;
  await db.media.update(id, { status: 'upNext', startedAt: undefined, order: Math.max(-1, ...list.map((m) => m.order)) + 1 });
  return true;
}

/** Moves something to the front of Up next. */
export async function moveToFront(id: string) {
  const list = await upNext();
  await db.media.update(id, { order: Math.min(0, ...list.map((m) => m.order)) - 1 });
}

/** Marks it finished and logs it. Returns what's needed to undo both. */
export async function finishMedia(media: Media): Promise<Undo> {
  const undo = await logIt({ title: media.title, refType: 'media', refId: media.id, goalIds: [] });
  await db.media.update(media.id, { status: 'finished', finishedAt: Date.now() });
  return undo;
}

export async function undoFinish(mediaId: string, undo: Undo) {
  await undoLog(undo);
  await db.media.update(mediaId, { status: 'current', finishedAt: undefined });
}

/** Saves a new cover photo, removing the old one. */
export async function setCover(id: string, photoId: string | undefined) {
  const media = await db.media.get(id);
  if (media?.photoId && media.photoId !== photoId) await db.photos.delete(media.photoId);
  await db.media.update(id, { photoId });
}

/** Removes it entirely, with its cover. A finished one's log stays on the calendar. */
export async function removeMedia(id: string) {
  await setCover(id, undefined);
  await db.media.delete(id);
}
