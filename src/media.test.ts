import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { addMedia, backToUpNext, finishMedia, moveToFront, startMedia, undoFinish } from './media';

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

const titles = async () => (await db.media.where('status').equals('upNext').sortBy('order')).map((m) => m.title);

describe('books and shows', () => {
  it('keeps at most 5 in Up next', async () => {
    for (let i = 1; i <= 5; i++) expect(await addMedia('book', `Book ${i}`)).toBe(true);
    expect(await addMedia('show', 'One too many')).toBe(false);
    expect(await db.media.count()).toBe(5);
  });

  it('moves one to the front of Up next', async () => {
    await addMedia('book', 'A');
    await addMedia('book', 'B');
    const b = (await db.media.toArray()).find((m) => m.title === 'B')!;
    await moveToFront(b.id);
    expect(await titles()).toEqual(['B', 'A']);
  });

  it('goes from Up next to Currently to Finished, logging the finish, and undo takes it back', async () => {
    await addMedia('book', 'The Overstory');
    const book = (await db.media.toArray())[0];
    await startMedia(book.id);
    expect((await db.media.get(book.id))!.status).toBe('current');

    const undo = await finishMedia((await db.media.get(book.id))!);
    expect((await db.media.get(book.id))!.status).toBe('finished');
    expect(await db.logs.get(undo.logId)).toMatchObject({ title: 'The Overstory', refType: 'media', refId: book.id });

    await undoFinish(book.id, undo);
    const after = (await db.media.get(book.id))!;
    expect(after.status).toBe('current');
    expect(after.finishedAt).toBeUndefined();
    expect(await db.logs.count()).toBe(0);
  });

  it('only goes back to Up next if there is room', async () => {
    for (let i = 1; i <= 6; i++) await db.media.add({ id: `m${i}`, kind: 'book', title: `${i}`, status: i === 6 ? 'current' : 'upNext', order: i });
    expect(await backToUpNext('m6')).toBe(false);
    await db.media.delete('m1');
    expect(await backToUpNext('m6')).toBe(true);
    expect((await titles()).at(-1)).toBe('6');
  });
});
