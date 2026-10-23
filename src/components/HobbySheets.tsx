import { Check } from 'lucide-react';
import { useState } from 'react';
import type { Activity, Energy, Goal, Hobby, HobbyStatus } from '../db';
import { archiveActivity, createHobby, goalIdFor, saveActivity, setHobbyStatus, updateHobby } from '../hobbies';
import { ENERGY_LABELS } from '../lib/energy';
import { colourVar, HOBBY_COLOURS, STATUS_DESCRIPTIONS, STATUS_LABELS, STATUS_ORDER } from '../lib/labels';
import { ENERGIES } from '../suggest';
import { Sheet } from './Sheet';

/** Create a hobby, or rename and recolour an existing one. */
export function HobbySheet({ hobby, onClose, onCreated }: {
  hobby?: Hobby;
  onClose: () => void;
  onCreated?: (id: string) => void;
}) {
  const [name, setName] = useState(hobby?.name ?? '');
  const [colour, setColour] = useState(hobby?.colour);
  const [status, setStatus] = useState<HobbyStatus>('active');

  const save = async () => {
    if (hobby) {
      await updateHobby(hobby.id, { name, colour });
    } else {
      const id = await createHobby(name, status);
      if (colour) await updateHobby(id, { colour });
      onCreated?.(id);
    }
    onClose();
  };

  return (
    <Sheet onClose={onClose}>
      <h2 className="sheet-title">{hobby ? 'Edit hobby' : 'New hobby'}</h2>
      <input className="text-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name"
        autoFocus={!hobby} />
      {!hobby && (
        <>
          <p className="field-label">Status</p>
          <div className="chips">
            {(['active', 'want'] as HobbyStatus[]).map((s) => (
              <button key={s} className="chip" aria-pressed={status === s} onClick={() => setStatus(s)}>
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </>
      )}
      <p className="field-label">Colour</p>
      <div className="chips">
        {HOBBY_COLOURS.map((c) => (
          <button key={c} className="colour-swatch" aria-pressed={colour === c} aria-label={c}
            style={{ background: colourVar(c) }} onClick={() => setColour(c)}>
            {colour === c && <Check size={16} strokeWidth={3} />}
          </button>
        ))}
      </div>
      <button className="button" style={{ marginTop: 20 }} disabled={!name.trim()} onClick={save}>
        {hobby ? 'Save' : 'Add hobby'}
      </button>
    </Sheet>
  );
}

/** Choose a hobby's status, with a calm explanation of each. */
export function StatusSheet({ hobby, onClose }: { hobby: Hobby; onClose: () => void }) {
  const choose = async (status: HobbyStatus) => {
    await setHobbyStatus(hobby.id, status);
    onClose();
  };
  return (
    <Sheet onClose={onClose}>
      <h2 className="sheet-title">Status</h2>
      <div className="list">
        {STATUS_ORDER.map((s) => (
          <button key={s} className="list-row" onClick={() => choose(s)}>
            <span className="label">
              {STATUS_LABELS[s]}
              <span className="row-subtitle">{STATUS_DESCRIPTIONS[s]}</span>
            </span>
            {hobby.status === s && <Check size={20} color="var(--accent)" />}
          </button>
        ))}
      </div>
    </Sheet>
  );
}

/** Add a new activity to a hobby, or change or remove an existing one. */
export function ActivitySheet({ hobbyId, activity, goals, onClose }: {
  hobbyId: string;
  activity?: Activity;
  goals: Goal[];
  onClose: () => void;
}) {
  const [title, setTitle] = useState(activity?.title ?? '');
  const [energy, setEnergy] = useState<Energy>(activity?.energy ?? 'medium');
  const [planAhead, setPlanAhead] = useState(activity?.planAhead ?? false);
  const [goalIds, setGoalIds] = useState<string[]>(activity?.goalIds ?? []);
  const [newGoal, setNewGoal] = useState('');

  const toggleGoal = (id: string) => {
    if (goalIds.includes(id)) setGoalIds(goalIds.filter((g) => g !== id));
    else if (goalIds.length < 2) setGoalIds([...goalIds, id]);
  };

  const save = async () => {
    const ids = [...goalIds];
    if (newGoal.trim() && ids.length < 2) ids.push(await goalIdFor(newGoal));
    await saveActivity({ ...activity, title, hobbyId, energy, planAhead, goalIds: ids });
    onClose();
  };

  const remove = async () => {
    await archiveActivity(activity!.id);
    onClose();
  };

  return (
    <Sheet onClose={onClose}>
      <h2 className="sheet-title">{activity ? 'Edit activity' : 'New activity'}</h2>
      <input className="text-field" value={title} onChange={(e) => setTitle(e.target.value)}
        placeholder="Something concrete, like 'Edit 5 photos'" autoFocus={!activity} />

      <p className="field-label">Energy</p>
      <div className="chips">
        {ENERGIES.map((e) => (
          <button key={e} className="chip" aria-pressed={energy === e} onClick={() => setEnergy(e)}>
            {ENERGY_LABELS[e]}
          </button>
        ))}
      </div>

      <p className="field-label">Timing</p>
      <div className="chips">
        <button className="chip" aria-pressed={planAhead} onClick={() => setPlanAhead(!planAhead)}>Plan ahead</button>
      </div>
      <p className="hint">Plan-ahead activities aren't suggested on the spot. They're offered for tomorrow instead.</p>

      <p className="field-label">Counts towards (up to 2 goals)</p>
      <div className="chips">
        {goals.map((g) => (
          <button key={g.id} className="chip" aria-pressed={goalIds.includes(g.id)} onClick={() => toggleGoal(g.id)}>
            {g.name}
          </button>
        ))}
      </div>
      {goalIds.length < 2 && (
        <input className="text-field" style={{ marginTop: 8 }} value={newGoal} onChange={(e) => setNewGoal(e.target.value)}
          placeholder="Or a new goal, like 'Outside'" />
      )}

      <div className="stack" style={{ marginTop: 20 }}>
        <button className="button" disabled={!title.trim()} onClick={save}>{activity ? 'Save' : 'Add activity'}</button>
        {activity && <button className="button secondary" onClick={remove}>Remove activity</button>}
      </div>
      {activity && <p className="hint" style={{ textAlign: 'center' }}>Removing it keeps its past logs on the timeline.</p>}
    </Sheet>
  );
}
