import type { HobbyStatus } from '../db';

export const STATUS_LABELS: Record<HobbyStatus, string> = {
  active: 'Active',
  want: 'Want to pursue',
  paused: 'Paused',
  semiRetired: 'Semi-retired',
};

/** Calm explanations shown when choosing a status. */
export const STATUS_DESCRIPTIONS: Record<HobbyStatus, string> = {
  active: 'Part of your life right now. Suggested on the Today screen.',
  want: "Something you'd like to get into. Suggested alongside active hobbies.",
  paused: "Resting for now. Not suggested, and its goals rest too. Logging something brings it back.",
  semiRetired: 'Part of your story. Not suggested, but its timeline stays.',
};

/** The order hobby groups appear in. */
export const STATUS_ORDER: HobbyStatus[] = ['active', 'want', 'paused', 'semiRetired'];

/** Soft colours given to new hobbies in turn. Each matches a --hobby-… colour in styles.css. */
export const HOBBY_COLOURS = ['peach', 'sage', 'sky', 'butter', 'lilac', 'sea'];

export const colourVar = (colour: string) => `var(--hobby-${colour})`;
