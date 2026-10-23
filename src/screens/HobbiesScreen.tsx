import { useLiveQuery } from 'dexie-react-hooks';
import { ClipboardPaste, Sprout } from 'lucide-react';
import { Empty, Screen } from '../components/Screen';
import { db } from '../db';
import { colourVar, STATUS_LABELS, STATUS_ORDER } from '../lib/labels';
import { navigate } from '../lib/router';

export function HobbiesScreen() {
  const hobbies = useLiveQuery(() => db.hobbies.toArray());
  const activities = useLiveQuery(() => db.activities.toArray());
  if (!hobbies || !activities) return null; // still loading

  if (hobbies.length === 0) {
    return (
      <Screen title="Hobbies">
        <Empty icon={<Sprout size={28} />} title="No hobbies yet">
          Your hobbies and projects will live here, each with its own timeline.
        </Empty>
        <button className="button" style={{ marginTop: 16 }} onClick={() => navigate('/more/import')}>
          <ClipboardPaste size={18} /> Paste in your activities
        </button>
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
                return (
                  <div className="list-row" key={hobby.id}>
                    <span className="dot" style={{ background: colourVar(hobby.colour) }} />
                    <span className="label">{hobby.name}</span>
                    <span className="detail">{count} {count === 1 ? 'activity' : 'activities'}</span>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </Screen>
  );
}
