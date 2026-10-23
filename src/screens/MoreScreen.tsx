import { BookOpen, ChevronRight, ClipboardPaste, HardDriveDownload, ListTodo, type LucideIcon, Target } from 'lucide-react';
import { Screen } from '../components/Screen';
import { navigate } from '../lib/router';

/** A row without a path isn't built yet. */
type Row = { label: string; Icon: LucideIcon; path?: string };

const sections: { header: string; rows: Row[] }[] = [
  {
    header: 'Lists',
    rows: [
      { label: 'Important tasks', Icon: ListTodo },
      { label: 'Books & shows', Icon: BookOpen },
      { label: 'Goals', Icon: Target },
    ],
  },
  {
    header: 'Your data',
    rows: [
      { label: 'Paste in activities', Icon: ClipboardPaste, path: '/more/import' },
      { label: 'Backup & restore', Icon: HardDriveDownload, path: '/more/backup' },
    ],
  },
];

export function MoreScreen() {
  return (
    <Screen title="More">
      {sections.map(({ header, rows }) => (
        <section key={header}>
          <h2 className="section-header">{header}</h2>
          <div className="list">
            {rows.map(({ label, Icon, path }) => (
              <button className="list-row" key={label} disabled={!path} onClick={() => path && navigate(path)}>
                <span className="icon-tile"><Icon size={16} /></span>
                <span className="label">{label}</span>
                {path ? <ChevronRight size={18} className="chevron" /> : <span className="detail">Soon</span>}
              </button>
            ))}
          </div>
        </section>
      ))}
    </Screen>
  );
}
