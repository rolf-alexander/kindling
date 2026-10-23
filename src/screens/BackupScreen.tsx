import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { type Backup, createBackupFile, readBackup, restoreBackup, shareBackup } from '../backup';
import { Screen } from '../components/Screen';
import { db } from '../db';
import { daysAgo } from '../lib/dates';

export function BackupScreen() {
  const lastBackupAt = useLiveQuery(() => db.settings.get('lastBackupAt'))?.value as number | undefined;
  const [preparing, setPreparing] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [chosen, setChosen] = useState<Backup | null>(null);
  const [message, setMessage] = useState('');

  // Two taps: the first gathers everything, the second opens the share sheet (see shareBackup).
  const prepare = async () => {
    setPreparing(true);
    setMessage('');
    try {
      setFile(await createBackupFile());
    } catch {
      setMessage("The backup couldn't be prepared. Please try again.");
    } finally {
      setPreparing(false);
    }
  };

  const share = async () => {
    if ((await shareBackup(file!)) === 'saved') {
      setFile(null);
      setMessage('Backup saved.');
    }
  };

  const choose = async (file: File | undefined) => {
    if (!file) return;
    setMessage('');
    try {
      setChosen(await readBackup(file));
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  const restore = async () => {
    await restoreBackup(chosen!);
    setChosen(null);
    setMessage('Restored. Everything is back as it was in that backup.');
  };

  return (
    <Screen title="Backup" back={{ label: 'More', path: '/more' }}>
      <h2 className="section-header">Save a backup</h2>
      <div className="card">
        <div className="row-between">
          <span>Last backup</span>
          <span className="muted">{lastBackupAt ? daysAgo(lastBackupAt) : 'not yet'}</span>
        </div>
        {file ? (
          <button className="button" style={{ marginTop: 12 }} onClick={share}>Share backup file</button>
        ) : (
          <button className="button" style={{ marginTop: 12 }} disabled={preparing} onClick={prepare}>
            {preparing ? 'Preparing…' : 'Save a backup'}
          </button>
        )}
      </div>
      <p className="note">
        Everything, including photos, goes into one file. Choose <b>Save to Files</b> and keep it in iCloud Drive.
      </p>

      <h2 className="section-header">Restore</h2>
      {chosen ? (
        <div className="card">
          <p style={{ marginTop: 0 }}>
            This backup is from <b>{new Date(chosen.exportedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</b>
            {' '}and has {chosen.tables.hobbies?.length ?? 0} hobbies, {chosen.tables.activities?.length ?? 0} activities
            and {chosen.tables.logs?.length ?? 0} logs.
          </p>
          <p className="muted" style={{ fontSize: 15 }}>
            Restoring replaces everything currently in Kindling with this backup.
          </p>
          <div className="stack">
            <button className="button" onClick={restore}>Replace with this backup</button>
            <button className="button secondary" onClick={() => setChosen(null)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="card">
          <label className="button secondary">
            Choose a backup file
            <input type="file" accept="application/json,.json" hidden onChange={(e) => choose(e.target.files?.[0])} />
          </label>
        </div>
      )}

      {message && <p className="note">{message}</p>}
    </Screen>
  );
}
