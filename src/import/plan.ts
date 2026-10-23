// Works out exactly what an import would add, given what's already in Kindling.
// Things are matched by name (ignoring capitals), so pasting the same list twice adds nothing new.
// Nothing is saved here; the preview shows this plan and apply.ts saves it.

import { config } from '../config';
import type { Activity, Goal, Hobby, Media, Project, Routine, Step, Task } from '../db';
import { newId } from '../lib/ids';
import { HOBBY_COLOURS } from '../lib/labels';
import type { ParsedImport, ParsedProject } from './parse';

export interface Existing {
  hobbies: Hobby[];
  projects: Project[];
  steps: Step[];
  activities: Activity[];
  tasks: Task[];
  routines: Routine[];
  goals: Goal[];
  media: Media[];
}

export interface ImportPlan {
  hobbies: Hobby[];
  projects: Project[];
  steps: Step[];
  activities: Activity[];
  tasks: Task[];
  routines: Routine[];
  goals: Goal[];
  media: Media[];
  /** How many lines matched something Kindling already has. */
  alreadyThere: number;
  problems: string[];
}

const key = (name: string) => name.trim().toLowerCase();

export function planImport(parsed: ParsedImport, existing: Existing, now = Date.now()): ImportPlan {
  const plan: ImportPlan = {
    hobbies: [], projects: [], steps: [], activities: [], tasks: [], routines: [], goals: [], media: [],
    alreadyThere: 0,
    problems: [...parsed.problems],
  };

  // --- Hobbies: reuse ones that already exist, so new activities join them ---
  const hobbyIds = new Map(existing.hobbies.map((h) => [key(h.name), h.id]));
  let colourIndex = existing.hobbies.length;
  for (const h of parsed.hobbies) {
    if (hobbyIds.has(key(h.name))) continue;
    const hobby: Hobby = {
      id: newId(), name: h.name, status: h.status,
      colour: HOBBY_COLOURS[colourIndex++ % HOBBY_COLOURS.length], createdAt: now,
    };
    plan.hobbies.push(hobby);
    hobbyIds.set(key(h.name), hobby.id);
  }

  // --- Goals: listed ones first, then any an activity mentions that don't exist yet (as plain tags) ---
  const goalIds = new Map(existing.goals.map((g) => [key(g.name), g.id]));
  for (const g of parsed.goals) {
    if (goalIds.has(key(g.name))) {
      plan.alreadyThere++;
      continue;
    }
    let hobbyId: string | undefined;
    if (g.hobby) {
      hobbyId = hobbyIds.get(key(g.hobby));
      if (!hobbyId) plan.problems.push(`Goal "${g.name}": there's no hobby called "${g.hobby}", so it isn't linked to one.`);
    }
    const goal: Goal = { id: newId(), name: g.name, target: g.target, period: g.period, hobbyId, createdAt: now };
    plan.goals.push(goal);
    goalIds.set(key(g.name), goal.id);
  }
  const goalIdsFor = (names: string[]) =>
    names.map((name) => {
      let id = goalIds.get(key(name));
      if (!id) {
        const goal: Goal = { id: newId(), name, period: 'week', createdAt: now };
        plan.goals.push(goal);
        goalIds.set(key(name), goal.id);
        id = goal.id;
      }
      return id;
    });

  // --- Projects and their next steps (up to the cap of open steps per project) ---
  const projectIds = new Map(existing.projects.filter((p) => p.status === 'active').map((p) => [key(p.name), p.id]));
  const openStepCounts = new Map<string, number>();
  const openStepKeys = new Set<string>();
  for (const s of existing.steps) {
    if (s.doneAt) continue;
    openStepCounts.set(s.projectId, (openStepCounts.get(s.projectId) ?? 0) + 1);
    openStepKeys.add(s.projectId + '|' + key(s.title));
  }
  const addProject = (p: ParsedProject, hobbyId?: string) => {
    let projectId = projectIds.get(key(p.name));
    if (!projectId) {
      const project: Project = { id: newId(), name: p.name, hobbyId, status: 'active', createdAt: now };
      plan.projects.push(project);
      projectIds.set(key(p.name), project.id);
      projectId = project.id;
    }
    for (const s of p.steps) {
      const stepKey = projectId + '|' + key(s.title);
      if (openStepKeys.has(stepKey)) {
        plan.alreadyThere++;
        continue;
      }
      const count = openStepCounts.get(projectId) ?? 0;
      if (count >= config.maxOpenStepsPerProject) {
        plan.problems.push(`"${p.name}" holds ${config.maxOpenStepsPerProject} next steps at a time, so "${s.title}" was left out.`);
        continue;
      }
      plan.steps.push({ id: newId(), projectId, title: s.title, energy: s.energy ?? config.defaultEnergy, order: count });
      openStepCounts.set(projectId, count + 1);
      openStepKeys.add(stepKey);
    }
  };

  // --- Activities (and each hobby's projects) ---
  const activityKeys = new Set(existing.activities.map((a) => (a.hobbyId ?? a.projectId) + '|' + key(a.title)));
  for (const h of parsed.hobbies) {
    const hobbyId = hobbyIds.get(key(h.name))!;
    for (const a of h.activities) {
      const activityKey = hobbyId + '|' + key(a.title);
      if (activityKeys.has(activityKey)) {
        plan.alreadyThere++;
        continue;
      }
      plan.activities.push({
        id: newId(), title: a.title, hobbyId, energy: a.energy ?? config.defaultEnergy,
        planAhead: a.planAhead, goalIds: goalIdsFor(a.goals), createdAt: now,
      });
      activityKeys.add(activityKey);
    }
    for (const p of h.projects) addProject(p, hobbyId);
  }
  for (const p of parsed.projects) addProject(p);

  // --- Important tasks (up to the cap of open tasks) ---
  const openTasks = existing.tasks.filter((t) => !t.doneAt);
  let openTaskCount = openTasks.length;
  const openTaskTitles = new Set(openTasks.map((t) => key(t.title)));
  for (const t of parsed.tasks) {
    if (openTaskTitles.has(key(t.title))) {
      plan.alreadyThere++;
      continue;
    }
    if (openTaskCount >= config.maxOpenTasks) {
      plan.problems.push(`Kindling keeps ${config.maxOpenTasks} important tasks at a time, so "${t.title}" was left out.`);
      continue;
    }
    let hobbyId: string | undefined;
    let projectId: string | undefined;
    if (t.link) {
      hobbyId = hobbyIds.get(key(t.link));
      if (!hobbyId) projectId = projectIds.get(key(t.link));
      if (!hobbyId && !projectId) {
        plan.problems.push(`Task "${t.title}": there's no hobby or project called "${t.link}", so it isn't linked.`);
      }
    }
    plan.tasks.push({
      id: newId(), title: t.title, due: t.due, note: t.note, hobbyId, projectId,
      energy: t.energy ?? config.defaultEnergy, createdAt: now,
    });
    openTaskCount++;
    openTaskTitles.add(key(t.title));
  }

  // --- Routines ---
  const routineNames = new Set(existing.routines.map((r) => key(r.name)));
  for (const r of parsed.routines) {
    if (routineNames.has(key(r.name))) {
      plan.alreadyThere++;
      continue;
    }
    plan.routines.push({ id: newId(), name: r.name, steps: r.steps, goalIds: goalIdsFor(r.goals), createdAt: now });
    routineNames.add(key(r.name));
  }

  // --- Books and shows go to Up next (up to its cap) ---
  const mediaTitles = new Set(existing.media.map((m) => m.kind + '|' + key(m.title)));
  let upNextCount = existing.media.filter((m) => m.status === 'upNext').length;
  for (const m of parsed.media) {
    const mediaKey = m.kind + '|' + key(m.title);
    if (mediaTitles.has(mediaKey)) {
      plan.alreadyThere++;
      continue;
    }
    if (upNextCount >= config.maxUpNext) {
      plan.problems.push(`Up next holds ${config.maxUpNext} books and shows, so "${m.title}" was left out.`);
      continue;
    }
    plan.media.push({ id: newId(), kind: m.kind, title: m.title, status: 'upNext', order: upNextCount });
    upNextCount++;
    mediaTitles.add(mediaKey);
  }

  return plan;
}

/** True when the plan wouldn't add anything. */
export function isEmptyPlan(plan: ImportPlan) {
  return [plan.hobbies, plan.projects, plan.steps, plan.activities, plan.tasks, plan.routines, plan.goals, plan.media]
    .every((list) => list.length === 0);
}
