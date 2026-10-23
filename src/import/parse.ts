// Reads the paste-in text format (see aiPrompt.ts for the full description) into plain lists.
// This step only understands the text. It doesn't look at what's already in Kindling; plan.ts does that.

import type { Energy, HobbyStatus } from '../db';

export interface ParsedActivity { title: string; energy?: Energy; planAhead: boolean; goals: string[] }
export interface ParsedStep { title: string; energy?: Energy }
export interface ParsedProject { name: string; steps: ParsedStep[] }
export interface ParsedHobby { name: string; status: HobbyStatus; activities: ParsedActivity[]; projects: ParsedProject[] }
export interface ParsedTask { title: string; link?: string; due?: string; energy?: Energy; note?: string }
export interface ParsedRoutine { name: string; steps: string[]; goals: string[] }
export interface ParsedGoal { name: string; target?: number; period: 'week' | 'month'; hobby?: string }
export interface ParsedMedia { title: string; kind: 'book' | 'show' }

export interface ParsedImport {
  hobbies: ParsedHobby[];
  projects: ParsedProject[]; // stand-alone projects
  tasks: ParsedTask[];
  routines: ParsedRoutine[];
  goals: ParsedGoal[];
  media: ParsedMedia[];
  /** Friendly notes about lines that couldn't be used. */
  problems: string[];
}

/** Which kind of heading the current line sits under. */
type Section =
  | { kind: 'none' }
  | { kind: 'hobby'; hobby: ParsedHobby }
  | { kind: 'project'; project: ParsedProject }
  | { kind: 'projects' } // under "# Projects", waiting for a "## name"
  | { kind: 'tasks' }
  | { kind: 'routines' }
  | { kind: 'goals' }
  | { kind: 'media'; mediaKind: 'book' | 'show' };

const STATUS_WORDS: Record<string, HobbyStatus> = {
  active: 'active',
  want: 'want',
  'want to pursue': 'want',
  wishlist: 'want',
  paused: 'paused',
  'semi-retired': 'semiRetired',
  'semi retired': 'semiRetired',
  semiretired: 'semiRetired',
  retired: 'semiRetired',
};

const RESERVED_HEADINGS: Record<string, Section> = {
  tasks: { kind: 'tasks' },
  'important tasks': { kind: 'tasks' },
  routines: { kind: 'routines' },
  goals: { kind: 'goals' },
  books: { kind: 'media', mediaKind: 'book' },
  shows: { kind: 'media', mediaKind: 'show' },
  projects: { kind: 'projects' },
};

export function energyOf(text: string): Energy | undefined {
  const match = /^(low|med|medium|high)(?:\s+energy)?$/i.exec(text.trim());
  if (!match) return undefined;
  const word = match[1].toLowerCase();
  return word === 'med' ? 'medium' : (word as Energy);
}

/** The "| …" parts after a title, sorted into what they mean. Anything unrecognised ends up in `other`. */
function readAttributes(parts: string[]) {
  const out = {
    energy: undefined as Energy | undefined,
    planAhead: false,
    goals: [] as string[],
    due: undefined as string | undefined,
    note: undefined as string | undefined,
    target: undefined as number | undefined,
    period: undefined as 'week' | 'month' | undefined,
    other: [] as string[],
  };
  for (const part of parts) {
    let m: RegExpExecArray | null;
    const energy = energyOf(part);
    if (energy) out.energy = energy;
    else if (/^plan[\s-]?ahead$/i.test(part)) out.planAhead = true;
    else if ((m = /^goals?:\s*(.+)$/i.exec(part))) out.goals.push(...splitList(m[1]));
    else if ((m = /^due:?\s*(\d{4}-\d{2}-\d{2})$/i.exec(part))) out.due = m[1];
    else if ((m = /^note:\s*(.+)$/i.exec(part))) out.note = m[1].trim();
    else if ((m = /^(\d+)\s*(?:x|times)?\s*(?:per|a|an|every|\/)\s*(week|month)$/i.exec(part))) {
      out.target = Number(m[1]);
      out.period = m[2].toLowerCase() as 'week' | 'month';
    } else out.other.push(part);
  }
  return out;
}

const splitList = (text: string) => text.split(',').map((s) => s.trim()).filter(Boolean);
const quote = (text: string) => `"${text.length > 40 ? text.slice(0, 40) + '…' : text}"`;

