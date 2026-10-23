import type { ReactNode } from 'react';

/** A page with an iOS-style large title, and an optional small line above it. */
export function Screen({ title, eyebrow, children }: { title: string; eyebrow?: string; children: ReactNode }) {
  return (
    <main className="screen">
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
