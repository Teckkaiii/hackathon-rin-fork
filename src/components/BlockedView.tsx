import { MY_CLIENT_IDS } from '../state';
import { blockedOpps } from '../lib/queue';
import { BlockedCard } from './BlockedCard';

export function BlockedView() {
  const blocked = blockedOpps(MY_CLIENT_IDS);

  return (
    <div>
      <div className="t-display mb-1">Blocked</div>
      <div className="t-lead mb-5">
        Clients withheld from the Queue entirely by a hard compliance gate — same production quality as a surfaced
        opportunity, kept out of Clients and Outreach until the blocking condition clears. No filter setting can
        surface these; gates run before any ranking.
      </div>

      {blocked.length
        ? blocked.map(x => <BlockedCard key={x.opp.id} opp={x.opp} gates={x.gates} />)
        : <div className="glass-tight p-4 t-meta">Nothing is currently withheld in your book.</div>}
    </div>
  );
}
