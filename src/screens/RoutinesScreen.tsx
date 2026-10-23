import { Sparkles } from 'lucide-react';
import { Empty, Screen } from '../components/Screen';

export function RoutinesScreen() {
  return (
    <Screen title="Routines">
      <Empty icon={<Sparkles size={28} />} title="No routines yet">
        Self-care routines go here, each logged with one tap.
      </Empty>
    </Screen>
  );
}
