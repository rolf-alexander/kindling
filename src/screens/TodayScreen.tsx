import { useLiveQuery } from 'dexie-react-hooks';
import { ClipboardPaste, Flame } from 'lucide-react';
import { Empty, Screen } from '../components/Screen';
import { db } from '../db';
import { navigate } from '../lib/router';

export function TodayScreen() {
  const date = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  const hobbyCount = useLiveQuery(() => db.hobbies.count());
  if (hobbyCount === undefined) return null; // still loading

  return (
    <Screen title="Today" eyebrow={date}>
      {hobbyCount === 0 ? (
        <>
          <Empty icon={<Flame size={28} />} title="Nothing to suggest yet">
            Once your hobbies are pasted in, three ideas will appear here: one gentle, one middling, one lively.
          </Empty>
          <button className="button" style={{ marginTop: 16 }} onClick={() => navigate('/more/import')}>
            <ClipboardPaste size={18} /> Paste in your activities
          </button>
        </>
      ) : (
        <Empty icon={<Flame size={28} />} title="Suggestions are on their way">
          Your hobbies are in. Three ideas for right now will appear here in the next update.
        </Empty>
      )}
    </Screen>
  );
}