export function parseImport(text: string): ParsedImport {
  const result: ParsedImport = { hobbies: [], projects: [], tasks: [], routines: [], goals: [], media: [], problems: [] };
  let section: Section = { kind: 'none' };
  let hobby: ParsedHobby | undefined; // the hobby that "## Project:" headings belong to
  let inProjectsGroup = false;

  const problem = (lineNo: number, message: string) => result.problems.push(`Line ${lineNo}: ${message}`);

  text.split(/\r?\n/).forEach((raw, index) => {
    const lineNo = index + 1;
    const trimmed = raw.trim();
    // Skip blank lines, comments, and the ``` fences AI tools wrap code blocks in.
    if (!trimmed || trimmed.startsWith('```') || trimmed.startsWith('//')) return;
    const line = trimmed.replace(/\*\*|__/g, ''); // drop **bold** markers

    // --- Headings ---
    const heading = /^(#{1,6})\s*(.+)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const title = heading[2].trim();
      const projectMatch = /^project:\s*(.+)$/i.exec(title);

      if (level === 1 && !projectMatch) {
        hobby = undefined;
        const reserved = RESERVED_HEADINGS[title.toLowerCase()];
        inProjectsGroup = reserved?.kind === 'projects';
        if (reserved) {
          section = reserved;
          return;
        }
        const statusMatch = /^(.*?)\s*[[(]([^\])]+)[\])]\s*$/.exec(title);
        let status: HobbyStatus = 'active';
        if (statusMatch) {
          const word = statusMatch[2].trim().toLowerCase();
          if (STATUS_WORDS[word]) status = STATUS_WORDS[word];
          else problem(lineNo, `didn't recognise the status ${quote(statusMatch[2])}, so it's set to active.`);
        }
        hobby = { name: (statusMatch ? statusMatch[1] : title).trim(), status, activities: [], projects: [] };
        result.hobbies.push(hobby);
        section = { kind: 'hobby', hobby };
        return;
      }

      // A project: "## Project: name" under a hobby, "## name" under "# Projects", or "# Project: name" on its own.
      if (level === 1) {
        hobby = undefined;
        inProjectsGroup = false;
      }
      const name = (projectMatch ? projectMatch[1] : title).trim();
      const project: ParsedProject = { name, steps: [] };
      if (level > 1 && hobby && !inProjectsGroup) hobby.projects.push(project);
      else if (projectMatch || inProjectsGroup) result.projects.push(project);
      else {
        problem(lineNo, `the heading ${quote(title)} isn't under a hobby, so it was skipped.`);
        section = { kind: 'none' };
        return;
      }
      section = { kind: 'project', project };
      return;
    }

    // --- List items ---
    const bullet = /^(?:[-*•+]|\d+[.)])\s+(.+)$/.exec(line);
    // AI tools often start with a sentence like "Here's your list:"; quietly skip anything before the first heading.
    if (!bullet && section.kind === 'none' && !result.hobbies.length && !result.projects.length) return;
    if (!bullet) {
      problem(lineNo, `${quote(line)} isn't a heading or a "- " line, so it was skipped.`);
      return;
    }
    const [title, ...rest] = bullet[1].split('|').map((s) => s.trim());
    const attrs = readAttributes(rest.filter(Boolean));
    const unrecognised = (parts: string[]) => {
      for (const part of parts) problem(lineNo, `didn't recognise ${quote(part)}, so it was ignored.`);
    };

    switch (section.kind) {
      case 'hobby': {
        let goals = attrs.goals;
        if (goals.length > 2) {
          problem(lineNo, `an activity can count towards up to 2 goals, so only ${goals.slice(0, 2).join(' and ')} were kept.`);
          goals = goals.slice(0, 2);
        }
        section.hobby.activities.push({ title, energy: attrs.energy, planAhead: attrs.planAhead, goals });
        unrecognised(attrs.other);
        break;
      }
      case 'project':
        section.project.steps.push({ title, energy: attrs.energy });
        unrecognised(attrs.other);
        break;
      case 'tasks':
        result.tasks.push({ title, link: attrs.other[0], due: attrs.due, energy: attrs.energy, note: attrs.note });
        unrecognised(attrs.other.slice(1));
        break;
      case 'routines': {
        const colon = title.indexOf(':');
        const name = colon >= 0 ? title.slice(0, colon).trim() : title;
        const steps = colon >= 0 ? splitList(title.slice(colon + 1)) : [];
        result.routines.push({ name, steps, goals: attrs.goals });
        unrecognised(attrs.other);
        break;
      }
      case 'goals':
        result.goals.push({ name: title, target: attrs.target, period: attrs.period ?? 'week', hobby: attrs.other[0] });
        unrecognised(attrs.other.slice(1));
        break;
      case 'media':
        result.media.push({ title, kind: section.mediaKind });
        break;
      default:
        problem(lineNo, `${quote(title)} isn't under a heading, so Kindling doesn't know where it belongs.`);
    }
  });

  return result;
}
