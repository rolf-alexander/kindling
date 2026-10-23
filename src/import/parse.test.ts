import { describe, expect, it } from 'vitest';
import { EXAMPLE } from './aiPrompt';
import { parseImport } from './parse';

describe('parseImport', () => {
  it('reads the example from the AI prompt without any problems', () => {
    const result = parseImport(EXAMPLE);
    expect(result.problems).toEqual([]);
    expect(result.hobbies.map((h) => [h.name, h.status])).toEqual([
      ['Photography', 'active'],
      ['Ceramics', 'want'],
    ]);
    expect(result.hobbies[0].activities[2]).toEqual({
      title: 'Half-day landscape shoot', energy: 'high', planAhead: true, goals: ['Outside'],
    });
    expect(result.hobbies[0].projects[0]).toEqual({
      name: 'Edinburgh zine',
      steps: [{ title: 'Pick 20 favourite shots', energy: 'low' }, { title: 'Sketch the page layout', energy: 'medium' }],
    });
    expect(result.tasks[0]).toMatchObject({ title: 'Wax skis', link: 'Skiing', due: '2026-11-15' });
    expect(result.tasks[1]).toMatchObject({ title: 'Renew passport', note: 'photo booth at the post office' });
    expect(result.routines[0]).toEqual({
      name: 'Evening skin care', steps: ['cleanse', 'serum', 'moisturise'], goals: ['Self-care'],
    });
    expect(result.goals[0]).toEqual({ name: 'Outside', target: 3, period: 'week', hobby: undefined });
    expect(result.media).toEqual([
      { title: 'The Overstory', kind: 'book' },
      { title: 'Slow Horses', kind: 'show' },
    ]);
  });

  it('copes with what AI tools tend to add: code fences, bold, numbers, chatter', () => {
    const result = parseImport([
      "Here's your list:",
      '```',
      '# **Running**',
      '1. Easy 5k | Medium',
      '* Stretch | low energy',
      '```',
    ].join('\n'));
    expect(result.hobbies[0].name).toBe('Running');
    expect(result.hobbies[0].activities.map((a) => [a.title, a.energy])).toEqual([
      ['Easy 5k', 'medium'],
      ['Stretch', 'low'],
    ]);
    expect(result.problems).toEqual([]);
  });

  it('notes stray sentences once the list has started', () => {
    const result = parseImport('# Running\n- Easy 5k\nHope this helps!');
    expect(result.problems).toHaveLength(1);
    expect(result.problems[0]).toContain('Line 3');
  });

  it('accepts different ways of writing a goal target', () => {
    const result = parseImport('# Goals\n- A | 3x a week\n- B | 2/month\n- C | 4 times per week\n- D');
    expect(result.goals.map((g) => [g.target, g.period])).toEqual([[3, 'week'], [2, 'month'], [4, 'week'], [undefined, 'week']]);
  });

  it('puts stand-alone projects under # Projects', () => {
    const result = parseImport('# Projects\n## Tidy the garage\n- Clear one shelf | low\n# Project: Learn Spanish\n- Pick an app');
    expect(result.projects.map((p) => p.name)).toEqual(['Tidy the garage', 'Learn Spanish']);
    expect(result.hobbies).toEqual([]);
  });

  it('keeps at most two goals per activity and says so', () => {
    const result = parseImport('# Walking\n- Long walk | goal: Outside, Move, Calm');
    expect(result.hobbies[0].activities[0].goals).toEqual(['Outside', 'Move']);
    expect(result.problems).toHaveLength(1);
  });

  it('notes unrecognised statuses and attributes instead of failing', () => {
    const result = parseImport('# Chess [someday]\n- Puzzle | sparkly');
    expect(result.hobbies[0].status).toBe('active');
    expect(result.hobbies[0].activities[0].title).toBe('Puzzle');
    expect(result.problems).toHaveLength(2);
  });
});
