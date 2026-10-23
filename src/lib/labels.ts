import type { HobbyStatus } from '../db';

export const STATUS_LABELS: Record<HobbyStatus, string> = {
  active: 'Active',
  want: 'Want to pursue',
  paused: 'Paused',
  semiRetired: 'Semi-retired',
};

/** The order hobby groups appear in. */
export const STATUS_ORDER: HobbyStatus[] = ['active', 'want', 'paused', 'semiRetired'];

/** Soft colours given to new hobbies in turn. Each matches a --hobby-… colour in styles.css. */
export const HOBBY_COLOURS = ['peach', 'sage', 'sky', 'butter', 'lilac', 'sea'];

export const colourVar = (colour: string) => `var(--hobby-${colour})`;
