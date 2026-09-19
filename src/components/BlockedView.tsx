import { MY_CLIENT_IDS } from '../state';
import { blockedOpps } from '../lib/queue';
import { BlockedCard } from './BlockedCard';

export function BlockedView() {
  const blocked = blockedOpps(MY_CLIENT_IDS);

  return (
    <div>
      <div className="t-display mb-1">Blocked</div>
      <div className="t-lead mb-5 max-w-[760px]">
        Withheld from the queue entirely by a hard compliance gate. Gates always run before ranking, so no filter
        setting can surface these.
      </div>

      {blocked.length
        ? blocked.map(x => <BlockedCard key={x.opp.id} opp={x.opp} gates={x.gates} />)
        : <div className="glass-tight p-4 t-meta">Nothing is currently withheld in your book.</div>}
    </div>
  );
}
