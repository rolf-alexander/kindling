import { ChevronRight, FolderOpen, Pencil, Plus, Sprout } from 'lucide-react';
import { useState } from 'react';
import { ActivitySheet, HobbySheet, StatusSheet } from '../components/HobbySheets';
import { ProjectSheet } from '../components/ProjectSheets';
import { TaskRow, TaskSheet } from '../components/TaskSheets';
import { useUndoToast } from '../components/UndoToast';
import { navigate } from '../lib/router';
import { LogSheet } from '../components/LogSheet';
import { Empty, Screen } from '../components/Screen';
import { Timeline } from '../components/Timeline';
import { type Activity, db, type Log, type Task } from '../db';
import { setHobbyStatus } from '../hobbies';
import { today } from '../lib/dates';
import { ENERGY_LABELS, EnergyIcon } from '../lib/energy';
import { colourVar, STATUS_LABELS } from '../lib/labels';
import { logIt, undoLog } from '../logging';
import { byDue, taskTarget } from '../tasks';
import { buildTimeline, yearStrip } from '../timeline';
import { useLive } from '../lib/useLive';

type OpenSheet =
  | { kind: 'status' }
  | { kind: 'edit' }
  | { kind: 'activity'; activity?: Activity }
  | { kind: 'log'; log: Log }
  | { kind: 'project' }
  | { kind: 'task'; task: Task }
  | null;

