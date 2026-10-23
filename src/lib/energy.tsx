import { BatteryFull, BatteryLow, BatteryMedium } from 'lucide-react';
import type { Energy } from '../db';

export const ENERGY_LABELS: Record<Energy, string> = {
  low: 'Low energy',
  medium: 'Medium energy',
  high: 'High energy',
};

export function EnergyIcon({ energy, size = 20 }: { energy: Energy; size?: number }) {
  const Icon = { low: BatteryLow, medium: BatteryMedium, high: BatteryFull }[energy];
  return <Icon size={size} />;
}
