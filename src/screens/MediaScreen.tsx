import { useLiveQuery } from 'dexie-react-hooks';
import { BookOpen, Camera, Plus, Tv } from 'lucide-react';
import { useState } from 'react';
import { PhotoThumb } from '../components/PhotoThumb';
import { Empty, Screen } from '../components/Screen';
import { Sheet } from '../components/Sheet';
import { useUndoToast } from '../components/UndoToast';
import { config } from '../config';
import { db, type Media } from '../db';
import { savePhoto } from '../lib/photos';
import {
  addMedia, backToUpNext, finishMedia, moveToFront, removeMedia, setCover, startMedia, undoFinish, updateMedia,
} from '../media';

const KIND_LABEL = { book: 'Book', show: 'Show' } as const;
const shortDate = (at: number) => new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/** The cover photo, or a soft tile with a book or TV icon. With onPhoto, tapping it opens the camera. */
function Cover({ media, size, onPhoto }: { media: Media; size: number; onPhoto?: (file: File) => void }) {
  const Icon = media.kind === 'book' ? BookOpen : Tv;
  if (media.photoId) return <PhotoThumb photoId={media.photoId} size={size} />;
  const tile = (
    <span className="cover-tile" style={{ width: size, height: size }}>
      {onPhoto ? <Camera size={size > 40 ? 22 : 16} /> : <Icon size={size > 40 ? 22 : 16} />}
    </span>
  );
  if (!onPhoto) return tile;
  return (
    <label aria-label="Take a cover photo">
      {tile}
      <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && onPhoto(e.target.files[0])} />
    </label>
  );
}

