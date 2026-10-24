import { type ReactNode, useEffect, useRef, useState } from 'react';

interface Toast {
  text: ReactNode;
  onUndo: () => void;
}

/** A calm message like "Logged Skin care" with Undo, shown for 8 seconds. Undo makes a mis-tap cost nothing (D17). */
export function useUndoToast() {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const show = (text: ReactNode, onUndo: () => void) => {
    setToast({ text, onUndo });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 8000);
  };

  const element = toast && (
    <div className="toast" role="status">
      <span className="toast-text">{toast.text}</span>
      <button onClick={() => { setToast(null); toast.onUndo(); }}>Undo</button>
    </div>
  );
  return { show, element };
}
