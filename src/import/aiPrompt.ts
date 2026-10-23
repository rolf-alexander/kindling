// The prompt to paste into an AI chat tool, so it brainstorms with you and then writes the list in Kindling's format.

export const EXAMPLE = `# Photography [active]
- Golden hour walk with camera | medium | goal: Outside
- Edit 5 photos from last shoot | low | goal: Creative
- Half-day landscape shoot | high | plan ahead | goal: Outside
## Project: Edinburgh zine
- Pick 20 favourite shots | low
- Sketch the page layout | medium

# Ceramics [want to pursue]
- Book a taster class | low

# Tasks
- Wax skis | Skiing | due 2026-11-15
- Renew passport | note: photo booth at the post office

# Routines
- Evening skin care: cleanse, serum, moisturise | goal: Self-care

# Goals
- Outside | 3 per week
- Creative | 2 per week

# Books
- The Overstory

# Shows
- Slow Horses`;

export const AI_PROMPT = `I'm setting up Kindling, a personal app that suggests hobbies and small activities when I'd otherwise be doomscrolling. It's meant to feel encouraging, never like a to-do list.

Please help me brainstorm. First ask me about my hobbies, things I'd like to get into, projects, self-care routines and any errands on my mind. Suggest concrete, specific activities for each hobby: things I could start right now, at different energy levels. Keep going until I say I'm happy.

When I say I'm done, give me the final list in ONE code block, in exactly this format:

${EXAMPLE}

Rules for the format:
- "# Name" starts a hobby. Optionally add a status in brackets: [active], [want to pursue], [paused] or [semi-retired]. Default is active.
- "- " lines under a hobby are activities. After the title, add "| low", "| medium" or "| high" for the energy it takes.
  - low = I could do it in bed or on the sofa, tired.
  - medium = needs getting up and a bit of focus.
  - high = needs real energy, going out, or a good chunk of time.
- Add "| plan ahead" to activities that need planning the day before (e.g. a half-day trip). These are never suggested on the spot.
- Add "| goal: Name" to count an activity towards a goal (at most 2 goals, comma separated).
- "## Project: Name" under a hobby starts a project. Its "- " lines are next steps (at most 5). A project that doesn't belong to any hobby goes under "# Projects" as "## Name".
- "# Tasks" lists one-off important tasks (at most 5). Optionally add "| Hobby or project name" to link it, "| due YYYY-MM-DD", and "| note: ...".
- "# Routines" lists self-care routines as "- Name: step, step, step", optionally with "| goal: Name".
- "# Goals" lists goals as "- Name | 3 per week" (or "per month"). A goal with no number is just a tag. Add "| Hobby name" if the goal belongs to one hobby.
- "# Books" and "# Shows" list things I'd like to read or watch next (at most 5 in total).
- Use plain text only: no bold, no extra commentary inside the code block.`;
