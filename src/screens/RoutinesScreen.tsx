import { useLiveQuery } from 'dexie-react-hooks';
import { Check, Plus, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { GoalPicker, withNewGoal } from '../components/GoalPicker';
import { Empty, Screen } from '../components/Screen';
import { Sheet } from '../components/Sheet';
import { useUndoToast } from '../components/UndoToast';
import { db, type Goal, type Routine } from '../db';
import { today } from '../lib/dates';
import { logIt, undoLog } from '../logging';
import { removeRoutine, routineTarget, saveRoutine } from '../routines';

const time = (at: number) => new Date(at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

export function RoutinesScreen() {
  const day = today();
  const data = useLiveQuery(async () => {
    const [routines, goals, logsToday] = await Promise.all([
      db.routines.toArray(), db.goals.toArray(), db.logs.where('day').equals(day).toArray(),
    ]);
    return { routines: routines.sort((a, b) => a.createdAt - b.createdAt), goals, logsToday };
  }, [day]);
  const [editing, setEditing] = useState<{ routine?: Routine } | null>(null);
  const toast = useUndoToast();
  if (!data) return null; // still loading

  const { routines, goals, logsToday } = data;
  const sheet = editing && <RoutineSheet routine={editing.routine} goals={goals} onClose={() => setEditing(null)} />;

  const quickLog = async (r: Routine) => {
    const undo = await logIt(routineTarget(r));
    toast.show(<>Logged <b>{r.name}</b></>, () => undoLog(undo));
  };

  if (routines.length === 0) {
    return (
      <Screen title="Routines">
        <Empty icon={<Sparkles size={28} />} title="No routines yet">
          Self-care routines like skin care or stretching live here, each logged with one tap. They never show up on Today.
        </Empty>
        <button className="button" style={{ marginTop: 16 }} onClick={() => setEditing({})}><Plus size={18} /> New routine</button>
        {sheet}
      </Screen>
    );
  }

  return (
    <Screen title="Routines">
      <div className="stack">
        {routines.map((r) => {
          const done = logsToday.filter((l) => l.refType === 'routine' && l.refId === r.id);
          const sub = done.length ? `Done today at ${done.map((l) => time(l.at)).join(', ')}` : r.steps.join(' · ');
          return (
            <div className="doable-card" key={r.id}>
              <button className="doable-main" onClick={() => setEditing({ routine: r })}>
                <span className="energy-tile" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                  {done.length ? <Check size={20} strokeWidth={2.4} /> : <Sparkles size={20} />}
                </span>
                <span className="doable-text">
                  <span className="doable-title">{r.name}</span>
                  {sub && <span className="doable-sub clamp">{sub}</span>}
                </span>
              </button>
              <button className="quick-log" aria-label={`Log ${r.name}`} onClick={() => quickLog(r)}>
                <Check size={20} strokeWidth={2.4} />
              </button>
            </div>
          );
        })}
      </div>
      <button className="button secondary" style={{ marginTop: 16 }} onClick={() => setEditing({})}>
        <Plus size={18} /> New routine
      </button>
      {sheet}
      {toast.element}
    </Screen>
  );
}

/** Add a routine or change one: its name, its steps (one per line) and the goals it counts towards. */
function RoutineSheet({ routine, goals, onClose }: { routine?: Routine; goals: Goal[]; onClose: () => void }) {
  const [name, setName] = useState(routine?.name ?? '');
  const [steps, setSteps] = useState(routine?.steps.join('\n') ?? '');
  const [goalIds, setGoalIds] = useState<string[]>(routine?.goalIds ?? []);
  const [newGoal, setNewGoal] = useState('');

  const save = async () => {
    await saveRoutine({ ...routine, name, steps: steps.split('\n'), goalIds: await withNewGoal(goalIds, newGoal) });
    onClose();
  };
  const remove = async () => {
    await removeRoutine(routine!.id);
    onClose();
  };

  return (
    <Sheet onClose={onClose}>
      <h2 className="sheet-title">{routine ? 'Edit routine' : 'New routine'}</h2>
      <input className="text-field" value={name} onChange={(e) => setName(e.target.value)}
        placeholder="Name, like 'Evening skin care'" autoFocus={!routine} />
      <p className="field-label">Steps (optional, one per line)</p>
      <textarea className="note-field" rows={4} value={steps} onChange={(e) => setSteps(e.target.value)}
        placeholder={'Cleanse\nSerum\nMoisturise'} />
      <GoalPicker goals={goals} goalIds={goalIds} onChange={setGoalIds} newGoal={newGoal} onNewGoal={setNewGoal} />
      <div className="stack" style={{ marginTop: 20 }}>
        <button className="button" disabled={!name.trim()} onClick={save}>{routine ? 'Save' : 'Add routine'}</button>
        {routine && <button className="button secondary" onClick={remove}>Remove routine</button>}
      </div>
      {routine && <p className="hint" style={{ textAlign: 'center' }}>Removing it keeps its past logs on the calendar.</p>}
    </Sheet>
  );
}
