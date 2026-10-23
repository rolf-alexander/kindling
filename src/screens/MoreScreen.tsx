import { BookOpen, ClipboardPaste, HardDriveDownload, ListTodo, Target } from 'lucide-react';
import { Screen } from '../components/Screen';

const sections = [
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
      { label: 'Paste in activities', Icon: ClipboardPaste },
      { label: 'Backup & restore', Icon: HardDriveDownload },
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
            {rows.map(({ label, Icon }) => (
              <div className="list-row" key={label}>
                <span className="icon-tile"><Icon size={16} /></span>
                <span className="label">{label}</span>
                <span className="detail">Soon</span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </Screen>
  );
}
