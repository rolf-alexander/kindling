import { Flame, Share, SquarePlus } from 'lucide-react';
import { Empty } from './Screen';

/** Shown when Kindling is opened in Safari on an iPhone rather than from the home screen (D11). */
export function OpenFromHomeScreen() {
  const cameFromLink = location.hash.length > 1;

  return (
    <main className="screen" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 15vh)' }}>
      {cameFromLink ? (
        <Empty icon={<Flame size={28} />} title="Kindling lives on your home screen">
          This link opened in Safari, which can't see your Kindling. Open Kindling from its home-screen icon and
          everything will be there.
        </Empty>
      ) : (
        <>
          <Empty icon={<Flame size={28} />} title="Add Kindling to your home screen">
            Kindling keeps everything on your phone, inside the home-screen app.
          </Empty>
          <div className="list" style={{ marginTop: 16 }}>
            <div className="list-row">
              <span className="icon-tile"><Share size={16} /></span>
              <span className="label">Tap <b>Share</b> in Safari</span>
            </div>
            <div className="list-row">
              <span className="icon-tile"><SquarePlus size={16} /></span>
              <span className="label">Choose <b>Add to Home Screen</b></span>
            </div>
            <div className="list-row">
              <span className="icon-tile"><Flame size={16} /></span>
              <span className="label">Open Kindling from its new icon</span>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
