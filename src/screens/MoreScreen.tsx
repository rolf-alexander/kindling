import { BookOpen, ChevronRight, ClipboardPaste, HardDriveDownload, ListTodo, type LucideIcon, Target } from 'lucide-react';
import { Screen } from '../components/Screen';
import { db } from '../db';
import { daysAgo } from '../lib/dates';
import { navigate } from '../lib/router';
import { useLive } from '../lib/useLive';

type Row = { label: string; Icon: LucideIcon; path: string; tint: string; detail?: string };

export function MoreScreen() {
  const lastBackupAt = useLive('more', () => db.settings.get('lastBackupAt'))?.value as number | undefined;

  const sections: { header: string; rows: Row[] }[] = [
    {
      header: 'Lists',
      rows: [
        { label: 'Important tasks', Icon: ListTodo, path: '/more/tasks', tint: 'var(--hobby-sky)' },
        { label: 'Books & shows', Icon: BookOpen, path: '/more/media', tint: 'var(--media)' },
        { label: 'Goals', Icon: Target, path: '/more/goals', tint: 'var(--hobby-sage)' },
      ],
    },
    {
      header: 'Your data',
      rows: [
        { label: 'Paste in activities', Icon: ClipboardPaste, path: '/more/import', tint: 'var(--hobby-lilac)' },
        // A quiet line, never a warning: just when the last backup was.
        { label: 'Backup & restore', Icon: HardDriveDownload, path: '/more/backup', tint: 'var(--neutral)', detail: lastBackupAt ? daysAgo(lastBackupAt) : undefined },
      ],
    },
  ];

  return (
    <Screen title="More">
      {sections.map(({ header, rows }) => (
        <section key={header}>
          <h2 className="section-header">{header}</h2>
          <div className="list">
            {rows.map(({ label, Icon, path, tint, detail }) => (
              <button className="list-row" key={label} onClick={() => navigate(path)}>
                <span className="icon-tile" style={{ background: tint, color: '#fff' }}><Icon size={16} /></span>
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
