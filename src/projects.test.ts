import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { addStep, createProject, finishProject, makeNextStep, reopenProject } from './projects';

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

const openTitles = async (projectId: string) =>
  (await db.steps.where('projectId').equals(projectId).toArray())
    .filter((s) => !s.doneAt)
    .sort((a, b) => a.order - b.order)
    .map((s) => s.title);

describe('projects', () => {
  it('adds steps in order, up to five open at a time', async () => {
    const id = await createProject('Zine');
    for (const n of [1, 2, 3, 4, 5]) expect(await addStep(id, `Step ${n}`)).toBe(true);
    expect(await addStep(id, 'Step 6')).toBe(false);
    expect(await openTitles(id)).toEqual(['Step 1', 'Step 2', 'Step 3', 'Step 4', 'Step 5']);
  });

  it('has room again once a step is done', async () => {
    const id = await createProject('Zine');
    for (const n of [1, 2, 3, 4, 5]) await addStep(id, `Step ${n}`);
    const first = (await db.steps.toArray()).find((s) => s.title === 'Step 1')!;
    await db.steps.update(first.id, { doneAt: Date.now() });
    expect(await addStep(id, 'Step 6')).toBe(true);
  });

  it('can move a step to the front', async () => {
    const id = await createProject('Zine');
    await addStep(id, 'A');
    await addStep(id, 'B');
    await addStep(id, 'C');
    const c = (await db.steps.toArray()).find((s) => s.title === 'C')!;
    await makeNextStep(c.id);
    expect(await openTitles(id)).toEqual(['C', 'A', 'B']);
  });

  it('finishes and reopens a project', async () => {
    const id = await createProject('Zine');
    await finishProject(id);
    expect(await db.projects.get(id)).toMatchObject({ status: 'finished' });
    await reopenProject(id);
    const project = await db.projects.get(id);
    expect(project).toMatchObject({ status: 'active' });
    expect(project!.finishedAt).toBeUndefined();
  });
});
