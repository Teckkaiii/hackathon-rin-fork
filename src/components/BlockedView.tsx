import type { Action, AppState } from '../state';
import { MY_CLIENT_IDS } from '../state';
import { blockedOpps } from '../lib/queue';
import { BlockedCard } from './BlockedCard';

export function BlockedView({ state, dispatch }: { state: AppState; dispatch: (a: Action) => void }) {
  const blocked = blockedOpps(MY_CLIENT_IDS);

  return (
    <div>
      <div className="t-display mb-1">Blocked</div>
      <div className="t-lead mb-5 max-w-[760px]">
        Held back by a compliance check. These never reach your queue until the check clears — there is no way to
        force them through.
      </div>

      {blocked.length
        ? blocked.map(x => (
            <BlockedCard
              key={x.opp.id}
              opp={x.opp}
              gates={x.gates}
              requested={!!state.unblockRequests[x.opp.id]}
              onRequest={message => dispatch({ type: 'REQUEST_UNBLOCK', id: x.opp.id, clientId: x.opp.clientId, message })}
            />
          ))
        : <div className="glass-tight p-4 t-meta">Nothing is currently withheld in your book.</div>}
    </div>
  );
}
