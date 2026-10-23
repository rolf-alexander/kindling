import { Sprout } from 'lucide-react';
import { Empty, Screen } from '../components/Screen';

export function HobbiesScreen() {
  return (
    <Screen title="Hobbies">
      <Empty icon={<Sprout size={28} />} title="No hobbies yet">
        Your hobbies and projects will live here, each with its own timeline.
      </Empty>
    </Screen>
  );
}
