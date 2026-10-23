import { describe, expect, it } from 'vitest';
import { EXAMPLE } from './aiPrompt';
import { parseImport } from './parse';
import { type Existing, isEmptyPlan, planImport } from './plan';

const nothing: Existing = { hobbies: [], projects: [], steps: [], activities: [], tasks: [], routines: [], goals: [], media: [] };

/** Pretend the plan was saved, giving what Kindling would then contain. */
function afterApplying(existing: Existing, text: string): Existing {
  const plan = planImport(parseImport(text), existing);
  return {
    hobbies: [...existing.hobbies, ...plan.hobbies],
    projects: [...existing.projects, ...plan.projects],
    steps: [...existing.steps, ...plan.steps],
    activities: [...existing.activities, ...plan.activities],
    tasks: [...existing.tasks, ...plan.tasks],
    routines: [...existing.routines, ...plan.routines],
    goals: [...existing.goals, ...plan.goals],
    media: [...existing.media, ...plan.media],
  };
}

describe('planImport', () => {
  it('turns the example into new things to add', () => {
    const plan = planImport(parseImport(EXAMPLE), nothing);
    expect(plan.hobbies).toHaveLength(2);
    expect(plan.activities).toHaveLength(4);
    expect(plan.projects).toHaveLength(1);
    expect(plan.steps).toHaveLength(2);
    expect(plan.tasks).toHaveLength(2);
    expect(plan.routines).toHaveLength(1);
    expect(plan.media).toHaveLength(2);
    // Outside and Creative are listed; Self-care is only mentioned by the routine, so it's created as a tag.
    expect(plan.goals.map((g) => g.name).sort()).toEqual(['Creative', 'Outside', 'Self-care']);
  });

  it('links activities to their hobby and goals', () => {
    const plan = planImport(parseImport(EXAMPLE), nothing);
    const photography = plan.hobbies.find((h) => h.name === 'Photography')!;
    const outside = plan.goals.find((g) => g.name === 'Outside')!;
    const walk = plan.activities.find((a) => a.title.startsWith('Golden hour'))!;
    expect(walk.hobbyId).toBe(photography.id);
    expect(walk.goalIds).toEqual([outside.id]);
    expect(plan.projects[0].hobbyId).toBe(photography.id);
  });

  it('adds nothing when the same text is pasted twice', () => {
    const once = afterApplying(nothing, EXAMPLE);
    const plan = planImport(parseImport(EXAMPLE), once);
    expect(isEmptyPlan(plan)).toBe(true);
    expect(plan.alreadyThere).toBeGreaterThan(0);
  });

  it('adds new activities to a hobby that already exists, matching names regardless of capitals', () => {
    const once = afterApplying(nothing, '# Photography\n- Walk | low');
    const plan = planImport(parseImport('# photography\n- Walk | low\n- Print a photo | medium'), once);
    expect(plan.hobbies).toEqual([]);
    expect(plan.activities.map((a) => a.title)).toEqual(['Print a photo']);
    expect(plan.activities[0].hobbyId).toBe(once.hobbies[0].id);
  });

  it('respects the caps on tasks and project steps', () => {
    const tasks = '# Tasks\n' + Array.from({ length: 7 }, (_, i) => `- Task ${i + 1}`).join('\n');
    const steps = '# Project: Big one\n' + Array.from({ length: 6 }, (_, i) => `- Step ${i + 1}`).join('\n');
    const plan = planImport(parseImport(tasks + '\n' + steps), nothing);
    expect(plan.tasks).toHaveLength(5);
    expect(plan.steps).toHaveLength(5);
    expect(plan.problems).toHaveLength(3);
  });

  it('links a task to a hobby or project by name, and notes when it cannot', () => {
    const plan = planImport(parseImport('# Skiing\n# Tasks\n- Wax skis | skiing\n- Post letter | Nowhere'), nothing);
    expect(plan.tasks[0].hobbyId).toBe(plan.hobbies[0].id);
    expect(plan.tasks[1].hobbyId).toBeUndefined();
    expect(plan.problems).toHaveLength(1);
  });

  it('defaults energy to medium', () => {
    const plan = planImport(parseImport('# Reading\n- Read a chapter'), nothing);
    expect(plan.activities[0].energy).toBe('medium');
  });
});
