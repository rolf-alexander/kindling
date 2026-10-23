import { Archive, CircleCheck, Flag, FolderOpen, Moon, Sparkles, Sprout } from 'lucide-react';
import type { HobbyStatus, Log } from '../db';
import type { TimelineMonth } from '../timeline';
import { PhotoThumb } from './PhotoThumb';

function statusMoment(status: HobbyStatus, from?: HobbyStatus) {
  if (status === 'active') {
    const back = from === 'paused' || from === 'semiRetired';
    return { Icon: Sprout, text: back ? 'Picked back up' : 'Became active' };
  }
  if (status === 'paused') return { Icon: Moon, text: 'Resting from here' };
  if (status === 'semiRetired') return { Icon: Archive, text: 'Semi-retired' };
  return { Icon: Sparkles, text: 'Moved to want to pursue' };
}

const durationText = (min: number) => (min < 60 ? `${min} min` : `${+(min / 60).toFixed(1)} h`);

/** A hobby's story, month by month. Tapping a log opens it to add or change details. */
export function Timeline({ months, onOpenLog }: { months: TimelineMonth[]; onOpenLog: (log: Log) => void }) {
  return (
    <>
      {months.map((month) => (
        <section key={month.key}>
          <h2 className="section-header">{month.label}</h2>
          <div className="list">
            {month.items.map((item, i) => {
              if (item.kind === 'gap') {
                return <div className="timeline-gap" key={`gap-${i}`}>{item.weeks} weeks in between</div>;
              }
              if (item.kind === 'log') {
                const { log } = item;
                const date = new Date(log.at);
                const details = [log.durationMin && durationText(log.durationMin), log.note].filter(Boolean).join(' · ');
                return (
                  <button className="list-row" key={log.id} onClick={() => onOpenLog(log)}>
                    <span className="timeline-date">
                      <span>{date.toLocaleDateString(undefined, { weekday: 'short' })}</span>
                      <b>{date.getDate()}</b>
                    </span>
                    <span className="label">
                      {log.title}
                      {details && <span className="row-subtitle clamp">{details}</span>}
                    </span>
                    {log.photoId && <PhotoThumb photoId={log.photoId} />}
                  </button>
                );
              }
              const { Icon, text } =
                item.kind === 'status' ? statusMoment(item.status, item.from)
                : item.kind === 'started' ? { Icon: Flag, text: 'Added to Kindling' }
                : item.finished ? { Icon: CircleCheck, text: `Finished ${item.name}` }
                : { Icon: FolderOpen, text: `Started ${item.name}` };
              return (
                <div className="list-row moment" key={`${item.kind}-${item.at}-${i}`}>
                  <span className="icon-tile"><Icon size={16} /></span>
                  <span className="label">{text}</span>
                  <span className="detail">
                    {new Date(item.at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
