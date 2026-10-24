// Every rule that might change lives here, so changing your mind is a one-line edit.
// See DECISIONS.md for why each value was chosen.

import type { Energy } from './db';

export const config = {
  /** "Today" runs from this hour to the same hour the next day (D8). 1am still counts as tonight. */
  dayStartsAtHour: 4,

  /** From this hour, the home screen shows the "plan something for tomorrow" card. */
  planCardFromHour: 13,

  /** For this many days at the start of a month, Today offers last month's recap. */
  recapCardDays: 7,

  /** 1 = Monday. Goal weeks start on this day. */
  weekStartsOn: 1,

  maxOpenTasks: 5,
  maxUpNext: 5,
  maxOpenStepsPerProject: 5,

  /** Only the first open step of each project is suggested on the home screen. */
  suggestOnlyFirstProjectStep: true,

  /** Energy given to project steps and tasks unless you set one. */
  defaultEnergy: 'medium' as Energy,

  /** Photos are shrunk on the phone to this size (longest side, in pixels) before saving. */
  photoMaxSide: 1200,

  /**
   * Look up covers for books (Open Library) and shows (TVmaze) automatically. Only the title is sent (D28).
   * Set to false to keep everything on the phone; you can still take cover photos yourself.
   */
  autoCovers: true,

  // --- Undecided: see DECISIONS.md ---

  /** Whether semi-retired hobbies occasionally reappear in suggestions. */
  semiRetiredInSuggestions: false,

  /** Whether important tasks not linked to a hobby/project appear on the home screen. */
  unlinkedTasksOnHome: false,

  /** Whether hobby-linked tasks get their own cap, separate from admin tasks. null = share the one cap. */
  maxOpenLinkedTasks: null as number | null,
};
