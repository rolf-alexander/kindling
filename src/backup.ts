// Backup and restore: everything in Kindling, including photos, in one .json file.

import { db, type Photo } from './db';
import { today } from './lib/dates';

const TABLES = ['hobbies', 'projects', 'steps', 'activities', 'tasks', 'routines', 'goals', 'plans', 'logs', 'media', 'settings'] as const;

export interface Backup {
  app: 'kindling';
  format: 1;
  exportedAt: number;
  tables: Record<(typeof TABLES)[number], unknown[]>;
  /** Photos are stored as text ("data URLs") because a .json file can't hold images directly. */
  photos: { id: string; createdAt: number; dataUrl: string }[];
}

/** Gathers everything into one file. Done before sharing, see shareBackup. */
export async function createBackupFile(): Promise<File> {
  const tables = {} as Backup['tables'];
  for (const name of TABLES) tables[name] = await db.table(name).toArray();
  const photos = await Promise.all(
    (await db.photos.toArray()).map(async (p) => ({ id: p.id, createdAt: p.createdAt, dataUrl: await blobToDataUrl(p.blob) })),
  );
  const backup: Backup = { app: 'kindling', format: 1, exportedAt: Date.now(), tables, photos };
  return new File([JSON.stringify(backup)], `kindling-backup-${today()}.json`, { type: 'application/json' });
}

/**
 * Opens the iPhone share sheet with a prepared backup file (choose "Save to Files").
 * iOS only opens the share sheet straight after a tap, so this must be called directly from a tap,
 * with the file already prepared; gathering the data first takes too long.
 */
export async function shareBackup(file: File): Promise<'saved' | 'cancelled'> {
  let shared = false;
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      shared = true;
    } catch (error) {
      if ((error as Error).name === 'AbortError') return 'cancelled';
      // Sharing isn't allowed here for some reason: fall back to downloading.
    }
  }
  if (!shared) download(file);
  await db.settings.put({ key: 'lastBackupAt', value: Date.now() });
  return 'saved';
}

function download(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Reads a chosen backup file and checks it really is a Kindling backup. */
export async function readBackup(file: File): Promise<Backup> {
  let data: Partial<Backup>;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error("That file couldn't be read. Is it a Kindling backup (.json)?");
  }
  if (data.app !== 'kindling' || !data.tables) throw new Error("That file isn't a Kindling backup.");
  return data as Backup;
}

/** Replaces everything in Kindling with the backup's contents. */
export async function restoreBackup(backup: Backup) {
  // Turn photos back into images first: this can't happen inside the database transaction below.
  const photos: Photo[] = await Promise.all(
    (backup.photos ?? []).map(async (p) => ({ id: p.id, createdAt: p.createdAt, blob: await (await fetch(p.dataUrl)).blob() })),
  );
  const tables = [...TABLES.map((name) => db.table(name)), db.photos];
  // All or nothing: if anything goes wrong, the current data is left exactly as it was.
  await db.transaction('rw', tables, async () => {
    for (const table of tables) await table.clear();
    for (const name of TABLES) await db.table(name).bulkAdd(backup.tables[name] ?? []);
    await db.photos.bulkAdd(photos);
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
