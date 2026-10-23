# Kindling — Decisions Log

Each entry: the question, what we chose, why, and what would make us change our minds.
Newest at the bottom. Undecided questions are listed at the end.

---

## D1. Build it as a web app (PWA), not a native iPhone app
**Chose:** A home-screen web app, stored entirely on the phone.
**Why:** No App Store, no Mac or Xcode needed (development happens on Windows), free to host, works offline.
**Change our minds if:** iPhone limits (see D7) make core features unworkable.

## D2. Language: TypeScript, not Python
**Chose:** TypeScript (JavaScript plus labels describing what kind of data each thing is).
**Why:** A web app runs inside Safari, and Safari only runs HTML, CSS and JavaScript. Python would need a server
(breaks the no-backend rule) or a heavy in-browser Python engine (slow on a phone). The labels catch mistakes
automatically, which matters because the owner won't be reviewing code line by line.
**Change our minds if:** Never, really. This follows from D1.

## D3. UI framework: React (switched from Svelte)
**Chose:** React.
**Why:** Svelte was first proposed because it's the easiest to *read* when learning web code. Once it was clear
the code would be written and maintained by AI assistants, the deciding factor became "most common, best understood
by every tool". That's React. Svelte also recently changed its syntax, and AI tools mix up the old and new versions.
**Lesson:** The right choice depends on *who maintains the code*, not just which tool is nicest.
**Change our minds if:** The owner starts learning web development and wants to read the code.

## D4. Storage: IndexedDB through Dexie, plus JSON export/import
**Chose:** The browser's built-in database (IndexedDB), using the Dexie library to make it easier to work with.
**Why:** The simpler `localStorage` holds only about 5MB of text and can't store photos. There's no server, so
export/import is the only backup and is built early.
**Change our minds if:** Data turns out to vanish on iPhone, which step 0 is testing.

## D5. Logs keep a snapshot of what they were about
**Chose:** Each log stores its title, hobby, project and goals at the moment it's logged.
**Why:** Timelines become simple lookups, and history survives renaming or deleting an activity.
**Trade-off:** Linking an activity to a goal later doesn't make its *past* logs count towards that goal.

## D6. Nothing ever stores a "missed" state
**Chose:** Goal progress is counted fresh each period, and pencilled-in plans simply stop showing after their date.
**Why:** It's the no-guilt rules built into the data itself. There's nothing to turn red, because failure is never recorded.

## D7. Test iPhone behaviour before building (step 0)
**Chose:** Ship a throwaway test page first (`spike/`).
**Why:** Three things could undermine the design: (1) does data survive on the phone, (2) does the camera work,
(3) do links from Reminders/Shortcuts open the installed app or a separate Safari copy with empty data?
**Result (2026-10-23):** (3) confirmed as a problem. Links from Reminders and from a Shortcuts "Open URLs"
action both open a Safari tab with *separate, empty* storage (0 taps), not the installed app. Shortcuts' "Open App"
action does not list the web app. So per-activity deep links into the installed app are not possible on iPhone.
(1) Data survived closing and reopening the app. (2) The camera works. Also, the app opens offline (airplane mode).

## D11. No deep links; reminders are plain nudges, plus a gentle "open from home screen" page
**Chose:** Reminders/Shortcuts just remind ("Skin care"); you open Kindling from its icon. Routines get their own tab
so they're two taps away, and the "plan for tomorrow" card is on the home screen from the afternoon. If Kindling is
opened in Safari on an iPhone (e.g. via a link), it shows a friendly "open Kindling from your home screen" page
instead of an empty copy of the app.
**Rejected:** Using Kindling as a Safari bookmark so links would work. Safari can delete a website's stored data
after 7 days without a visit; installed home-screen apps are exempt. Losing history is worse than losing links.
**Kept for later:** The app still uses proper internal addresses (`#/routines`, `#/log/...`), so deep links can
return cheaply.
**Change our minds if:** Apple lets links open installed web apps.

## D8. Day boundary at 4am
**Chose:** "Today" runs from 4am to 4am.
**Why:** The app is used in bed after midnight, and 1am should still count as tonight.

## D9. Books and shows have their own timeline
**Chose:** Finished books/shows go to a separate "Reading & Watching" timeline, not into a hobby.

## D10. Hosting: GitHub Pages (public code)
**Chose:** Public repository `kindling`, deployed with GitHub Pages.
**Why:** Free and HTTPS (required for PWAs). Only code is public; personal data never leaves the phone.
Design reference screenshots are kept out of the repo (`.gitignore`) because they're someone else's images.

---

## Provisional (revisit after a week of real use)
- **Tapping a suggestion** opens the log sheet (big Done button; note/duration/photo optional). No visible timer.
- **The home screen is the same all day**, with the "plan for tomorrow" card from the afternoon.

## Undecided (kept in `config` so they're one-line changes)
- What counts as a low-energy suggestion
- Whether semi-retired hobbies occasionally reappear in suggestions
- Whether to fetch book/show covers automatically
- Whether unlinked important tasks appear on the home screen
- Whether hobby-linked tasks get a separate cap from admin tasks

## Defaults agreed
- Goals are tags (e.g. "Outside") that activities/routines point to; a goal can belong to a hobby and pauses with it.
  Weeks start Monday; periods are week or month.
- Project steps and tasks default to medium energy (editable).
- Only the first open step of each project is suggested.
