import { CircleCheck, Moon, Plus, Target } from 'lucide-react';
import { useState } from 'react';
import { Empty, Screen } from '../components/Screen';
import { Sheet } from '../components/Sheet';
import { db, type Goal, type Hobby } from '../db';
import { logsThisPeriod, recentPeriods, removeGoal, restingWith, saveGoal } from '../goals';
import { today } from '../lib/dates';
import { colourVar } from '../lib/labels';
import { useLive } from '../lib/useLive';

const PERIOD_WORD = { week: 'week', month: 'month' } as const;
const TARGETS = [1, 2, 3, 4, 5, 7];

export function GoalsScreen() {
  const data = useLive('goals', async () => {
    const [goals, hobbies, logs, activities, routines] = await Promise.all([
      db.goals.toArray(), db.hobbies.toArray(), db.logs.toArray(), db.activities.toArray(), db.routines.toArray(),
    ]);
    return { goals, hobbies, logs, activities: activities.filter((a) => !a.archived), routines };
  });
  const [editing, setEditing] = useState<{ goal?: Goal } | null>(null);
  if (!data) return null; // still loading

  const { goals, hobbies, logs, activities, routines } = data;
  const day = today();
  const back = { label: 'More', path: '/more' };
  const countedBy = (goal: Goal) =>
    [...activities.map((a) => ({ name: a.title, goalIds: a.goalIds })), ...routines]
      .filter((x) => x.goalIds.includes(goal.id))
      .map((x) => x.name);
  const sheet = editing && (
    <GoalSheet goal={editing.goal} hobbies={hobbies} countedBy={editing.goal ? countedBy(editing.goal) : []}
      onClose={() => setEditing(null)} />
  );

  if (goals.length === 0) {
    return (
      <Screen title="Goals" back={back}>
        <Empty icon={<Target size={28} />} title="No goals yet">
          A goal is a tag like "Outside" or "Creative". Activities and routines count towards it whenever you log them.
        </Empty>
        <button className="button" style={{ marginTop: 16 }} onClick={() => setEditing({})}><Plus size={18} /> New goal</button>
        {sheet}
      </Screen>
    );
  }

  // Resting goals go last, so they look calm rather than left behind.
  const sorted = [...goals].sort((a, b) =>
    Number(!!restingWith(a, hobbies)) - Number(!!restingWith(b, hobbies)) || a.name.localeCompare(b.name));

  return (
    <Screen title="Goals" back={back}>
      <div className="stack">
        {sorted.map((goal) => {
          const resting = restingWith(goal, hobbies);
          const hobby = hobbies.find((h) => h.id === goal.hobbyId);
          const colour = hobby ? colourVar(hobby.colour) : 'var(--accent)';
          const done = logsThisPeriod(goal, logs, day).length;
          const reached = !!goal.target && done >= goal.target;
          const period = PERIOD_WORD[goal.period];
          return (
            <button className="card goal-card" key={goal.id} onClick={() => setEditing({ goal })}>
              <div className="row-between">
                <span className="goal-name">{goal.name}</span>
                {!resting && (
                  <span className="goal-count" style={reached ? { color: colour } : undefined}>
                    {reached && <CircleCheck size={16} />}
                    {done ? `${done} this ${period}` : `A fresh ${period}`}
                  </span>
                )}
              </div>
              <p className="goal-sub">
                {resting ? <><Moon size={13} /> Resting with {resting.name}</>
                  : goal.target ? `Aiming for ${goal.target} a ${period}`
                  : `Counts what you do, no target`}
              </p>
              {/* Recent weeks or months, oldest first: soft dots, no numbers. */}
              <div className="goal-strip" aria-hidden>
                {recentPeriods(goal, logs, day).map((p) => (
                  <span key={p.start} className="goal-dot" style={{
                    background: p.level ? colour : 'var(--separator)',
                    opacity: p.level ? [0, 0.45, 0.75, 1][p.level] : 0.5,
                  }} />
                ))}
              </div>
            </button>
          );
        })}
      </div>
      <p className="note">Every week and month starts fresh. Only what you did is counted.</p>
      <button className="button secondary" style={{ marginTop: 16 }} onClick={() => setEditing({})}>
        <Plus size={18} /> New goal
      </button>
      {sheet}
    </Screen>
  );
}

/** Create a goal or change one: name, an optional target per week or month, and an optional hobby to rest with. */
function GoalSheet({ goal, hobbies, countedBy, onClose }: {
  goal?: Goal;
  hobbies: Hobby[];
  countedBy: string[];
  onClose: () => void;
}) {
  const [name, setName] = useState(goal?.name ?? '');
  const [target, setTarget] = useState<number | undefined>(goal?.target);
  const [period, setPeriod] = useState<Goal['period']>(goal?.period ?? 'week');
  const [hobbyId, setHobbyId] = useState(goal?.hobbyId);

  const save = async () => {
    await saveGoal({ ...goal, name, target, period, hobbyId });
    onClose();
  };
  const remove = async () => {
    await removeGoal(goal!.id);
    onClose();
  };

  return (
    <Sheet onClose={onClose}>
      <h2 className="sheet-title">{goal ? 'Edit goal' : 'New goal'}</h2>
      <input className="text-field" value={name} onChange={(e) => setName(e.target.value)}
        placeholder="Name, like 'Outside'" autoFocus={!goal} />

      <p className="field-label">Aim for (optional)</p>
      <div className="chips">
        <button className="chip" aria-pressed={!target} onClick={() => setTarget(undefined)}>Just a tag</button>
        {TARGETS.map((n) => (
          <button key={n} className="chip" aria-pressed={target === n} onClick={() => setTarget(n)}>{n}</button>
        ))}
      </div>
      <div className="chips" style={{ marginTop: 8 }}>
        {(['week', 'month'] as const).map((p) => (
          <button key={p} className="chip" aria-pressed={period === p} onClick={() => setPeriod(p)}>
            {target ? `${target === 1 ? 'Once' : `${target} times`} a ${p}` : `Count by ${p}`}
          </button>
        ))}
      </div>

      {hobbies.length > 0 && (
        <>
          <p className="field-label">Rests with a hobby (optional)</p>
          <div className="chips">
            {hobbies.map((h) => (
              <button key={h.id} className="chip" aria-pressed={hobbyId === h.id}
                onClick={() => setHobbyId(hobbyId === h.id ? undefined : h.id)}>
                <span className="dot" style={{ background: colourVar(h.colour) }} /> {h.name}
              </button>
            ))}
          </div>
          <p className="hint">While that hobby is paused, this goal rests too.</p>
        </>
      )}

      {countedBy.length > 0 && <p className="hint" style={{ marginTop: 16 }}>Counted by {countedBy.join(', ')}.</p>}

      <div className="stack" style={{ marginTop: 20 }}>
        <button className="button" disabled={!name.trim()} onClick={save}>{goal ? 'Save' : 'Add goal'}</button>
        {goal && <button className="button secondary" onClick={remove}>Remove goal</button>}
      </div>
      {goal && <p className="hint" style={{ textAlign: 'center' }}>Removing it keeps your past logs as they are.</p>}
    </Sheet>
  );
}
