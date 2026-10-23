import { Plus, Search } from 'lucide-react';
import { useState } from 'react';
import type { Doable } from '../suggest';
import { Sheet } from './Sheet';

interface LogSomethingSheetProps {
  doables: Doable[];
  describe: (d: Doable) => { label: string; colour: string };
  onPick: (d: Doable) => void;
  onPickNew: (title: string) => void;
  onClose: () => void;
}

/** Find any activity, step or task to log, or log something new that isn't in Kindling yet. */
export function LogSomethingSheet({ doables, describe, onPick, onPickNew, onClose }: LogSomethingSheetProps) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const matches = q ? doables.filter((d) => d.title.toLowerCase().includes(q)).slice(0, 8) : [];

  return (
    <Sheet onClose={onClose}>
      <h2 className="sheet-title">Log something else</h2>
      <div className="search-field">
        <Search size={18} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="What did you do?"
          autoFocus enterKeyHint="done" />
      </div>
      {q && (
        <div className="list" style={{ marginTop: 12 }}>
          {matches.map((d) => {
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
          })}
          <button className="list-row" onClick={() => onPickNew(query.trim())}>
            <span className="icon-tile"><Plus size={16} /></span>
            <span className="label">Log "{query.trim()}"</span>
          </button>
        </div>
      )}
      {!q && <p className="note" style={{ margin: '12px 4px 0' }}>Type to find an activity, or to log something new.</p>}
    </Sheet>
  );
}
