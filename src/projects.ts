// Projects and their next steps.

import { config } from './config';
import { db, type Energy } from './db';
import { newId } from './lib/ids';

export async function createProject(name: string, hobbyId?: string): Promise<string> {
  const id = newId();
  await db.projects.add({ id, name: name.trim(), hobbyId, status: 'active', createdAt: Date.now() });
  return id;
}

export async function updateProject(id: string, changes: { name: string; hobbyId?: string }) {
  await db.projects.update(id, { name: changes.name.trim(), hobbyId: changes.hobbyId });
}

const openSteps = (projectId: string) =>
  db.steps.where('projectId').equals(projectId).filter((s) => !s.doneAt).toArray();

/** Adds a next step at the end. Returns false (and adds nothing) if the project already holds the most it can. */
export async function addStep(projectId: string, title: string, energy: Energy = config.defaultEnergy) {
  const open = await openSteps(projectId);
  if (open.length >= config.maxOpenStepsPerProject) return false;
  const order = Math.max(-1, ...open.map((s) => s.order)) + 1;
  await db.steps.add({ id: newId(), projectId, title: title.trim(), energy, order });
  return true;
}

export async function updateStep(id: string, changes: { title: string; energy: Energy }) {
  await db.steps.update(id, { title: changes.title.trim(), energy: changes.energy });
}

/** Removes a step. Logs of work on it stay on the timeline. */
export async function removeStep(id: string) {
  await db.steps.delete(id);
}

/** Moves a step to the front, so it's the one suggested on Today. */
export async function makeNextStep(id: string) {
  const step = await db.steps.get(id);
  if (!step) return;
  const open = await openSteps(step.projectId);
  await db.steps.update(id, { order: Math.min(...open.map((s) => s.order)) - 1 });
}

/** Archives a finished project. Its timeline is kept. */
export async function finishProject(id: string) {
  await db.projects.update(id, { status: 'finished', finishedAt: Date.now() });
}

export async function reopenProject(id: string) {
  await db.projects.update(id, { status: 'active', finishedAt: undefined });
}
