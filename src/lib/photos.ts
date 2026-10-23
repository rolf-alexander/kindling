import { config } from '../config';
import { db } from '../db';
import { newId } from './ids';

/** Shrinks a photo on the phone (longest side to config.photoMaxSide) and saves it. Returns its ID. */
export async function savePhoto(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, config.photoMaxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Photo could not be saved'))), 'image/jpeg', 0.8),
  );
  const id = newId();
  await db.photos.add({ id, blob, createdAt: Date.now() });
  return id;
}
