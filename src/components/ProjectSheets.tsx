import { useState } from 'react';
import { config } from '../config';
import type { Energy, Hobby, Project, Step } from '../db';
import { ENERGY_LABELS } from '../lib/energy';
import { colourVar } from '../lib/labels';
import { addStep, createProject, finishProject, makeNextStep, removeStep, updateProject, updateStep } from '../projects';
import { ENERGIES } from '../suggest';
import { Sheet } from './Sheet';

export function EnergyChips({ energy, onChange }: { energy: Energy; onChange: (e: Energy) => void }) {
  return (
    <div className="chips">
      {ENERGIES.map((e) => (
        <button key={e} className="chip" aria-pressed={energy === e} onClick={() => onChange(e)}>{ENERGY_LABELS[e]}</button>
      ))}
    </div>
  );
}

/** Start a project (in a hobby or on its own), or rename or move an existing one. */
export function ProjectSheet({ project, hobbies, hobbyId: initialHobbyId, onClose, onCreated }: {
  project?: Project;
  hobbies: Hobby[];
  hobbyId?: string;
  onClose: () => void;
  onCreated?: (id: string) => void;
}) {
  const [name, setName] = useState(project?.name ?? '');
  const [hobbyId, setHobbyId] = useState(project ? project.hobbyId : initialHobbyId);

  const save = async () => {
    if (project) await updateProject(project.id, { name, hobbyId });
    else onCreated?.(await createProject(name, hobbyId));
    onClose();
  };

  return (
    <Sheet onClose={onClose}>
      <h2 className="sheet-title">{project ? 'Edit project' : 'New project'}</h2>
      <input className="text-field" value={name} onChange={(e) => setName(e.target.value)}
        placeholder="Name, like 'Edinburgh zine'" autoFocus={!project} />
      {hobbies.length > 0 && (
        <>
          <p className="field-label">Part of a hobby (optional)</p>
          <div className="chips">
            {hobbies.map((h) => (
              <button key={h.id} className="chip" aria-pressed={hobbyId === h.id}
                onClick={() => setHobbyId(hobbyId === h.id ? undefined : h.id)}>
                <span className="dot" style={{ background: colourVar(h.colour) }} /> {h.name}
              </button>
            ))}
          </div>
        </>
      )}
      <button className="button" style={{ marginTop: 20 }} disabled={!name.trim()} onClick={save}>
        {project ? 'Save' : 'Start project'}
      </button>
    </Sheet>
  );
}

/** Add a next step, or change, reorder or remove one. */
export function StepSheet({ projectId, step, isNext, onClose }: {
  projectId: string;
  step?: Step;
  isNext?: boolean;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(step?.title ?? '');
  const [energy, setEnergy] = useState<Energy>(step?.energy ?? config.defaultEnergy);

  const save = async () => {
    if (step) await updateStep(step.id, { title, energy });
    else await addStep(projectId, title, energy);
    onClose();
  };

  return (
    <Sheet onClose={onClose}>
      <h2 className="sheet-title">{step ? 'Edit step' : 'New step'}</h2>
      <input className="text-field" value={title} onChange={(e) => setTitle(e.target.value)}
        placeholder="A small, concrete next step" autoFocus={!step} />
      <p className="field-label">Energy</p>
      <EnergyChips energy={energy} onChange={setEnergy} />
      <div className="stack" style={{ marginTop: 20 }}>
        <button className="button" disabled={!title.trim()} onClick={save}>{step ? 'Save' : 'Add step'}</button>
        {step && !isNext && (
          <button className="button secondary" onClick={async () => { await makeNextStep(step.id); onClose(); }}>
            Make this the next step
          </button>
        )}
        {step && (
          <button className="button secondary" onClick={async () => { await removeStep(step.id); onClose(); }}>
            Remove step
          </button>
        )}
      </div>
      {step && !isNext && <p className="hint" style={{ textAlign: 'center' }}>Only the next step is suggested on Today.</p>}
    </Sheet>
  );
}

/** After a step is done: an optional nudge to add the next one. "Not now" is always fine. */
export function NextStepSheet({ projectId, projectName, stepTitle, openSteps, onUndo, onClose }: {
  projectId: string;
  projectName: string;
  stepTitle: string;
  /** How many steps are still open after this one. */
  openSteps: number;
  onUndo?: () => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [energy, setEnergy] = useState<Energy>(config.defaultEnergy);
  const room = openSteps < config.maxOpenStepsPerProject;

  const add = async () => {
    await addStep(projectId, title, energy);
    onClose();
  };

  return (
    <Sheet onClose={onClose}>
      <span className="sheet-context">{projectName}</span>
      <h2 className="sheet-title">Done: {stepTitle}</h2>
      {room && (
        <>
          <p className="muted" style={{ margin: '0 0 12px' }}>
            {openSteps === 0 ? 'That was the last step. Is there a next one?' : "What's next? (Optional)"}
          </p>
          <input className="text-field" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="The next small step" />
          <p className="field-label">Energy</p>
          <EnergyChips energy={energy} onChange={setEnergy} />
        </>
      )}
      <div className="stack" style={{ marginTop: 20 }}>
        {room && <button className="button" disabled={!title.trim()} onClick={add}>Add next step</button>}
        {openSteps === 0 && (
          <button className="button secondary" onClick={async () => { await finishProject(projectId); onClose(); }}>
            Mark project finished
          </button>
        )}
        <button className="button secondary" onClick={onClose}>Not now</button>
      </div>
      {onUndo && (
        <button className="text-button" style={{ margin: '14px auto 0', display: 'flex' }} onClick={onUndo}>
          Undo — the step isn't done
        </button>
      )}
    </Sheet>
  );
}
