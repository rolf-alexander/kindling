import { Check, FolderOpen, X } from 'lucide-react';
import { useState } from 'react';
import { config } from '../config';
import type { Energy, Hobby, Project, Task } from '../db';
import { middayOf } from '../lib/dates';
import { colourVar } from '../lib/labels';
import { removeTask, saveTask } from '../tasks';
import { EnergyChips } from './ProjectSheets';
import { Sheet } from './Sheet';

/** "By Sun 15 Nov". Shown the same way before and after the date: no red, no "overdue". */
export const dueText = (due: string) =>
  `By ${new Date(middayOf(due)).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}`;

/** One open task: a tick to mark it done, and the rest of the row to open it. */
export function TaskRow({ task, linkName, onDone, onOpen }: {
  task: Task;
  /** The hobby or project it's linked to, if it should be shown. */
  linkName?: string;
  onDone: () => void;
  onOpen: () => void;
}) {
  const sub = [linkName, task.due && dueText(task.due), task.note].filter(Boolean).join(' · ');
  return (
    <div className="list-row">
      <button className="step-tick" aria-label={`Done: ${task.title}`} onClick={onDone}>
        <Check size={16} strokeWidth={2.6} />
      </button>
      <button className="row-button" onClick={onOpen}>
        <span className="label">
          {task.title}
          {sub && <span className="row-subtitle clamp">{sub}</span>}
        </span>
      </button>
    </div>
  );
}

/** Add a task or change one: title, optional due date, note, link to a hobby or project, and energy. */
export function TaskSheet({ task, hobbies, projects, link, onClose }: {
  task?: Task;
  hobbies: Hobby[];
  projects: Project[];
  /** For a new task added from a hobby's or project's page. */
  link?: { hobbyId?: string; projectId?: string };
  onClose: () => void;
}) {
  const [title, setTitle] = useState(task?.title ?? '');
  const [due, setDue] = useState(task?.due ?? '');
  const [note, setNote] = useState(task?.note ?? '');
  const [hobbyId, setHobbyId] = useState(task ? task.hobbyId : link?.hobbyId);
  const [projectId, setProjectId] = useState(task ? task.projectId : link?.projectId);
  const [energy, setEnergy] = useState<Energy>(task?.energy ?? config.defaultEnergy);
  const [full, setFull] = useState(false);
  const linked = !!(hobbyId || projectId);

  const save = async () => {
    const saved = await saveTask({ ...task, title, due, note, hobbyId, projectId, energy });
    if (saved) onClose();
    else setFull(true);
  };
  const remove = async () => {
    await removeTask(task!.id);
    onClose();
  };
  const chooseHobby = (id: string) => {
    setHobbyId(hobbyId === id ? undefined : id);
    setProjectId(undefined);
  };
  const chooseProject = (id: string) => {
    setProjectId(projectId === id ? undefined : id);
    setHobbyId(undefined);
  };

  return (
    <Sheet onClose={onClose}>
      <h2 className="sheet-title">{task ? 'Edit task' : 'New task'}</h2>
      <input className="text-field" value={title} onChange={(e) => setTitle(e.target.value)}
        placeholder="Like 'Wax skis' or 'Renew passport'" autoFocus={!task} />

      <p className="field-label">By (optional)</p>
      <div className="date-row">
        <input className="text-field" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        {due && <button className="icon-button" aria-label="Clear date" onClick={() => setDue('')}><X size={18} /></button>}
      </div>

      <p className="field-label">Note (optional)</p>
      <textarea className="note-field" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />

      {hobbies.length + projects.length > 0 && (
        <>
          <p className="field-label">Part of (optional)</p>
          <div className="chips">
            {hobbies.map((h) => (
              <button key={h.id} className="chip" aria-pressed={hobbyId === h.id} onClick={() => chooseHobby(h.id)}>
                <span className="dot" style={{ background: colourVar(h.colour) }} /> {h.name}
              </button>
            ))}
            {projects.map((p) => (
              <button key={p.id} className="chip" aria-pressed={projectId === p.id} onClick={() => chooseProject(p.id)}>
                <FolderOpen size={14} /> {p.name}
              </button>
            ))}
          </div>
          <p className="hint">
            {config.unlinkedTasksOnHome ? 'Linked tasks also show on that page.'
              : 'Linked tasks also show on that page and can come up on Today.'}
          </p>
        </>
      )}

      {(linked || config.unlinkedTasksOnHome) && (
        <>
          <p className="field-label">Energy</p>
          <EnergyChips energy={energy} onChange={setEnergy} />
        </>
      )}

      {full && (
        <p className="hint" style={{ marginTop: 16 }}>
          Kindling holds {config.maxOpenTasks} important tasks at a time. Finish or remove one to add this.
        </p>
      )}
      <div className="stack" style={{ marginTop: 20 }}>
        <button className="button" disabled={!title.trim() || full} onClick={save}>{task ? 'Save' : 'Add task'}</button>
        {task && <button className="button secondary" onClick={remove}>Remove task</button>}
      </div>
    </Sheet>
  );
}
