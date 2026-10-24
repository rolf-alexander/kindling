import { Archive, CircleCheck, FolderOpen, Moon, Sprout } from 'lucide-react';
import type { ReactNode } from 'react';
import { PhotoThumb } from '../components/PhotoThumb';
import { Cover } from './MediaScreen';
import { Empty, Screen } from '../components/Screen';
import { db } from '../db';
import { monthGrid, today, weekdayLetters } from '../lib/dates';
import { colourFill, colourVar } from '../lib/labels';
import { useLive } from '../lib/useLive';
import { buildRecap, hoursText } from '../recap';
import { contextFor } from '../world';

/** One part of the recap: a small label, a sentence, then a big number, like the references. */
function Part({ label, lead, big, unit, children }: { label: string; lead: string; big?: string | number; unit?: string; children?: ReactNode }) {
  return (
    <section className="card recap-part">
      <p className="recap-label">{label}</p>
      <p className="recap-lead">{lead}</p>
      {big !== undefined && <p className="recap-big">{big}<span>{unit}</span></p>}
      {children}
    </section>
  );
}

const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many);

/** A month in review: what you made time for. No comparisons with other months (D29). */
export function RecapScreen({ month }: { month: string }) {
  const data = useLive('recap', async () => {
    const [hobbies, projects, logs, goals, media] = await Promise.all([
      db.hobbies.toArray(), db.projects.toArray(), db.logs.toArray(), db.goals.toArray(), db.media.toArray(),
    ]);
    return { hobbies, projects, logs, goals, media };
  });
  if (!data) return null; // still loading

  const [year, monthNumber] = month.split('-').map(Number);
  const monthName = new Date(year, monthNumber - 1, 1).toLocaleDateString(undefined, { month: 'long' });
  const isThisMonth = today().startsWith(month);
  const recap = buildRecap(data, month);
  const back = { label: 'Calendar', path: '/calendar' };
  const eyebrow = isThisMonth ? 'Your month so far' : 'Your monthly recap';

  if (recap.logs.length === 0) {
    return (
      <Screen title={`${monthName} ${year}`} eyebrow={eyebrow} back={back}>
        <Empty icon={<Moon size={28} />} title="A quiet month">Rest counts too. Nothing here is expected of you.</Empty>
      </Screen>
    );
  }

  const moments: { Icon: typeof Sprout; text: string; key: string }[] = [
    ...recap.newHobbies.map((h) => ({ Icon: Sprout, text: `Started ${h.name}`, key: `new-${h.id}` })),
    ...recap.pickedBackUp.map((h) => ({ Icon: Sprout, text: `Picked ${h.name} back up`, key: `back-${h.id}` })),
    ...recap.projectsStarted.map((p) => ({ Icon: FolderOpen, text: `Started ${p.name}`, key: `ps-${p.id}` })),
    ...recap.projectsFinished.map((p) => ({ Icon: CircleCheck, text: `Finished ${p.name}`, key: `pf-${p.id}` })),
    ...(recap.stepsDone ? [{ Icon: CircleCheck, text: `${recap.stepsDone} project ${plural(recap.stepsDone, 'step')} done`, key: 'steps' }] : []),
    ...(recap.tasksDone ? [{ Icon: Archive, text: `${recap.tasksDone} ${plural(recap.tasksDone, 'task')} off your mind`, key: 'tasks' }] : []),
  ];

  return (
    <Screen title={`${monthName} ${year}`} eyebrow={eyebrow} back={back}>
      <div className="stack recap">
        <Part label="Days" lead="You made time for yourself on" big={recap.activeDays} unit={plural(recap.activeDays, ' day', ' days')}>
          <div className="cal-grid mini">
            {weekdayLetters().map((letter, i) => <span key={i} className="cal-weekday">{letter}</span>)}
            {monthGrid(year, monthNumber).map((day, i) => {
              if (!day) return <span key={`blank-${i}`} />;
              const colours = [...new Set(recap.logs.filter((l) => l.day === day).map((l) => contextFor(l, data).colour))].slice(0, 3);
              // Days still to come are faint outlines, so they don't read as empty.
              return <span key={day} className="mini-day" data-ahead={day > today() || undefined}
                style={{ background: colours.length ? colourFill(colours) : undefined }} />;
            })}
          </div>
        </Part>

        {recap.hobbies.length > 0 && (
          <Part label="Hobbies" lead="You spent time on" big={recap.hobbies.length} unit={plural(recap.hobbies.length, ' hobby', ' hobbies')}>
            <div className="recap-rows">
              {recap.hobbies.map(({ hobby, count, minutes }) => (
                <div className="recap-row" key={hobby.id}>
                  <span className="hobby-tile" style={{ background: colourVar(hobby.colour) }}>{hobby.name.slice(0, 1)}</span>
                  <span className="label">{hobby.name}</span>
                  <span className="detail">{count} {plural(count, 'time')}{minutes ? ` · ${hoursText(minutes)}` : ''}</span>
                </div>
              ))}
            </div>
          </Part>
        )}

        {recap.minutes > 0 && <Part label="Time" lead="Of the times you noted, you spent" big={hoursText(recap.minutes)} />}

        {moments.length > 0 && (
          <Part label="Moments" lead="Along the way">
            <div className="recap-rows">
              {moments.map(({ Icon, text, key }) => (
                <div className="recap-row" key={key}>
                  <span className="icon-tile"><Icon size={16} /></span>
                  <span className="label">{text}</span>
                </div>
              ))}
            </div>
          </Part>
        )}

        {recap.finishedMedia.length > 0 && (
          <Part label="Reading & Watching" lead="You finished">
            <div className="recap-covers">
              {recap.finishedMedia.map((m) => (
                <div key={m.id} className="recap-cover">
                  <Cover media={m} size={120} />
                  <span>{m.title}</span>
                </div>
              ))}
            </div>
          </Part>
        )}

        {recap.goals.length > 0 && (
          <Part label="Goals" lead="Things that counted towards">
            <div className="chips">
              {recap.goals.map(({ goal, count }) => (
                <span key={goal.id} className="chip">{goal.name} <b>{count}</b></span>
              ))}
            </div>
          </Part>
        )}

        {recap.routines.length > 0 && (
          <Part label="Routines" lead="You looked after yourself with">
            <div className="recap-rows">
              {recap.routines.map((r) => (
                <div className="recap-row" key={r.name}>
                  <span className="dot" style={{ background: 'var(--routine)' }} />
                  <span className="label">{r.name}</span>
                  <span className="detail">{r.count} {plural(r.count, 'time')}</span>
                </div>
              ))}
            </div>
          </Part>
        )}

        {recap.photoIds.length > 0 && (
          <Part label="Photos" lead="Moments you kept">
            <div className="recap-photos">
              {recap.photoIds.map((id) => <PhotoThumb key={id} photoId={id} size={104} />)}
            </div>
          </Part>
        )}
      </div>
    </Screen>
  );
}
