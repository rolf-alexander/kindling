import { ChevronRight, ClipboardPaste, FolderOpen, Plus, Sprout } from 'lucide-react';
import { useState } from 'react';
import { HobbySheet } from '../components/HobbySheets';
import { ProjectSheet } from '../components/ProjectSheets';
import { Empty, Screen } from '../components/Screen';
import { db } from '../db';
import { colourVar, STATUS_LABELS, STATUS_ORDER } from '../lib/labels';
import { navigate } from '../lib/router';
import { useLive } from '../lib/useLive';

const SECTION_NOTES: Partial<Record<string, string>> = {
  want: 'Suggested too. Make one active once it feels like part of your life.',
};

export function HobbiesScreen() {
  const hobbies = useLive('hobbies-hobbies', () => db.hobbies.toArray());
  const activities = useLive('hobbies-activities', () => db.activities.toArray());
  const projects = useLive('hobbies-projects', () => db.projects.toArray());
  const [adding, setAdding] = useState<'hobby' | 'project' | null>(null);
  if (!hobbies || !activities || !projects) return null; // still loading

  const newHobbySheet = adding === 'hobby' && (
    <HobbySheet onClose={() => setAdding(null)} onCreated={(id) => navigate(`/hobbies/${id}`)} />
  );
  const newProjectSheet = adding === 'project' && (
    <ProjectSheet hobbies={hobbies.filter((h) => h.status !== 'semiRetired')} onClose={() => setAdding(null)}
      onCreated={(id) => navigate(`/projects/${id}`)} />
  );
  const hobbyName = (id?: string) => hobbies.find((h) => h.id === id)?.name;
  const projectRows = (status: 'active' | 'finished') =>
    projects.filter((p) => p.status === status).sort((a, b) => a.name.localeCompare(b.name)).map((p) => (
      <button className="list-row" key={p.id} onClick={() => navigate(`/projects/${p.id}`)}>
        <span className="icon-tile"><FolderOpen size={16} /></span>
        <span className="label">
          {p.name}
          <span className="row-subtitle">{hobbyName(p.hobbyId) ?? 'Stand-alone'}</span>
        </span>
        <ChevronRight size={18} className="chevron" />
      </button>
    ));
  const activeProjects = projectRows('active');
  const finishedProjects = projectRows('finished');

  if (hobbies.length === 0) {
    return (
      <Screen title="Hobbies">
        <Empty icon={<Sprout size={28} />} title="No hobbies yet">
          Your hobbies and projects will live here, each with its own timeline.
        </Empty>
        <div className="stack" style={{ marginTop: 16 }}>
          <button className="button" onClick={() => navigate('/more/import')}>
            <ClipboardPaste size={18} /> Paste in your activities
          </button>
          <button className="button secondary" onClick={() => setAdding('hobby')}><Plus size={18} /> Add one hobby</button>
        </div>
        {newHobbySheet}
      </Screen>
    );
  }

  const activityCount = (hobbyId: string) => activities.filter((a) => a.hobbyId === hobbyId && !a.archived).length;

  return (
    <Screen title="Hobbies">
      {STATUS_ORDER.map((status) => {
        const group = hobbies.filter((h) => h.status === status).sort((a, b) => a.name.localeCompare(b.name));
        if (group.length === 0) return null;
        return (
          <section key={status}>
            <h2 className="section-header">{STATUS_LABELS[status]}</h2>
            <div className="list">
              {group.map((hobby) => {
                const count = activityCount(hobby.id);
                const detail = status === 'paused' ? 'Resting' : `${count} ${count === 1 ? 'activity' : 'activities'}`;
                return (
                  <button className="list-row" key={hobby.id} onClick={() => navigate(`/hobbies/${hobby.id}`)}>
                    <span className="dot" style={{ background: colourVar(hobby.colour) }} />
                    <span className="label">{hobby.name}</span>
                    <span className="detail">{detail}</span>
                    <ChevronRight size={18} className="chevron" />
                  </button>
                );
              })}
            </div>
            {SECTION_NOTES[status] && <p className="note">{SECTION_NOTES[status]}</p>}
          </section>
        );
      })}
      <h2 className="section-header">Projects</h2>
      {activeProjects.length > 0 ? <div className="list">{activeProjects}</div>
        : <p className="note" style={{ marginTop: 0 }}>No projects on the go.</p>}

      <div className="stack" style={{ marginTop: 24 }}>
        <button className="button secondary" onClick={() => setAdding('hobby')}><Plus size={18} /> New hobby</button>
        <button className="button secondary" onClick={() => setAdding('project')}><Plus size={18} /> New project</button>
      </div>

      {finishedProjects.length > 0 && (
        <>
          <h2 className="section-header">Finished projects</h2>
          <div className="list">{finishedProjects}</div>
        </>
      )}
      {newHobbySheet}
      {newProjectSheet}
    </Screen>
  );
}