export function HobbyScreen({ id }: { id: string }) {
  const [sheet, setSheet] = useState<OpenSheet>(null);
  const toast = useUndoToast();
  const data = useLive('hobby', async () => {
    const hobby = await db.hobbies.get(id);
    if (!hobby) return null;
    const [activities, projects, logs, goals, tasks] = await Promise.all([
      db.activities.where('hobbyId').equals(id).toArray(),
      db.projects.where('hobbyId').equals(id).toArray(),
      db.logs.where('hobbyId').equals(id).toArray(),
      db.goals.toArray(),
      db.tasks.where('hobbyId').equals(id).toArray(),
    ]);
    return {
      hobby, activities: activities.filter((a) => !a.archived), projects, logs, goals,
      tasks: tasks.filter((t) => !t.doneAt).sort(byDue),
    };
  }, [id]);

  const back = { label: 'Hobbies', path: '/hobbies' };
  if (data === undefined) return null; // still loading
  if (data === null) {
    return (
      <Screen title="Not found" back={back}>
        <Empty icon={<Sprout size={28} />} title="This hobby isn't here">It may have been removed.</Empty>
      </Screen>
    );
  }

  const { hobby, activities, projects, logs, goals, tasks } = data;
  const colour = colourVar(hobby.colour);
  const strip = yearStrip(logs, today());
  const months = buildTimeline(hobby, logs, projects);
  const goalName = (goalId: string) => goals.find((g) => g.id === goalId)?.name;
  const restingSince = hobby.status === 'paused' ? hobby.history?.at(-1)?.at : undefined;
  const longDate = (at: number) => new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'long' });

  return (
    <Screen title={hobby.name} back={back}>
      {/* The year at a glance: soft dots, no numbers. */}
      <div className="card">
        <div className="year-strip">
          {strip.map((m) => (
            <div key={m.key} className="year-month">
              <span className="year-dot" style={{
                background: m.level ? colour : 'var(--empty)',
                opacity: m.level ? [0, 0.45, 0.75, 1][m.level] : 1,
              }} />
              <span className="year-letter">{m.letter}</span>
            </div>
          ))}
        </div>
        <p className="muted" style={{ margin: '12px 0 0', fontSize: 15 }}>
          {restingSince
            ? `Resting since ${longDate(restingSince)}. Nothing's expected of it.`
            : `In Kindling since ${new Date(hobby.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}.`}
        </p>
      </div>

      {hobby.status === 'want' && (
        <div className="card" style={{ marginTop: 12 }}>
          <p style={{ margin: 0 }}>You'd like to get into this. Make it active once it feels like part of your life.</p>
          <button className="button" style={{ marginTop: 12 }} onClick={() => setHobbyStatus(hobby.id, 'active')}>
            <Sprout size={18} /> Make it active
          </button>
        </div>
      )}

      <div className="list" style={{ marginTop: 16 }}>
        <button className="list-row" onClick={() => setSheet({ kind: 'status' })}>
          <span className="label">Status</span>
          <span className="detail">{STATUS_LABELS[hobby.status]}</span>
          <ChevronRight size={18} className="chevron" />
        </button>
        <button className="list-row" onClick={() => setSheet({ kind: 'edit' })}>
          <span className="label">Name and colour</span>
          <span className="dot" style={{ background: colour }} />
          <Pencil size={16} className="chevron" />
        </button>
      </div>

      <h2 className="section-header">Activities</h2>
      <div className="list">
        {activities.map((a) => {
          const extras = [
            ENERGY_LABELS[a.energy],
            a.planAhead && 'Plan ahead',
            ...a.goalIds.map(goalName).filter(Boolean),
          ].filter(Boolean).join(' · ');
          return (
            <button className="list-row" key={a.id} onClick={() => setSheet({ kind: 'activity', activity: a })}>
              <span className="icon-tile" style={{ background: colour, color: '#fff' }}>
                <EnergyIcon energy={a.energy} size={16} />
              </span>
              <span className="label">
                {a.title}
                <span className="row-subtitle">{extras}</span>
              </span>
            </button>
          );
        })}
        <button className="list-row" onClick={() => setSheet({ kind: 'activity' })}>
          <span className="icon-tile"><Plus size={16} /></span>
          <span className="label" style={{ color: 'var(--accent)' }}>Add activity</span>
        </button>
      </div>

      {tasks.length > 0 && (
        <>
          <h2 className="section-header">Tasks</h2>
          <div className="list">
            {tasks.map((t) => (
              <TaskRow key={t.id} task={t} onOpen={() => setSheet({ kind: 'task', task: t })} onDone={async () => {
                const undo = await logIt(taskTarget(t, projects));
                toast.show(<>Done: <b>{t.title}</b></>, () => undoLog(undo));
              }} />
            ))}
          </div>
        </>
      )}

      <h2 className="section-header">Projects</h2>
      <div className="list">
        {[...projects].sort((a, b) => Number(a.status === 'finished') - Number(b.status === 'finished')).map((p) => (
          <button className="list-row" key={p.id} onClick={() => navigate(`/projects/${p.id}`)}>
            <span className="icon-tile"><FolderOpen size={16} /></span>
            <span className="label">{p.name}</span>
            {p.status === 'finished' && <span className="detail">Finished</span>}
            <ChevronRight size={18} className="chevron" />
          </button>
        ))}
        <button className="list-row" onClick={() => setSheet({ kind: 'project' })}>
          <span className="icon-tile"><Plus size={16} /></span>
          <span className="label" style={{ color: 'var(--accent)' }}>New project</span>
        </button>
      </div>

      <Timeline months={months} onOpenLog={(log) => setSheet({ kind: 'log', log })} />

      {sheet?.kind === 'status' && <StatusSheet hobby={hobby} onClose={() => setSheet(null)} />}
      {sheet?.kind === 'edit' && <HobbySheet hobby={hobby} onClose={() => setSheet(null)} />}
      {sheet?.kind === 'activity' && (
        <ActivitySheet hobbyId={hobby.id} activity={sheet.activity} goals={goals} onClose={() => setSheet(null)} />
      )}
      {sheet?.kind === 'log' && (
        <LogSheet existing={sheet.log} context={hobby.name} colour={colour} hobbies={[]} onClose={() => setSheet(null)} />
      )}
      {sheet?.kind === 'project' && (
        <ProjectSheet hobbies={[hobby]} hobbyId={hobby.id} onClose={() => setSheet(null)}
          onCreated={(projectId) => navigate(`/projects/${projectId}`)} />
      )}
      {sheet?.kind === 'task' && (
        <TaskSheet task={sheet.task} hobbies={[hobby]} projects={projects.filter((p) => p.status === 'active')}
          onClose={() => setSheet(null)} />
      )}
      {toast.element}
    </Screen>
  );
}
