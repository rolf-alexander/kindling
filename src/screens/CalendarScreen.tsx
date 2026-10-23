import { CalendarDays } from 'lucide-react';
import { Empty, Screen } from '../components/Screen';

export function CalendarScreen() {
  return (
    <Screen title="Calendar">
      <Empty icon={<CalendarDays size={28} />} title="Your month will appear here">
        Things you've done show up as soft dots, and you can pencil something in for a day.
      </Empty>
    </Screen>
  );
}
