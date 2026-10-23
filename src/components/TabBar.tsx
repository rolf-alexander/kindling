import { CalendarDays, Ellipsis, Sparkles, Sprout, Sun } from 'lucide-react';
import { navigate } from '../lib/router';

export const tabs = [
  { path: '/today', label: 'Today', Icon: Sun },
  { path: '/calendar', label: 'Calendar', Icon: CalendarDays },
  { path: '/hobbies', label: 'Hobbies', Icon: Sprout },
  { path: '/routines', label: 'Routines', Icon: Sparkles },
  { path: '/more', label: 'More', Icon: Ellipsis },
];

export function TabBar({ current }: { current: string }) {
  return (
    <nav className="tabbar">
      {tabs.map(({ path, label, Icon }) => (
        <button
          key={path}
          className="tab"
          aria-current={current === path ? 'page' : undefined}
          onClick={() => navigate(path)}
        >
          <Icon size={24} strokeWidth={current === path ? 2.2 : 1.8} />
          {label}
        </button>
      ))}
    </nav>
  );
}
