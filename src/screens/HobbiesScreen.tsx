import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronRight, ClipboardPaste, Plus, Sprout } from 'lucide-react';
import { useState } from 'react';
import { HobbySheet } from '../components/HobbySheets';
import { Empty, Screen } from '../components/Screen';
import { db } from '../db';
import { colourVar, STATUS_LABELS, STATUS_ORDER } from '../lib/labels';
import { navigate } from '../lib/router';

const SECTION_NOTES: Partial<Record<string, string>> = {
  want: 'Suggested too. Make one active once it feels like part of your life.',
};

export function HobbiesScreen() {
  const hobbies = useLiveQuery(() => db.hobbies.toArray());
  const activities = useLiveQuery(() => db.activities.toArray());
  const [adding, setAdding] = useState(false);
  if (!hobbies || !activities) return null; // still loading

  const newHobbySheet = adding && (
    <HobbySheet onClose={() => setAdding(false)} onCreated={(id) => navigate(`/hobbies/${id}`)} />
  );

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
          <button className="button secondary" onClick={() => setAdding(true)}><Plus size={18} /> Add one hobby</button>
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
      <button className="button secondary" style={{ marginTop: 24 }} onClick={() => setAdding(true)}>
        <Plus size={18} /> New hobby
      </button>
      {newHobbySheet}
    </Screen>
  );
}
