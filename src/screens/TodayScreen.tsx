import { ClipboardPaste, Flame, Plus, Shuffle, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DoableCard } from '../components/DoableCard';
import { LogSheet } from '../components/LogSheet';
import { LogSomethingSheet } from '../components/LogSomethingSheet';
import { Empty, Screen } from '../components/Screen';
import type { Log } from '../db';
import { PlanCard } from '../components/PlanCard';
import { NextStepSheet } from '../components/ProjectSheets';
import { formatDay, isPlanningTime, today } from '../lib/dates';
import { navigate } from '../lib/router';
import { type LogTarget, logIt, type Undo, undoLog } from '../logging';
import { type Doable, keyOf, suggest, toDoables } from '../suggest';
import { contextFor, loadWorld, saveSuggestions } from '../world';
import { useLive } from '../lib/useLive';

/** A log that can still be undone, with the suggestions as they were before it. */
type Logged = { undo: Undo; previousKeys: (string | null)[] };

type OpenSheet =
  | { kind: 'log'; target: LogTarget; context?: string; colour?: string }
  | { kind: 'details'; log: Log }
  | { kind: 'pick' }
  | { kind: 'next'; projectId: string; logged: Logged }
  | null;

export function TodayScreen() {
  const world = useLive('today', loadWorld);
  const day = today();
  const [sheet, setSheet] = useState<OpenSheet>(null);
  // The "Logged" message, with what's needed to undo it and put the suggestions back as they were.
  const [toast, setToast] = useState<Logged | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const lastLogAt = useRef(0);

  // Keep the saved suggestions that are still valid; fill any gaps.
  const picks = useMemo(
    () => world && suggest(world, { today: day, current: world.saved?.day === day ? world.saved.keys : [] }),
    [world, day],
  );
  const pickKeys = picks?.map((p) => p?.key ?? null) ?? [];
  useEffect(() => {
    if (!world || !picks) return;
    const saved = world.saved?.day === day ? world.saved.keys : [];
    if (pickKeys.some((k, i) => k !== (saved[i] ?? null))) saveSuggestions({ day, keys: pickKeys });
  });

  if (!world || !picks) return null; // still loading

  // Uses the 4am day boundary, so at 1am it still shows tonight's date.
  const date = formatDay(day);

  if (world.hobbies.length === 0) {
    return (
      <Screen title="Today" eyebrow={date} tinted>
        <Empty icon={<Flame size={28} />} title="Nothing to suggest yet">
          Once your hobbies are pasted in, three ideas will appear here: one gentle, one middling, one lively.
        </Empty>
        <button className="button" style={{ marginTop: 16 }} onClick={() => navigate('/more/import')}>
          <ClipboardPaste size={18} /> Paste in your activities
        </button>
      </Screen>
    );
  }

  const doables = toDoables(world);
  const doableByKey = new Map(doables.map((d) => [d.key, d]));
  const logsToday = world.logs.filter((l) => l.day === day).sort((a, b) => a.at - b.at);
  const doneKeys = new Set(logsToday.filter((l) => l.refId).map((l) => keyOf(l.refType, l.refId!)));
  const pencilledIn = world.plans
    .filter((p) => p.day === day)
    .map((p) => doableByKey.get(keyOf(p.refType, p.refId)))
    .filter((d): d is Doable => !!d && !doneKeys.has(d.key));
  const suggestions = picks.filter((p): p is Doable => !!p);

  // After logging: a finished project step asks "what's next?" (with its own Undo); anything else shows the toast.
  const afterLog = (undo: Undo, projectId?: string) => {
    lastLogAt.current = Date.now();
    const logged = { undo, previousKeys: pickKeys };
    if (undo.finishedStepId && projectId) {
      setSheet({ kind: 'next', projectId, logged });
      return;
    }
    setToast(logged);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 8000);
  };
  const quickLog = async (d: Doable) => {
    // A new suggestion slides into the same spot, so ignore a quick second tap that was meant for the first.
    if (Date.now() - lastLogAt.current < 800) return;
    afterLog(await logIt(d), d.projectId);
  };
  const undo = async (logged: Logged) => {
    setToast(null);
    await undoLog(logged.undo);
    await saveSuggestions({ day, keys: logged.previousKeys });
  };
  const openLog = (target: LogTarget) => {
    const { label, colour } = contextFor(target, world);
    setSheet({ kind: 'log', target, context: label, colour });
  };
  const showOthers = () => {
    const next = suggest(world, { today: day, avoid: pickKeys.filter((k): k is string => !!k) });
    saveSuggestions({ day, keys: next.map((p) => p?.key ?? null) });
  };

  const card = (d: Doable) => {
    const { label, colour } = contextFor(d, world);
    return (
      <DoableCard key={d.key} title={d.title} energy={d.energy} context={label} colour={colour}
        onOpen={() => openLog(d)} onQuickLog={() => quickLog(d)} />
    );
  };

  return (
    <Screen title="Today" eyebrow={date} tinted>
      {pencilledIn.length > 0 && (
        <>
          <h2 className="section-header">Pencilled in</h2>
          <div className="stack">{pencilledIn.map(card)}</div>
        </>
      )}

      <div className="section-header-row">
        <h2 className="section-header">Right now</h2>
        {suggestions.length > 0 && (
          <button className="text-button" onClick={showOthers}><Shuffle size={15} /> Show me others</button>
        )}
      </div>
      {suggestions.length > 0 ? (
        <div className="stack">{suggestions.map(card)}</div>
      ) : (
        <Empty icon={<Sparkles size={28} />} title={logsToday.length ? "That's everything for now" : 'Nothing to suggest'}>
          {logsToday.length
            ? "You've done everything on offer today. Enjoy the rest of it."
            : 'Add some activities to an active hobby and ideas will appear here.'}
        </Empty>
      )}

      <button className="button secondary" style={{ marginTop: 16 }} onClick={() => setSheet({ kind: 'pick' })}>
        <Plus size={18} /> Log something else
      </button>

      {isPlanningTime() && <PlanCard world={world} today={day} />}

      {logsToday.length > 0 && (
        <>
          <h2 className="section-header">Done today</h2>
          <div className="list">
            {logsToday.map((log) => {
              const { label, colour } = contextFor(log, world);
              return (
                <button className="list-row" key={log.id} onClick={() => setSheet({ kind: 'details', log })}>
                  <span className="dot" style={{ background: colour }} />
                  <span className="label">
                    {log.title}
                    {label && <span className="row-subtitle">{label}</span>}
                  </span>
                  <span className="detail">
                    {new Date(log.at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {toast && (
        <div className="toast" role="status">
          <span className="toast-text">Logged <b>{toast.undo.title}</b></span>
          <button onClick={() => {
            const log = world.logs.find((l) => l.id === toast.undo.logId);
            setToast(null);
            if (log) setSheet({ kind: 'details', log });
          }}>Details</button>
          <button onClick={() => undo(toast)}>Undo</button>
        </div>
      )}

      {sheet?.kind === 'log' && (
        <LogSheet target={sheet.target} context={sheet.context} colour={sheet.colour} hobbies={world.hobbies}
          // Only close if it's still the log sheet: logging a step may have opened the "what's next?" sheet.
          onClose={() => setSheet((s) => (s?.kind === 'log' ? null : s))}
          onLogged={(u) => afterLog(u, sheet.target.projectId)} />
      )}
      {sheet?.kind === 'next' && (() => {
        const project = world.projects.find((p) => p.id === sheet.projectId);
        const openSteps = world.steps.filter((s) => s.projectId === sheet.projectId && !s.doneAt).length;
        return project && (
          <NextStepSheet projectId={project.id} projectName={project.name} stepTitle={sheet.logged.undo.title}
            openSteps={openSteps} onClose={() => setSheet(null)}
            onUndo={async () => { setSheet(null); await undo(sheet.logged); }} />
        );
      })()}
      {sheet?.kind === 'details' && (
        <LogSheet existing={sheet.log} context={contextFor(sheet.log, world).label}
          colour={contextFor(sheet.log, world).colour} hobbies={world.hobbies} onClose={() => setSheet(null)} />
      )}
      {sheet?.kind === 'pick' && (
        <LogSomethingSheet doables={doables} describe={(d) => contextFor(d, world)}
          onPick={(d) => openLog(d)}
          onPickNew={(title) => openLog({ title, refType: 'adhoc', goalIds: [] })}
          onClose={() => setSheet(null)} />
      )}
    </Screen>
  );
}