export function MediaScreen() {
  const media = useLiveQuery(() => db.media.toArray());
  const [editing, setEditing] = useState<{ media?: Media } | null>(null);
  const toast = useUndoToast();
  if (!media) return null; // still loading

  const back = { label: 'More', path: '/more' };
  const current = media.filter((m) => m.status === 'current').sort((a, b) => (a.startedAt ?? 0) - (b.startedAt ?? 0));
  const upNext = media.filter((m) => m.status === 'upNext').sort((a, b) => a.order - b.order);
  const finished = media.filter((m) => m.status === 'finished').sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0));
  const years = [...new Set(finished.map((m) => new Date(m.finishedAt ?? 0).getFullYear()))];

  const finish = async (m: Media) => {
    const undo = await finishMedia(m);
    toast.show(<>Finished <b>{m.title}</b></>, () => undoFinish(m.id, undo));
  };
  const cover = async (m: Media, file: File) => setCover(m.id, await savePhoto(file));
  const sheet = editing && <MediaSheet media={editing.media} full={upNext.length >= config.maxUpNext} onClose={() => setEditing(null)} />;

  if (media.length === 0) {
    return (
      <Screen title="Books & shows" back={back}>
        <Empty icon={<BookOpen size={28} />} title="Nothing here yet">
          Keep up to {config.maxUpNext} books and shows in Up next. Start one, take a photo of its cover, and when you
          finish it, it joins your Reading & Watching story.
        </Empty>
        <button className="button" style={{ marginTop: 16 }} onClick={() => setEditing({})}><Plus size={18} /> Add a book or show</button>
        {sheet}
      </Screen>
    );
  }

  return (
    <Screen title="Books & shows" back={back}>
      {current.length > 0 && (
        <>
          <h2 className="section-header">Currently</h2>
          <div className="stack">
            {current.map((m) => (
              <div className="card media-card" key={m.id}>
                <Cover media={m} size={64} onPhoto={m.photoId ? undefined : (file) => cover(m, file)} />
                <button className="row-button" onClick={() => setEditing({ media: m })}>
                  <span className="label">
                    <span className="doable-title">{m.title}</span>
                    <span className="row-subtitle">
                      {m.kind === 'book' ? 'Reading' : 'Watching'} since {shortDate(m.startedAt ?? Date.now())}
                      {!m.photoId && ' · tap the camera for a cover'}
                    </span>
                  </span>
                </button>
                <button className="pill-button" onClick={() => finish(m)}>Finished</button>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="section-header">Up next</h2>
      <div className="list">
        {upNext.map((m) => (
          <div className="list-row" key={m.id}>
            <Cover media={m} size={28} />
            <button className="row-button" onClick={() => setEditing({ media: m })}>
              <span className="label">
                {m.title}
                <span className="row-subtitle">{KIND_LABEL[m.kind]}</span>
              </span>
            </button>
            <button className="pill-button" onClick={() => startMedia(m.id)}>Start</button>
          </div>
        ))}
        {upNext.length < config.maxUpNext ? (
          <button className="list-row" onClick={() => setEditing({})}>
            <span className="icon-tile"><Plus size={16} /></span>
            <span className="label" style={{ color: 'var(--accent)' }}>Add a book or show</span>
          </button>
        ) : (
          <p className="note" style={{ margin: 0, padding: '10px 16px' }}>
            Up next holds {config.maxUpNext}, so it stays a shortlist. Start one to make room.
          </p>
        )}
      </div>

      {years.map((year) => (
        <section key={year}>
          <h2 className="section-header">Reading & Watching · {year}</h2>
          <div className="list">
            {finished.filter((m) => new Date(m.finishedAt ?? 0).getFullYear() === year).map((m) => (
              <button className="list-row" key={m.id} onClick={() => setEditing({ media: m })}>
                <Cover media={m} size={40} />
                <span className="label">
                  {m.title}
                  <span className="row-subtitle">{KIND_LABEL[m.kind]} · finished {shortDate(m.finishedAt ?? 0)}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}
      {sheet}
      {toast.element}
    </Screen>
  );
}

/** Add a book or show, or change one: title, kind, cover photo, and moving it around. */
function MediaSheet({ media, full, onClose }: { media?: Media; full: boolean; onClose: () => void }) {
  const [title, setTitle] = useState(media?.title ?? '');
  const [kind, setKind] = useState<Media['kind']>(media?.kind ?? 'book');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (media) await updateMedia(media.id, { title, kind });
    else await addMedia(kind, title);
    onClose();
  };
  const run = (action: () => Promise<unknown>) => async () => {
    await action();
    onClose();
  };
  const choosePhoto = async (file: File | undefined) => {
    if (!file || !media) return;
    setBusy(true);
    try {
      await setCover(media.id, await savePhoto(file));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet onClose={onClose}>
      <h2 className="sheet-title">{media ? 'Edit' : 'Add to Up next'}</h2>
      <input className="text-field" value={title} onChange={(e) => setTitle(e.target.value)}
        placeholder="Title" autoFocus={!media} />
      <div className="chips" style={{ marginTop: 12 }}>
        {(['book', 'show'] as const).map((k) => (
          <button key={k} className="chip" aria-pressed={kind === k} onClick={() => setKind(k)}>{KIND_LABEL[k]}</button>
        ))}
      </div>

      {media && media.status !== 'upNext' && (
        <label className="button secondary" style={{ marginTop: 16 }} aria-disabled={busy}>
          <Camera size={18} /> {media.photoId ? 'Retake cover photo' : 'Take a cover photo'}
          <input type="file" accept="image/*" hidden onChange={(e) => choosePhoto(e.target.files?.[0])} />
        </label>
      )}

      <div className="stack" style={{ marginTop: 20 }}>
        <button className="button" disabled={!title.trim() || (!media && full)} onClick={save}>{media ? 'Save' : 'Add'}</button>
        {media?.status === 'upNext' && (
          <button className="button secondary" onClick={run(() => moveToFront(media.id))}>Move to the top</button>
        )}
        {media?.status === 'current' && !full && (
          <button className="button secondary" onClick={run(() => backToUpNext(media.id))}>Back to Up next</button>
        )}
        {media && <button className="button secondary" onClick={run(() => removeMedia(media.id))}>Remove</button>}
      </div>
      {!media && full && <p className="hint" style={{ textAlign: 'center' }}>Up next is full. Start one to make room.</p>}
    </Sheet>
  );
}
