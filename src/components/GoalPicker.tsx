import type { Goal } from '../db';
import { goalIdFor } from '../hobbies';

const MAX_GOALS = 2;

/** "Counts towards": choose up to 2 goals, or type a new one. Used for activities and routines. */
export function GoalPicker({ goals, goalIds, onChange, newGoal, onNewGoal }: {
  goals: Goal[];
  goalIds: string[];
  onChange: (ids: string[]) => void;
  newGoal: string;
  onNewGoal: (name: string) => void;
}) {
  const toggle = (id: string) => {
    if (goalIds.includes(id)) onChange(goalIds.filter((g) => g !== id));
    else if (goalIds.length < MAX_GOALS) onChange([...goalIds, id]);
  };
  return (
    <>
      <p className="field-label">Counts towards (up to {MAX_GOALS} goals)</p>
      <div className="chips">
        {goals.map((g) => (
          <button key={g.id} className="chip" aria-pressed={goalIds.includes(g.id)} onClick={() => toggle(g.id)}>
            {g.name}
          </button>
        ))}
      </div>
      {goalIds.length < MAX_GOALS && (
        <input className="text-field" style={{ marginTop: 8 }} value={newGoal} onChange={(e) => onNewGoal(e.target.value)}
          placeholder="Or a new goal, like 'Outside'" />
      )}
    </>
  );
}

/** The chosen goal IDs, plus the typed new goal (created if needed) when there's room for it. */
export async function withNewGoal(goalIds: string[], newGoal: string): Promise<string[]> {
  const ids = [...goalIds];
  if (newGoal.trim() && ids.length < MAX_GOALS) ids.push(await goalIdFor(newGoal));
  return ids;
}
