import { CircleCheck, ListTodo, Plus } from 'lucide-react';
import { useState } from 'react';
import { Empty, Screen } from '../components/Screen';
import { TaskRow, TaskSheet } from '../components/TaskSheets';
import { useUndoToast } from '../components/UndoToast';
import { config } from '../config';
import { db, type Task } from '../db';
import { logIt, undoLog } from '../logging';
import { byDue, taskTarget } from '../tasks';
import { useLive } from '../lib/useLive';

/** Done tasks stay visible for this long, quietly, then drop off the list. */
const RECENT_DAYS = 14;

export function TasksScreen() {
  const data = useLive('tasks', async () => {
    const [tasks, hobbies, projects] = await Promise.all([db.tasks.toArray(), db.hobbies.toArray(), db.projects.toArray()]);
    return { tasks, hobbies, projects };
  });
  const [editing, setEditing] = useState<{ task?: Task } | null>(null);
  const toast = useUndoToast();
  if (!data) return null; // still loading

  const { tasks, hobbies, projects } = data;
  const back = { label: 'More', path: '/more' };
  const open = tasks.filter((t) => !t.doneAt).sort(byDue);
  const since = Date.now() - RECENT_DAYS * 86_400_000;
  const recentlyDone = tasks.filter((t) => t.doneAt && t.doneAt > since).sort((a, b) => b.doneAt! - a.doneAt!);
  const linkName = (t: Task) =>
    hobbies.find((h) => h.id === t.hobbyId)?.name ?? projects.find((p) => p.id === t.projectId)?.name;

  const done = async (t: Task) => {
    const undo = await logIt(taskTarget(t, projects));
    toast.show(<>Done: <b>{t.title}</b></>, () => undoLog(undo));
  };

  const sheet = editing && (
    <TaskSheet task={editing.task} hobbies={hobbies.filter((h) => h.status !== 'semiRetired')}
      projects={projects.filter((p) => p.status === 'active')} onClose={() => setEditing(null)} />
  );

  return (
    <Screen title="Important tasks" back={back}>
      {open.length > 0 ? (
        <div className="list">
          {open.map((t) => (
            <TaskRow key={t.id} task={t} linkName={linkName(t)} onDone={() => done(t)} onOpen={() => setEditing({ task: t })} />
          ))}
          {open.length < config.maxOpenTasks ? (
            <button className="list-row" onClick={() => setEditing({})}>
              <span className="icon-tile"><Plus size={16} /></span>
              <span className="label" style={{ color: 'var(--accent)' }}>Add a task</span>
            </button>
          ) : (
            <p className="note" style={{ margin: 0, padding: '10px 16px' }}>
              Kindling holds {config.maxOpenTasks} tasks at a time, so the list never gets long. Finish one to add another.
            </p>
          )}
        </div>
      ) : (
        <>
          <Empty icon={<ListTodo size={28} />} title={recentlyDone.length ? 'All clear' : 'No tasks'}>
            One-off things like errands or "wax skis". Up to {config.maxOpenTasks} at a time, with no nagging.
          </Empty>
          <button className="button" style={{ marginTop: 16 }} onClick={() => setEditing({})}><Plus size={18} /> Add a task</button>
        </>
      )}

      {recentlyDone.length > 0 && (
        <>
          <h2 className="section-header">Recently done</h2>
          <div className="list">
            {recentlyDone.map((t) => (
              <div className="list-row moment" key={t.id}>
                <span className="icon-tile"><CircleCheck size={16} /></span>
                <span className="label">{t.title}</span>
                <span className="detail">
                  {new Date(t.doneAt!).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
      {sheet}
      {toast.element}
    </Screen>
  );
}
