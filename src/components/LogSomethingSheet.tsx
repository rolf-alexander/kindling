import { Plus, Search } from 'lucide-react';
import { useState } from 'react';
import type { Doable } from '../suggest';
import { Sheet } from './Sheet';

interface LogSomethingSheetProps {
  doables: Doable[];
  describe: (d: Doable) => { label: string; colour: string };
  onPick: (d: Doable) => void;
  /** Offer to log something that isn't in Kindling yet. Leave out where that doesn't make sense. */
  onPickNew?: (title: string) => void;
  onClose: () => void;
  title?: string;
  placeholder?: string;
  /** Shown before anything is typed, to browse instead of search. */
  browse?: { label: string; items: Doable[] };
}

/** Find an activity, step or task, or (optionally) name something new. Used for logging and for pencilling in. */
export function LogSomethingSheet({
  doables, describe, onPick, onPickNew, onClose,
  title = 'Log something else', placeholder = 'What did you do?', browse,
}: LogSomethingSheetProps) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const items = q ? doables.filter((d) => d.title.toLowerCase().includes(q)).slice(0, 8) : browse?.items ?? [];

  const row = (d: Doable) => {
    const { label, colour } = describe(d);
    return (
      <button className="list-row" key={d.key} onClick={() => onPick(d)}>
        <span className="dot" style={{ background: colour }} />
        <span className="label">
          {d.title}
          {label && <span className="row-subtitle">{label}</span>}
        </span>
      </button>
    );
  };

  return (
    <Sheet onClose={onClose}>
      <h2 className="sheet-title">{title}</h2>
      <div className="search-field">
        <Search size={18} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder}
          autoFocus={!browse} enterKeyHint="done" />
      </div>
      {!q && browse && browse.items.length > 0 && <p className="field-label">{browse.label}</p>}
      {(items.length > 0 || (q && onPickNew)) && (
        <div className="list" style={{ marginTop: 12 }}>
          {items.map(row)}
          {q && onPickNew && (
            <button className="list-row" onClick={() => onPickNew(query.trim())}>
              <span className="icon-tile"><Plus size={16} /></span>
              <span className="label">Log "{query.trim()}"</span>
            </button>
          )}
        </div>
      )}
      {!q && !browse && (
        <p className="note" style={{ margin: '12px 4px 0' }}>Type to find an activity, or to log something new.</p>
      )}
      {q && !onPickNew && items.length === 0 && (
        <p className="note" style={{ margin: '12px 4px 0' }}>Nothing matches. Activities are added on a hobby's page.</p>
      )}
    </Sheet>
  );
}
