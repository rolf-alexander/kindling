// The database: what Kindling stores on the phone, and the shape of each kind of thing.
// Stored with IndexedDB (the browser's built-in database) through the Dexie library (D4).

import Dexie, { type EntityTable } from 'dexie';

export type Energy = 'low' | 'medium' | 'high';
export type HobbyStatus = 'active' | 'want' | 'paused' | 'semiRetired';

/** A day, written as "2026-10-23". Uses the 4am day boundary, see lib/dates.ts. */
export type Day = string;

export interface Hobby {
  id: string;
  name: string;
  status: HobbyStatus;
  colour: string; // one of the soft palette colours in styles.css
  emoji?: string;
  createdAt: number;
  /** Each status change, oldest first, so the timeline can show moments like "Picked back up". */
  history?: { at: number; status: HobbyStatus }[];
}

export interface Project {
  id: string;
  name: string;
  hobbyId?: string; // empty for a stand-alone project
  status: 'active' | 'finished';
  createdAt: number;
  finishedAt?: number;
}

/** A project's "next step". Up to 5 open at a time. */
export interface Step {
  id: string;
  projectId: string;
  title: string;
  energy: Energy;
  order: number;
  doneAt?: number;
}

/** Something concrete to do, belonging to a hobby or a project. */
export interface Activity {
  id: string;
  title: string;
  hobbyId?: string;
  projectId?: string;
  energy: Energy;
  planAhead: boolean; // never a right-now suggestion; offered on the "plan for tomorrow" card instead
  goalIds: string[];
  archived?: boolean;
  createdAt: number;
}

/** A one-off important task. */
export interface Task {
  id: string;
  title: string;
  due?: Day;
  note?: string;
  hobbyId?: string;
  projectId?: string;
  energy: Energy;
  createdAt: number;
  doneAt?: number;
}

export interface Routine {
  id: string;
  name: string;
  steps: string[];
  goalIds: string[];
  createdAt: number;
}

/** A goal is a tag like "Outside" with an optional target per period. Belongs to a hobby only if it should pause with it. */
export interface Goal {
  id: string;
  name: string;
  target?: number;
  period: 'week' | 'month';
  hobbyId?: string;
  createdAt: number;
}

/** What a log or plan points at. */
export type RefType = 'activity' | 'step' | 'task' | 'routine' | 'media' | 'adhoc';

/** Something pencilled in for a day. It simply stops showing once the day has passed (D6). */
export interface Plan {
  id: string;
  day: Day;
  refType: RefType;
  refId: string;
}

/** A record that you did something. Keeps a snapshot of what it was about (D5). */
export interface Log {
  id: string;
  at: number; // exact time, in milliseconds
  day: Day; // which day it counts towards
  title: string;
  refType: RefType;
  refId?: string; // empty for ad-hoc logs
  hobbyId?: string;
  projectId?: string;
  goalIds: string[];
  note?: string;
  durationMin?: number;
  photoId?: string;
}

/** A book or show. Finished ones go to the Reading & Watching timeline (D9). */
export interface Media {
  id: string;
  kind: 'book' | 'show';
  title: string;
  status: 'upNext' | 'current' | 'finished';
  photoId?: string;
  order: number;
  startedAt?: number;
  finishedAt?: number;
  /** Set once a cover has been looked up online, found or not, so it isn't asked for again. */
  coverLookedUp?: boolean;
}

/** Photos live in their own table so lists don't have to load the images. */
export interface Photo {
  id: string;
  blob: Blob;
  createdAt: number;
}

export interface Setting {
  key: string;
  value: unknown;
}

export const db = new Dexie('kindling') as Dexie & {
  hobbies: EntityTable<Hobby, 'id'>;
  projects: EntityTable<Project, 'id'>;
  steps: EntityTable<Step, 'id'>;
  activities: EntityTable<Activity, 'id'>;
  tasks: EntityTable<Task, 'id'>;
  routines: EntityTable<Routine, 'id'>;
  goals: EntityTable<Goal, 'id'>;
  plans: EntityTable<Plan, 'id'>;
  logs: EntityTable<Log, 'id'>;
  media: EntityTable<Media, 'id'>;
  photos: EntityTable<Photo, 'id'>;
  settings: EntityTable<Setting, 'key'>;
};

// Each line lists the fields we search by (the first is the ID). "*goalIds" means "search inside the list".
db.version(1).stores({
  hobbies: 'id, status',
  projects: 'id, hobbyId, status',
  steps: 'id, projectId',
  activities: 'id, hobbyId, projectId',
  tasks: 'id, hobbyId, projectId',
  routines: 'id',
  goals: 'id, hobbyId',
  plans: 'id, day',
  logs: 'id, day, at, hobbyId, projectId, refId, *goalIds',
  media: 'id, status',
  photos: 'id',
  settings: 'key',
});

