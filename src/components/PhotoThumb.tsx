import { useEffect, useMemo } from 'react';
import { db } from '../db';
import { useLive } from '../lib/useLive';

/** A small square preview of a saved photo. */
export function PhotoThumb({ photoId, size = 48 }: { photoId: string; size?: number }) {
  const photo = useLive('photo', () => db.photos.get(photoId), [photoId]);
  const url = useMemo(() => (photo ? URL.createObjectURL(photo.blob) : undefined), [photo]);
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);
  if (!url) return null;
  return <img className="photo-thumb" src={url} alt="" style={{ width: size, height: size }} />;
}
