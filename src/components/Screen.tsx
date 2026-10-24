import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { navigate } from '../lib/router';

interface ScreenProps {
  title: string;
  /** A small line above the title, e.g. the date. */
  eyebrow?: string;
  /** Adds a "‹ Back" link to the given screen. */
  back?: { label: string; path: string };
  /** A soft warm glow behind the title (used on Today). */
  tinted?: boolean;
  children: ReactNode;
}

/** A page with an iOS-style large title. */
export function Screen({ title, eyebrow, back, tinted, children }: ScreenProps) {
  return (
    <main className={['screen', tinted && 'tinted', back && 'pushed'].filter(Boolean).join(' ')}>
      {back && (
        <button className="back" onClick={() => navigate(back.path)}>
          <ChevronLeft size={24} strokeWidth={2.2} />
          {back.label}
        </button>
      )}
      {eyebrow && <p className="screen-eyebrow">{eyebrow}</p>}
      <h1 className="large-title">{title}</h1>
      {children}
    </main>
  );
}

/** A calm placeholder for when there's nothing to show yet. */
export function Empty({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="card empty">
      <div className="empty-icon">{icon}</div>
      <h2>{title}</h2>
      <p>{children}</p>
    </div>
  );
}
