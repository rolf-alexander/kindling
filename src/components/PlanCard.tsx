import { CalendarCheck, X } from 'lucide-react';
import type { Day } from '../db';
import { addDays } from '../lib/dates';
import { pencilIn, planAheadOptions, removePlan } from '../plans';
import { keyOf, toDoables, type World } from '../suggest';
import { contextFor } from '../world';

const CARD_SIZE = 2;

/**
 * "Plan something for tomorrow": offers plan-ahead activities to pencil in for the next day.
 * Ignoring it does nothing. It never nags, and it simply isn't there if there's nothing to plan.
 */
export function PlanCard({ world, today }: { world: World; today: Day }) {
  const tomorrow = addDays(today, 1);
  const doableByKey = new Map(toDoables(world).map((d) => [d.key, d]));
  const planned = world.plans
    .filter((p) => p.day === tomorrow)
    .map((p) => ({ plan: p, doable: doableByKey.get(keyOf(p.refType, p.refId)) }))
    .filter((x) => x.doable);
  const options = planAheadOptions(world, today, tomorrow, Math.max(0, CARD_SIZE - planned.length));
  if (planned.length === 0 && options.length === 0) return null;

  return (
    <>
      <h2 className="section-header">Plan something for tomorrow</h2>
      <div className="list">
        {planned.map(({ plan, doable }) => {
          const { label, colour } = contextFor(doable!, world);
          return (
            <div className="list-row" key={plan.id}>
              <span className="icon-tile" style={{ background: `color-mix(in srgb, ${colour} 28%, transparent)`, color: colour }}>
                <CalendarCheck size={16} />
              </span>
              <span className="label">
                {doable!.title}
                <span className="row-subtitle">Pencilled in for tomorrow{label && ` · ${label}`}</span>
              </span>
              <button className="icon-button" aria-label="Remove from tomorrow" onClick={() => removePlan(plan.id)}>
                <X size={18} />
              </button>
            </div>
          );
        })}
        {options.map((d) => {
          const { label, colour } = contextFor(d, world);
          return (
            <div className="list-row" key={d.key}>
              <span className="dot" style={{ background: colour }} />
              <span className="label">
                {d.title}
                {label && <span className="row-subtitle">{label}</span>}
              </span>
              <button className="pill-button" onClick={() => pencilIn(tomorrow, d)}>Pencil in</button>
            </div>
          );
        })}
      </div>
    </>
  );
}
