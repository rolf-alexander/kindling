import { CalendarPlus, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { LogSheet } from '../components/LogSheet';
import { LogSomethingSheet } from '../components/LogSomethingSheet';
import { Screen } from '../components/Screen';
import { config } from '../config';
import type { Day, Log } from '../db';
import { formatDay, monthGrid, today } from '../lib/dates';
import { useLive } from '../lib/useLive';
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

/** A day with more than this many colours shows only the first ones. */
const MAX_COLOURS = 3;

/** Weekday initials in calendar order, e.g. M T W T F S S. */
function weekdayLetters() {
  const sunday = new Date(2026, 0, 4); // any Sunday
  return Array.from({ length: 7 }, (_, i) =>
    new Date(2026, 0, sunday.getDate() + config.weekStartsOn + i).toLocaleDateString(undefined, { weekday: 'narrow' }),
  );
}

/** One colour fills the circle; two or three share it like slices, so a mixed day looks like a mixed day. */
function fill(colours: string[]) {
  if (colours.length <= 1) return colours[0];
  const share = 100 / colours.length;
  return `conic-gradient(${colours.map((c, i) => `${c} ${i * share}% ${(i + 1) * share}%`).join(', ')})`;
}

export function CalendarScreen() {
  const world = useLive('calendar', loadWorld);
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
  const monthName = new Date(year, monthNumber - 1, 1).toLocaleDateString(undefined, { month: 'long' });

  // What this month held, for the key under the grid: each hobby (or kind of thing) once, most frequent first.
  const legend = new Map<string, { label: string; colour: string; count: number }>();
  for (const log of world.logs.filter((l) => l.day.startsWith(month))) {
    const { colour } = contextFor(log, world);
    const hobby = world.hobbies.find((h) => h.id === log.hobbyId);
    const name = hobby ? hobby.name : log.refType === 'routine' ? 'Routines' : log.refType === 'media' ? 'Reading & Watching' : 'Other';
    const entry = legend.get(colour) ?? { label: name, colour, count: 0 };
    entry.count++;
    legend.set(colour, entry);
  }
  const key = [...legend.values()].sort((a, b) => b.count - a.count);

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
          <h2 className="month-label">{monthName} <span>{year}</span></h2>
          <button className="round-button" aria-label="Previous month" onClick={() => shiftMonth(-1)}>
            <ChevronLeft size={20} />
          </button>
          <button className="round-button" aria-label="Next month" onClick={() => shiftMonth(1)}>
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="cal-grid">
          {weekdayLetters().map((letter, i) => <span key={i} className="cal-weekday">{letter}</span>)}
          {grid.map((day, i) => {
            if (!day) return <span key={`blank-${i}`} />;
            const colours = [...new Set(logsOn(day).map((log) => contextFor(log, world).colour))].slice(0, MAX_COLOURS);
            const planned = plansOn(day).length > 0;
            const state = colours.length ? 'done' : day <= todayDay ? 'quiet' : planned ? 'planned' : 'ahead';
            return (
              <button key={day} className="cal-day" data-state={state} aria-pressed={day === selected}
                data-today={day === todayDay || undefined} onClick={() => setSelected(day)}>
                <span className="cal-circle" style={{ background: fill(colours) }}>{Number(day.slice(8))}</span>
              </button>
            );
          })}
        </div>
        {key.length > 0 && (
          <div className="cal-key">
            {key.map((k) => (
              <span key={k.colour} className="cal-key-item"><span className="dot" style={{ background: k.colour }} />{k.label}</span>
            ))}
          </div>
        )}
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
                <span className="detail">
                  {selected === todayDay && new Date(log.at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
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

      <div className="pill-row">
        {selected >= todayDay && (
          <button className="pill-button" onClick={() => setSheet({ kind: 'pencil' })}>
            <CalendarPlus size={16} /> Pencil in
          </button>
        )}
        {selected <= todayDay && (
          <button className="pill-button" onClick={() => setSheet({ kind: 'pickLog' })}>
            <Plus size={16} /> Add something you did
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
