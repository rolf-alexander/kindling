import { useLiveQuery } from 'dexie-react-hooks';
import { Camera, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { db, type Hobby, type Log } from '../db';
import { colourVar } from '../lib/labels';
import { savePhoto } from '../lib/photos';
import { type LogTarget, logIt, type Undo, updateLogDetails } from '../logging';
import { Sheet } from './Sheet';

const DURATIONS = [15, 30, 45, 60, 90, 120];
const durationLabel = (min: number) => (min < 60 ? `${min}m` : `${min / 60}h`.replace('.5h', '½h'));

interface LogSheetProps {
  /** What's being logged. Leave out when editing an existing log. */
  target?: LogTarget;
  /** An existing log whose details are being added or changed. */
  existing?: Log;
  context?: string;
  colour?: string;
  /** Hobbies to choose from when logging something new. */
  hobbies: Hobby[];
  onClose: () => void;
  onLogged?: (undo: Undo) => void;
}

/** Log something, with an optional note, duration and photo. Also used to add details to a log afterwards. */
export function LogSheet({ target, existing, context, colour, hobbies, onClose, onLogged }: LogSheetProps) {
  const [note, setNote] = useState(existing?.note ?? '');
  const [duration, setDuration] = useState<number | undefined>(existing?.durationMin);
  const [photoId, setPhotoId] = useState<string | undefined>(existing?.photoId);
  const [hobbyId, setHobbyId] = useState<string | undefined>(target?.hobbyId);
  const [busy, setBusy] = useState(false);

  const title = existing?.title ?? target?.title ?? '';
  const isNew = target?.refType === 'adhoc';
  const isStep = target?.refType === 'step';

  // Show the chosen photo.
  const photo = useLiveQuery(() => (photoId ? db.photos.get(photoId) : undefined), [photoId]);
  const photoUrl = useMemo(() => (photo ? URL.createObjectURL(photo.blob) : undefined), [photo]);
  useEffect(() => () => {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
  }, [photoUrl]);

  const choosePhoto = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const id = await savePhoto(file);
      if (photoId && photoId !== existing?.photoId) await db.photos.delete(photoId);
      setPhotoId(id);
    } finally {
      setBusy(false);
    }
  };

  // Closing without saving: remove a photo that was taken but never attached.
  const cancel = async () => {
    if (photoId && photoId !== existing?.photoId) await db.photos.delete(photoId);
    onClose();
  };

  const save = async (stepFinished?: boolean) => {
    setBusy(true);
    const details = { note: note.trim(), durationMin: duration, photoId };
    if (existing) {
      await updateLogDetails(existing.id, details);
    } else if (target) {
      const undo = await logIt({ ...target, hobbyId }, { ...details, stepFinished });
      onLogged?.(undo);
    }
    onClose();
  };

  return (
    <Sheet onClose={cancel}>
      <div className="sheet-header">
        {context && (
          <span className="sheet-context">
            <span className="dot" style={{ background: colour }} /> {context}
          </span>
        )}
        <h2 className="sheet-title">{title}</h2>
      </div>

      {isNew && hobbies.length > 0 && (
        <>
          <p className="field-label">Hobby (optional)</p>
          <div className="chips">
            {hobbies.map((h) => (
              <button key={h.id} className="chip" aria-pressed={hobbyId === h.id}
                onClick={() => setHobbyId(hobbyId === h.id ? undefined : h.id)}>
                <span className="dot" style={{ background: colourVar(h.colour) }} /> {h.name}
              </button>
            ))}
          </div>
        </>
      )}

      <p className="field-label">How long (optional)</p>
      <div className="chips">
        {DURATIONS.map((min) => (
          <button key={min} className="chip" aria-pressed={duration === min}
            onClick={() => setDuration(duration === min ? undefined : min)}>
            {durationLabel(min)}
          </button>
        ))}
      </div>

      <p className="field-label">Note (optional)</p>
      <textarea className="note-field" rows={2} value={note} onChange={(e) => setNote(e.target.value)}
        placeholder="How did it go?" />

      {photoUrl ? (
        <div className="photo-preview">
          <img src={photoUrl} alt="" />
          <button className="photo-remove" aria-label="Remove photo" onClick={() => setPhotoId(undefined)}>
            <X size={16} />
          </button>
        </div>
      ) : (
        <label className="button secondary" style={{ marginTop: 14 }}>
          <Camera size={18} /> Add a photo
          <input type="file" accept="image/*" hidden onChange={(e) => choosePhoto(e.target.files?.[0])} />
        </label>
      )}

      <div className="stack" style={{ marginTop: 18 }}>
        {existing ? (
          <button className="button" disabled={busy} onClick={() => save()}>Save</button>
        ) : isStep ? (
          <>
            <button className="button" disabled={busy} onClick={() => save(true)}>Step done</button>
            <button className="button secondary" disabled={busy} onClick={() => save(false)}>Worked on it</button>
          </>
        ) : (
          <button className="button" disabled={busy} onClick={() => save()}>Done</button>
        )}
      </div>
    </Sheet>
  );
}
