import { Check } from 'lucide-react';
import type { Energy } from '../db';
import { ENERGY_LABELS, EnergyIcon } from '../lib/energy';

interface DoableCardProps {
  title: string;
  energy: Energy;
  context: string;
  colour: string;
  /** Tapping the card: open the log sheet with optional details. */
  onOpen: () => void;
  /** Tapping the tick: log it straight away. */
  onQuickLog: () => void;
}

export function DoableCard({ title, energy, context, colour, onOpen, onQuickLog }: DoableCardProps) {
  return (
    <div className="doable-card">
      <button className="doable-main" onClick={onOpen}>
        <span className="energy-tile" style={{ background: `color-mix(in srgb, ${colour} 28%, transparent)`, color: colour }}>
          <EnergyIcon energy={energy} />
        </span>
        <span className="doable-text">
          <span className="doable-title">{title}</span>
          <span className="doable-sub">{[context, ENERGY_LABELS[energy]].filter(Boolean).join(' · ')}</span>
        </span>
      </button>
      <button className="quick-log" aria-label={`Log ${title}`} onClick={onQuickLog}>
        <Check size={20} strokeWidth={2.4} />
      </button>
    </div>
  );
}
