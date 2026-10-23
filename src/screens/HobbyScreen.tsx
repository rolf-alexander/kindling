import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronRight, Pencil, Plus, Sprout } from 'lucide-react';
import { useState } from 'react';
import { ActivitySheet, HobbySheet, StatusSheet } from '../components/HobbySheets';
import { LogSheet } from '../components/LogSheet';
import { Empty, Screen } from '../components/Screen';
import { Timeline } from '../components/Timeline';
import { type Activity, db, type Log } from '../db';
import { setHobbyStatus } from '../hobbies';
import { today } from '../lib/dates';
import { ENERGY_LABELS, EnergyIcon } from '../lib/energy';
import { colourVar, STATUS_LABELS } from '../lib/labels';
import { buildTimeline, yearStrip } from '../timeline';

type OpenSheet =
  | { kind: 'status' }
  | { kind: 'edit' }
  | { kind: 'activity'; activity?: Activity }
  | { kind: 'log'; log: Log }
  | null;

export function HobbyScreen({ id }: { id: string }) {
  const [sheet, setSheet] = useState<OpenSheet>(null);
  const data = useLiveQuery(async () => {
    const hobby = await db.hobbies.get(id);
    if (!hobby) return null;
    const [activities, projects, logs, goals] = await Promise.all([
      db.activities.where('hobbyId').equals(id).toArray(),
      db.projects.where('hobbyId').equals(id).toArray(),
      db.logs.where('hobbyId').equals(id).toArray(),
      db.goals.toArray(),
    ]);
    return { hobby, activities: activities.filter((a) => !a.archived), projects, logs, goals };
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

  const { hobby, activities, projects, logs, goals } = data;
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
                background: m.level ? colour : 'var(--separator)',
                opacity: m.level ? [0, 0.45, 0.75, 1][m.level] : 0.5,
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
              <span className="icon-tile" style={{ background: `color-mix(in srgb, ${colour} 28%, transparent)`, color: colour }}>
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

      {projects.length > 0 && (
        <>
          <h2 className="section-header">Projects</h2>
          <div className="list">
            {projects.map((p) => (
              <div className="list-row" key={p.id}>
                <span className="label">{p.name}</span>
                <span className="detail">{p.status === 'finished' ? 'Finished' : 'Active'}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <Timeline months={months} onOpenLog={(log) => setSheet({ kind: 'log', log })} />

      {sheet?.kind === 'status' && <StatusSheet hobby={hobby} onClose={() => setSheet(null)} />}
      {sheet?.kind === 'edit' && <HobbySheet hobby={hobby} onClose={() => setSheet(null)} />}
      {sheet?.kind === 'activity' && (
        <ActivitySheet hobbyId={hobby.id} activity={sheet.activity} goals={goals} onClose={() => setSheet(null)} />
      )}
      {sheet?.kind === 'log' && (
        <LogSheet existing={sheet.log} context={hobby.name} colour={colour} hobbies={[]} onClose={() => setSheet(null)} />
      )}
    </Screen>
  );
}
