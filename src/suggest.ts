// The suggestion engine: picks one low, one medium and one high energy thing to do right now.
// It's a "pure function": it only looks at the data it's given and changes nothing, which makes it easy to test.
//
// The rules:
// - Only things from active or want-to-pursue hobbies (and active projects). Paused and semi-retired are left out.
// - Never plan-ahead activities, never anything already done today or pencilled in for today (that shows separately).
// - Never two suggestions from the same hobby.
// - Things not done for a while are more likely to come up. It's still random, so it doesn't feel mechanical.

import { config } from './config';
import type { Activity, Day, Energy, Hobby, HobbyStatus, Log, Plan, Project, RefType, Step, Task } from './db';
import { daysBetween } from './lib/dates';

export interface World {
  hobbies: Hobby[];
  projects: Project[];
  activities: Activity[];
  steps: Step[];
  tasks: Task[];
  logs: Log[];
  plans: Plan[];
}

/** Anything that can be suggested, pencilled in or logged: an activity, a project's next step, or a task. */
export interface Doable {
  key: string; // e.g. "activity:3f2b…"
  refType: Extract<RefType, 'activity' | 'step' | 'task'>;
  refId: string;
  title: string;
  energy: Energy;
  hobbyId?: string;
  projectId?: string;
  goalIds: string[];
  planAhead: boolean;
  /** For steps: whether it's the next open step of its project. */
  isFirstStep: boolean;
  /** Two suggestions never share a group: the hobby, or the project if it has no hobby. */
  group: string;
}

export const ENERGIES: Energy[] = ['low', 'medium', 'high'];

export const keyOf = (refType: RefType, refId: string) => `${refType}:${refId}`;

/** Every open activity, project step and task, whatever its hobby's status. */
export function toDoables(world: World): Doable[] {
  const projectById = new Map(world.projects.map((p) => [p.id, p]));
  const out: Doable[] = [];

  for (const a of world.activities) {
    if (a.archived) continue;
    const hobbyId = a.hobbyId ?? (a.projectId ? projectById.get(a.projectId)?.hobbyId : undefined);
    const key = keyOf('activity', a.id);
    out.push({
      key, refType: 'activity', refId: a.id, title: a.title, energy: a.energy, hobbyId, projectId: a.projectId,
      goalIds: a.goalIds, planAhead: a.planAhead, isFirstStep: false, group: hobbyId ?? a.projectId ?? key,
    });
  }

  // The next open step of each project is the one with the lowest order.
  const firstStep = new Map<string, Step>();
  for (const s of world.steps) {
    if (s.doneAt) continue;
    const current = firstStep.get(s.projectId);
    if (!current || s.order < current.order) firstStep.set(s.projectId, s);
  }
  for (const s of world.steps) {
    const project = projectById.get(s.projectId);
    if (s.doneAt || !project || project.status !== 'active') continue;
    const key = keyOf('step', s.id);
    out.push({
      key, refType: 'step', refId: s.id, title: s.title, energy: s.energy, hobbyId: project.hobbyId,
      projectId: project.id, goalIds: [], planAhead: false, isFirstStep: firstStep.get(s.projectId) === s,
      group: project.hobbyId ?? project.id,
    });
  }

  for (const t of world.tasks) {
    if (t.doneAt) continue;
    const hobbyId = t.hobbyId ?? (t.projectId ? projectById.get(t.projectId)?.hobbyId : undefined);
    const key = keyOf('task', t.id);
    out.push({
      key, refType: 'task', refId: t.id, title: t.title, energy: t.energy, hobbyId, projectId: t.projectId,
      goalIds: [], planAhead: false, isFirstStep: false, group: hobbyId ?? t.projectId ?? key,
    });
  }
  return out;
}

function suggestibleStatuses(): Set<HobbyStatus> {
  const statuses = new Set<HobbyStatus>(['active', 'want']);
  if (config.semiRetiredInSuggestions) statuses.add('semiRetired');
  return statuses;
}

