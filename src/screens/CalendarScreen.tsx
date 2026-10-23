import { useLiveQuery } from 'dexie-react-hooks';
import { CalendarPlus, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { LogSheet } from '../components/LogSheet';
import { LogSomethingSheet } from '../components/LogSomethingSheet';
import { Screen } from '../components/Screen';
import { config } from '../config';
import type { Day, Log } from '../db';
import { formatDay, monthGrid, today } from '../lib/dates';
import type { LogTarget } from '../logging';
import { pencilIn, removePlan } from '../plans';
import { type Doable, isSuggestible, keyOf, toDoables, weigher } from '../suggest';
import { contextFor, loadWorld } from '../world';

type OpenSheet =
  | { kind: 'pencil' }
  | { kind: 'pickLog' }
  | { kind: 'log'; target: LogTarget }
  | { kind: 'details'; log: Log }
  | null;

const MAX_DOTS = 4;

/** Weekday initials in calendar order, e.g. M T W T F S S. */
function weekdayLetters() {
  const sunday = new Date(2026, 0, 4); // any Sunday
  return Array.from({ length: 7 }, (_, i) =>
    new Date(2026, 0, sunday.getDate() + config.weekStartsOn + i).toLocaleDateString(undefined, { weekday: 'narrow' }),
  );
}

export function CalendarScreen() {
  const world = useLiveQuery(loadWorld);
  const todayDay = today();
  const [month, setMonth] = useState(() => todayDay.slice(0, 7)); // "2026-10"
  const [selected, setSelected] = useState(todayDay);
  const [sheet, setSheet] = useState<OpenSheet>(null);
  if (!world) return null; // still loading

  const [year, monthNumber] = month.split('-').map(Number);
  const grid = monthGrid(year, monthNumber);
  const doables = toDoables(world);
  const doableByKey = new Map(doables.map((d) => [d.key, d]));

  const logsOn = (day: Day) => world.logs.filter((l) => l.day === day).sort((a, b) => a.at - b.at);
  // Plans only show from today on: a plan that wasn't done quietly lapses (D6).
  const plansOn = (day: Day) => {
    if (day < todayDay) return [];
    const done = new Set(logsOn(day).filter((l) => l.refId).map((l) => keyOf(l.refType, l.refId!)));
    return world.plans
      .filter((p) => p.day === day)
      .map((plan) => ({ plan, doable: doableByKey.get(keyOf(plan.refType, plan.refId)) }))
      .filter((x): x is { plan: typeof x.plan; doable: Doable } => !!x.doable && !done.has(x.doable.key));
  };

  const shiftMonth = (by: number) => {
    const d = new Date(year, monthNumber - 1 + by, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const monthLabel = new Date(year, monthNumber - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const selectedLogs = logsOn(selected);
  const selectedPlans = plansOn(selected);
  const weight = weigher(world.logs, todayDay);
  const plannable = doables
    .filter((d) => isSuggestible(d, world, true))
    .sort((a, b) => Number(b.planAhead) - Number(a.planAhead) || weight(b) - weight(a))
    .slice(0, 6);

  return (
    <Screen title="Calendar">
      <div className="card calendar">
        <div className="month-switcher">
          <button className="icon-button" aria-label="Previous month" onClick={() => shiftMonth(-1)}>
            <ChevronLeft size={22} />
          </button>
          <span className="month-label">{monthLabel}</span>
          <button className="icon-button" aria-label="Next month" onClick={() => shiftMonth(1)}>
            <ChevronRight size={22} />
          </button>
        </div>
        <div className="cal-grid">
          {weekdayLetters().map((letter, i) => <span key={i} className="cal-weekday">{letter}</span>)}
          {grid.map((day, i) => {
            if (!day) return <span key={`blank-${i}`} />;
            const logs = logsOn(day);
            const plans = plansOn(day);
            return (
              <button key={day} className="cal-day" aria-pressed={day === selected}
                data-today={day === todayDay || undefined} onClick={() => setSelected(day)}>
                <span className="cal-number">{Number(day.slice(8))}</span>
                <span className="cal-dots">
                  {logs.slice(0, MAX_DOTS).map((log) => (
                    <span key={log.id} className="cal-dot" style={{ background: contextFor(log, world).colour }} />
                  ))}
                  {plans.slice(0, Math.max(0, MAX_DOTS - logs.length)).map(({ plan }) => (
                    <span key={plan.id} className="cal-dot planned" />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <h2 className="section-header">{selected === todayDay ? `Today · ${formatDay(selected)}` : formatDay(selected)}</h2>
      {selectedPlans.length + selectedLogs.length > 0 ? (
        <div className="list">
          {selectedPlans.map(({ plan, doable }) => {
            const { label, colour } = contextFor(doable, world);
            return (
              <div className="list-row" key={plan.id}>
                <span className="dot planned" style={{ borderColor: colour }} />
                <span className="label">
                  {doable.title}
                  <span className="row-subtitle">Pencilled in{label && ` · ${label}`}</span>
                </span>
                <button className="icon-button" aria-label="Remove" onClick={() => removePlan(plan.id)}>
                  <X size={18} />
                </button>
              </div>
            );
          })}
          {selectedLogs.map((log) => {
            const { label, colour } = contextFor(log, world);
            return (
              <button className="list-row" key={log.id} onClick={() => setSheet({ kind: 'details', log })}>
                <span className="dot" style={{ background: colour }} />
                <span className="label">
                  {log.title}
                  {label && <span className="row-subtitle">{label}</span>}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="note" style={{ marginTop: 0 }}>
          {selected < todayDay ? 'A quiet day.' : selected === todayDay ? 'Nothing logged yet.' : 'Nothing pencilled in.'}
        </p>
      )}

      <div className="stack" style={{ marginTop: 16 }}>
        {selected >= todayDay && (
          <button className="button secondary" onClick={() => setSheet({ kind: 'pencil' })}>
            <CalendarPlus size={18} /> Pencil something in
          </button>
        )}
        {selected <= todayDay && (
          <button className="button secondary" onClick={() => setSheet({ kind: 'pickLog' })}>
            <Plus size={18} /> Add something you did
          </button>
        )}
      </div>

      {sheet?.kind === 'pencil' && (
        <LogSomethingSheet title="Pencil something in" placeholder="Find an activity"
          doables={doables.filter((d) => isSuggestible(d, world, true))}
          browse={{ label: 'Ideas', items: plannable }}
          describe={(d) => contextFor(d, world)}
          onPick={async (d) => { await pencilIn(selected, d); setSheet(null); }}
          onClose={() => setSheet(null)} />
      )}
      {sheet?.kind === 'pickLog' && (
        <LogSomethingSheet doables={doables} describe={(d) => contextFor(d, world)}
          onPick={(d) => setSheet({ kind: 'log', target: d })}
          onPickNew={(title) => setSheet({ kind: 'log', target: { title, refType: 'adhoc', goalIds: [] } })}
          onClose={() => setSheet(null)} />
      )}
      {sheet?.kind === 'log' && (
        <LogSheet target={sheet.target} {...pick(contextFor(sheet.target, world))} hobbies={world.hobbies}
          day={selected === todayDay ? undefined : selected} onClose={() => setSheet(null)} />
      )}
      {sheet?.kind === 'details' && (
        <LogSheet existing={sheet.log} {...pick(contextFor(sheet.log, world))} hobbies={world.hobbies}
          onClose={() => setSheet(null)} />
      )}
    </Screen>
  );
}

/** contextFor gives { label, colour }; the log sheet calls the label "context". */
const pick = ({ label, colour }: { label: string; colour: string }) => ({ context: label, colour });
