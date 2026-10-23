import { Flame } from 'lucide-react';
import { Empty, Screen } from '../components/Screen';

export function TodayScreen() {
  const date = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <Screen title="Today" eyebrow={date}>
      <Empty icon={<Flame size={28} />} title="Nothing to suggest yet">
        Once your hobbies are pasted in, three ideas will appear here: one gentle, one middling, one lively.
      </Empty>
    </Screen>
  );
}
