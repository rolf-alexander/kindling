import { useLiveQuery } from 'dexie-react-hooks';
import { Check, CircleCheck, FolderOpen, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { LogSheet } from '../components/LogSheet';
import { NextStepSheet, ProjectSheet, StepSheet } from '../components/ProjectSheets';
import { Empty, Screen } from '../components/Screen';
import { TaskRow, TaskSheet } from '../components/TaskSheets';
import { Timeline } from '../components/Timeline';
import { useUndoToast } from '../components/UndoToast';
import { config } from '../config';
import { db, type Log, type Step, type Task } from '../db';
import { ENERGY_LABELS, EnergyIcon } from '../lib/energy';
import { colourVar } from '../lib/labels';
import { logIt, type Undo, undoLog } from '../logging';
import { finishProject, reopenProject } from '../projects';
import { byDue, taskTarget } from '../tasks';
import { buildTimeline } from '../timeline';

type OpenSheet =
  | { kind: 'edit' }
  | { kind: 'step'; step?: Step; isNext?: boolean }
  | { kind: 'next'; stepTitle: string; undo: Undo }
  | { kind: 'log'; log: Log }
  | { kind: 'task'; task: Task }
  | null;

export function ProjectScreen({ id }: { id: string }) {
  const [sheet, setSheet] = useState<OpenSheet>(null);
  const toast = useUndoToast();
  const data = useLiveQuery(async () => {
    const project = await db.projects.get(id);
    if (!project) return null;
    const [hobby, steps, logs, hobbies, tasks] = await Promise.all([
      project.hobbyId ? db.hobbies.get(project.hobbyId) : undefined,
      db.steps.where('projectId').equals(id).toArray(),
      db.logs.where('projectId').equals(id).toArray(),
      db.hobbies.toArray(),
      db.tasks.where('projectId').equals(id).toArray(),
    ]);
    return { project, hobby, steps, logs, hobbies, tasks: tasks.filter((t) => !t.doneAt).sort(byDue) };
  }, [id]);

  if (data === undefined) return null; // still loading
  if (data === null) {
    return (
      <Screen title="Not found" back={{ label: 'Hobbies', path: '/hobbies' }}>
        <Empty icon={<FolderOpen size={28} />} title="This project isn't here">It may have been removed.</Empty>
      </Screen>
    );
  }

  const { project, hobby, steps, logs, hobbies, tasks } = data;
  const back = hobby ? { label: hobby.name, path: `/hobbies/${hobby.id}` } : { label: 'Hobbies', path: '/hobbies' };
  const colour = hobby ? colourVar(hobby.colour) : 'var(--accent)';
  const open = steps.filter((s) => !s.doneAt).sort((a, b) => a.order - b.order);
  const finished = project.status === 'finished';
  const months = buildTimeline(null, logs, [project]);

  const completeStep = async (step: Step) => {
    const undo = await logIt({
      title: step.title, refType: 'step', refId: step.id, projectId: project.id, hobbyId: project.hobbyId, goalIds: [],
    });
    setSheet({ kind: 'next', stepTitle: step.title, undo });
  };

  return (
    <Screen title={project.name} eyebrow={hobby ? hobby.name : 'Project'} back={back}>
      {finished && (
        <div className="card">
          <p style={{ margin: 0 }}>
            Finished {new Date(project.finishedAt!).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}.
            Its story stays here.
          </p>
          <button className="button secondary" style={{ marginTop: 12 }} onClick={() => reopenProject(project.id)}>
            Reopen project
          </button>
        </div>
      )}

      {!finished && (
        <>
          <h2 className="section-header">Next steps</h2>
          <div className="list">
            {open.map((step, i) => (
              <div className="list-row" key={step.id}>
                <button className="step-tick" aria-label={`Done: ${step.title}`} onClick={() => completeStep(step)}>
                  <Check size={16} strokeWidth={2.6} />
                </button>
                <button className="row-button" onClick={() => setSheet({ kind: 'step', step, isNext: i === 0 })}>
                  <span className="label">
                    {step.title}
                    <span className="row-subtitle">{i === 0 ? 'Up next · ' : ''}{ENERGY_LABELS[step.energy]}</span>
                  </span>
                  <span style={{ color: colour }}><EnergyIcon energy={step.energy} size={18} /></span>
                </button>
              </div>
            ))}
            {open.length < config.maxOpenStepsPerProject ? (
              <button className="list-row" onClick={() => setSheet({ kind: 'step' })}>
                <span className="icon-tile"><Plus size={16} /></span>
                <span className="label" style={{ color: 'var(--accent)' }}>Add a step</span>
              </button>
            ) : (
              <p className="note" style={{ margin: 0, padding: '10px 16px' }}>
                A project holds {config.maxOpenStepsPerProject} next steps at a time. Finish one to add another.
              </p>
            )}
          </div>
        </>
      )}

      {tasks.length > 0 && (
        <>
          <h2 className="section-header">Tasks</h2>
          <div className="list">
            {tasks.map((t) => (
              <TaskRow key={t.id} task={t} onOpen={() => setSheet({ kind: 'task', task: t })} onDone={async () => {
                const undo = await logIt(taskTarget(t, [project]));
                toast.show(<>Done: <b>{t.title}</b></>, () => undoLog(undo));
              }} />
            ))}
          </div>
        </>
      )}

      <div className="list" style={{ marginTop: 16 }}>
        <button className="list-row" onClick={() => setSheet({ kind: 'edit' })}>
          <span className="label">Name and hobby</span>
          <Pencil size={16} className="chevron" />
        </button>
        {!finished && (
          <button className="list-row" onClick={() => finishProject(project.id)}>
            <span className="label">Mark project finished</span>
            <CircleCheck size={18} className="chevron" />
          </button>
        )}
      </div>

      <Timeline months={months} onOpenLog={(log) => setSheet({ kind: 'log', log })} />

      {sheet?.kind === 'edit' && <ProjectSheet project={project} hobbies={hobbies} onClose={() => setSheet(null)} />}
      {sheet?.kind === 'step' && (
        <StepSheet projectId={project.id} step={sheet.step} isNext={sheet.isNext} onClose={() => setSheet(null)} />
      )}
      {sheet?.kind === 'next' && (
        <NextStepSheet projectId={project.id} projectName={project.name} stepTitle={sheet.stepTitle}
          openSteps={open.length} onClose={() => setSheet(null)}
          onUndo={async () => { await undoLog(sheet.undo); setSheet(null); }} />
      )}
      {sheet?.kind === 'log' && (
        <LogSheet existing={sheet.log} context={project.name} colour={colour} hobbies={[]} onClose={() => setSheet(null)} />
      )}
      {sheet?.kind === 'task' && (
        <TaskSheet task={sheet.task} hobbies={hobby ? [hobby] : []} projects={[project]} onClose={() => setSheet(null)} />
      )}
      {toast.element}
    </Screen>
  );
}
