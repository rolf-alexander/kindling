// Finding covers online: books from Open Library, shows from TVmaze. Both are free, need no account, and allow
// a web app to ask them directly. Only the title is sent (D28). If anything goes wrong (offline, nothing found),
// there's simply no cover and you can take a photo instead.

import { config } from './config';
import { db, type Media } from './db';
import { savePhoto } from './lib/photos';
import { setCover } from './media';

/** The web address of a likely cover image, or null if none was found. */
export async function findCoverUrl(kind: Media['kind'], title: string): Promise<string | null> {
  const q = encodeURIComponent(title.trim());
  if (kind === 'book') {
    const res = await fetch(`https://openlibrary.org/search.json?title=${q}&limit=1&fields=cover_i`);
    const id = (await res.json())?.docs?.[0]?.cover_i;
    return id ? `https://covers.openlibrary.org/b/id/${id}-M.jpg` : null;
  }
  const res = await fetch(`https://api.tvmaze.com/singlesearch/shows?q=${q}`);
  if (!res.ok) return null; // TVmaze answers "404" when nothing matches
  return (await res.json())?.image?.medium ?? null;
}

/** Books and shows being looked up right now, so the same one isn't fetched twice at once. */
const inFlight = new Set<string>();

/** Looks up a cover and saves it as the book's or show's photo. Returns true if one was found. */
export async function fetchCover(media: Media): Promise<boolean> {
  if (inFlight.has(media.id)) return false;
  inFlight.add(media.id);
  try {
    const url = await findCoverUrl(media.kind, media.title);
    if (!url) return false;
    const image = await fetch(url);
    if (!image.ok) return false;
    const photoId = await savePhoto(await image.blob());
    // It may have gained a photo of your own while this was loading; yours wins.
    if ((await db.media.get(media.id))?.photoId) {
      await db.photos.delete(photoId);
      return false;
    }
    await setCover(media.id, photoId);
    return true;
  } catch {
    return false;
  } finally {
    inFlight.delete(media.id);
    await db.media.update(media.id, { coverLookedUp: true });
  }
}

/** Looks up covers for anything that hasn't been tried yet, e.g. after pasting in a list. */
export async function fetchMissingCovers(media: Media[]) {
  if (!config.autoCovers || !navigator.onLine) return;
  for (const m of media.filter((m) => !m.photoId && !m.coverLookedUp)) await fetchCover(m);
}
