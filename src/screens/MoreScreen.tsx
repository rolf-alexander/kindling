import { useLiveQuery } from 'dexie-react-hooks';
import { BookOpen, ChevronRight, ClipboardPaste, HardDriveDownload, ListTodo, type LucideIcon, Target } from 'lucide-react';
import { Screen } from '../components/Screen';
import { db } from '../db';
import { daysAgo } from '../lib/dates';
import { navigate } from '../lib/router';

type Row = { label: string; Icon: LucideIcon; path: string; detail?: string };

export function MoreScreen() {
  const lastBackupAt = useLiveQuery(() => db.settings.get('lastBackupAt'))?.value as number | undefined;

  const sections: { header: string; rows: Row[] }[] = [
    {
      header: 'Lists',
      rows: [
        { label: 'Important tasks', Icon: ListTodo, path: '/more/tasks' },
        { label: 'Books & shows', Icon: BookOpen, path: '/more/media' },
        { label: 'Goals', Icon: Target, path: '/more/goals' },
      ],
    },
    {
      header: 'Your data',
      rows: [
        { label: 'Paste in activities', Icon: ClipboardPaste, path: '/more/import' },
        // A quiet line, never a warning: just when the last backup was.
        { label: 'Backup & restore', Icon: HardDriveDownload, path: '/more/backup', detail: lastBackupAt ? daysAgo(lastBackupAt) : undefined },
      ],
    },
  ];

  return (
    <Screen title="More">
      {sections.map(({ header, rows }) => (
        <section key={header}>
          <h2 className="section-header">{header}</h2>
          <div className="list">
            {rows.map(({ label, Icon, path, detail }) => (
              <button className="list-row" key={label} onClick={() => navigate(path)}>
                <span className="icon-tile"><Icon size={16} /></span>
                <span className="label">{label}</span>
                {detail && <span className="detail">{detail}</span>}
                <ChevronRight size={18} className="chevron" />
              </button>
            ))}
          </div>
        </section>
      ))}
    </Screen>
  );
}
