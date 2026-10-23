import { type ReactNode, useEffect } from 'react';

/** A panel that slides up from the bottom, iOS style. Tapping the dimmed background closes it. */
export function Sheet({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  // Stop the page behind from scrolling while the sheet is open.
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
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