/** Whether a doable may ever appear as a right-now suggestion (ignoring what's been done today). */
export function isSuggestible(d: Doable, world: World): boolean {
  if (d.planAhead) return false;
  if (d.refType === 'step' && config.suggestOnlyFirstProjectStep && !d.isFirstStep) return false;
  if (d.refType === 'task' && !d.hobbyId && !d.projectId && !config.unlinkedTasksOnHome) return false;
  if (d.projectId) {
    const project = world.projects.find((p) => p.id === d.projectId);
    if (!project || project.status !== 'active') return false;
  }
  if (d.hobbyId) {
    const hobby = world.hobbies.find((h) => h.id === d.hobbyId);
    if (!hobby || !suggestibleStatuses().has(hobby.status)) return false;
  }
  return true;
}

/** How much more likely something is to be picked: grows with days since it (and its hobby) were last done. */
function weigher(logs: Log[], today: Day) {
  const lastDay = new Map<string, Day>();
  const remember = (key: string, day: Day) => {
    const current = lastDay.get(key);
    if (!current || day > current) lastDay.set(key, day);
  };
  for (const log of logs) {
    if (log.refId) remember(keyOf(log.refType, log.refId), log.day);
    const group = log.hobbyId ?? log.projectId;
    if (group) remember(group, log.day);
  }
  const NEVER = 30; // "never done" counts the same as 30+ days ago
  const daysSince = (key: string) => {
    const day = lastDay.get(key);
    return day ? Math.min(daysBetween(day, today), NEVER) : NEVER;
  };
  return (d: Doable) => 1 + daysSince(d.key) + daysSince(d.group);
}

function weightedPick<T>(items: T[], weight: (item: T) => number, random: () => number): T | null {
  if (items.length === 0) return null;
  const weights = items.map(weight);
  let roll = random() * weights.reduce((sum, w) => sum + w, 0);
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll < 0) return items[i];
  }
  return items[items.length - 1];
}

export interface SuggestOptions {
  today: Day;
  /** The suggestions currently on screen (low, medium, high). Ones still valid are kept, so the screen stays calm. */
  current?: (string | null)[];
  /** Keys to avoid if there's any alternative ("show me others"). */
  avoid?: string[];
  random?: () => number;
}

/** Three suggestions in the order low, medium, high. A slot is null when there's nothing at that energy. */
export function suggest(world: World, { today, current = [], avoid = [], random = Math.random }: SuggestOptions) {
  const doneToday = new Set(world.logs.filter((l) => l.day === today && l.refId).map((l) => keyOf(l.refType, l.refId!)));
  const plannedToday = new Set(world.plans.filter((p) => p.day === today).map((p) => keyOf(p.refType, p.refId)));
  const candidates = toDoables(world).filter(
    (d) => isSuggestible(d, world) && !doneToday.has(d.key) && !plannedToday.has(d.key),
  );
  const byKey = new Map(candidates.map((c) => [c.key, c]));
  const weight = weigher(world.logs, today);

  const picks: (Doable | null)[] = [null, null, null];
  const usedGroups = new Set<string>();

  // Keep current suggestions that are still valid.
  current.forEach((key, i) => {
    const c = key ? byKey.get(key) : undefined;
    if (c && c.energy === ENERGIES[i] && !usedGroups.has(c.group)) {
      picks[i] = c;
      usedGroups.add(c.group);
    }
  });

  // Fill the empty slots, starting with the energy level that has the fewest options,
  // so a level with only one hobby to offer still gets it.
  const optionsAt = (i: number) => candidates.filter((c) => c.energy === ENERGIES[i]).length;
  const empty = [0, 1, 2].filter((i) => !picks[i]).sort((a, b) => optionsAt(a) - optionsAt(b));
  for (const i of empty) {
    const pool = candidates.filter((c) => c.energy === ENERGIES[i] && !usedGroups.has(c.group));
    const fresh = pool.filter((c) => !avoid.includes(c.key));
    const pick = weightedPick(fresh.length ? fresh : pool, weight, random);
    if (pick) {
      picks[i] = pick;
      usedGroups.add(pick.group);
    }
  }
  return picks;
}
