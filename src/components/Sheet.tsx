import { type ReactNode, useEffect } from 'react';

/** A panel that slides up from the bottom, iOS style. Tapping the dimmed background closes it. */
export function Sheet({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  // Stop the page behind from scrolling while the sheet is open. On iPhone "overflow: hidden" alone isn't enough,
  // so the page is pinned in place where it was, then put back when the sheet closes.
  useEffect(() => {
    const y = window.scrollY;
    Object.assign(document.body.style, { position: 'fixed', top: `-${y}px`, left: '0', right: '0' });
    return () => {
      Object.assign(document.body.style, { position: '', top: '', left: '', right: '' });
      window.scrollTo(0, y);
    };
  }, []);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grabber" />
        {children}
      </div>
    </div>
  );
}
