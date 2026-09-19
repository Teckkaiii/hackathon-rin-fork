import { useMemo, useState } from 'react';
import type { Action, AppState } from '../state';
import { CLIENTS, DRIVERS, MY_CLIENT_IDS, CURRENT_RM } from '../state';
import { OPPS, blockedOpps, rankedOpps, clusters } from '../lib/queue';
import { OpportunityCard } from './OpportunityCard';
import { Pill } from './ui/Pill';
import { Modal } from './ui/Modal';
import { ROUTE_LABELS, type RouteId } from '../lib/routing';

export function QueueView({ state, dispatch }: { state: AppState; dispatch: (a: Action) => void }) {
  const { dismissed, routed } = state;

  const surfaced = useMemo(() => rankedOpps(dismissed, routed, MY_CLIENT_IDS), [dismissed, routed]);
  const blocked = useMemo(() => blockedOpps(MY_CLIENT_IDS), []);
  const cls = useMemo(() => clusters(dismissed, routed, DRIVERS, MY_CLIENT_IDS), [dismissed, routed]);
  const dismissedList = OPPS.filter(o => o.id in dismissed && MY_CLIENT_IDS.has(o.clientId));
  const handedOffList = OPPS.filter(o => o.id in routed && MY_CLIENT_IDS.has(o.clientId));

  const [dismissTarget, setDismissTarget] = useState<string | null>(null);
  const [dismissReason, setDismissReason] = useState('Client not reachable this week');

  function openDismiss(id: string) {
    setDismissReason('Client not reachable this week');
    setDismissTarget(id);
  }

  function confirmDismiss() {
    if (dismissTarget) {
      dispatch({ type: 'DISMISS', id: dismissTarget, reason: dismissReason.trim() || 'No reason given' });
    }
    setDismissTarget(null);
  }

  const [handoffTarget, setHandoffTarget] = useState<{ oppId: string; route: RouteId } | null>(null);
  const [handoffNote, setHandoffNote] = useState('');

  function handoff(oppId: string, route: RouteId) {
    setHandoffNote('');
    setHandoffTarget({ oppId, route });
  }

  function confirmHandoff() {
    if (handoffTarget) {
      const { oppId, route } = handoffTarget;
      const note = handoffNote.trim();
      const opp = OPPS.find(o => o.id === oppId)!;
      dispatch({ type: 'ROUTE_OPPORTUNITY', id: oppId, route, note });
      dispatch({
        type: 'OUTREACH_NOSEND',
        entry: {
          ts: '14 Sep, 09:14',
          clientId: opp.clientId,
          kind: 'Non-send',
          detail: `${ROUTE_LABELS[route]}${note ? ` — ${note}` : ''}`,
          ref: null,
        },
      });
    }
    setHandoffTarget(null);
  }

  return (
    <div>
      <div className="t-display mb-1">{greeting()}, {CURRENT_RM.split(' ')[0]}.</div>
      <div className="t-lead mb-5">
        Overnight signals resolved against client exposures, after compliance gates, ranked by signal score —
        momentum, news relevancy, urgency and conviction combined.
      </div>

      {cls.map(cl => (
        <div key={cl.driver.id} className="glass-tight border-[#C9DDE2] bg-[#EFF6F7]/80 p-4 mb-4 flex gap-3 items-start">
          <Pill variant="flag">Cluster</Pill>
          <div className="t-body">
            <b>Correlated conviction cluster</b> — {cl.opps.length} opportunities rest on the same driver:{' '}
            <b>{cl.driver.label}</b> ({cl.opps.map(o => CLIENTS[o.clientId].name).join(', ')}). Read as one conviction, not {cl.opps.length} independent ones.
          </div>
        </div>
      ))}

      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-2.5">
        <div className="t-h1">High revenue opportunities <span className="t-meta font-semibold">· {surfaced.length} surfaced</span></div>
        <span className="t-meta font-semibold">{blocked.length} withheld by gates — see the Blocked tab</span>
      </div>

      {surfaced.length
        ? surfaced.map(o => (
            <OpportunityCard
              key={o.id}
              opp={o}
              onOpenClient={id => dispatch({ type: 'OPEN_CLIENT', id })}
              onOpenOutreach={id => { dispatch({ type: 'SET_OUTREACH_CLIENT', id }); dispatch({ type: 'SET_TAB', tab: 'outreach' }); }}
              onDismiss={openDismiss}
              onHandoff={handoff}
            />
          ))
        : <div className="glass-tight p-4 t-meta">Nothing on your book needs attention right now.</div>}

      {handedOffList.length > 0 && (
        <>
          <div className="t-h1 mt-8 mb-1">Handed off</div>
          <div className="t-meta mb-3">
            These opportunities were routed somewhere other than a direct message. They stay out of the queue until the
            desk or the client comes back.
          </div>
          {handedOffList.map(o => {
            const c = CLIENTS[o.clientId];
            const r = routed[o.id];
            return (
              <div key={o.id} className="glass-tight p-4 mb-2 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="t-h3">{c.name}</div>
                  <div className="t-meta">{c.segment}</div>
                </div>
                <Pill variant="flag">{ROUTE_LABELS[r.route]}{r.note ? ` — ${r.note}` : ''}</Pill>
              </div>
            );
          })}
        </>
      )}

      {dismissedList.length > 0 && (
        <>
          <div className="t-h1 mt-8 mb-1">Dismissed</div>
          {dismissedList.map(o => {
            const c = CLIENTS[o.clientId];
            return (
              <div key={o.id} className="glass-tight p-4 mb-2 flex items-center justify-between">
                <div>
                  <div className="t-h3">{c.name}</div>
                  <div className="t-meta">{c.segment}</div>
                </div>
                <Pill variant="neutral">Reason: {dismissed[o.id]}</Pill>
              </div>
            );
          })}
        </>
      )}

      <Modal
        open={dismissTarget !== null}
        title="Dismiss this opportunity"
        confirmLabel="Dismiss"
        onConfirm={confirmDismiss}
        onClose={() => setDismissTarget(null)}
      >
        <div className="t-meta mb-2">The reason is recorded against this opportunity.</div>
        <textarea
          className="w-full border border-hairline-2 rounded-xl p-3 text-[14px] leading-relaxed min-h-[80px] font-sans"
          value={dismissReason}
          onChange={e => setDismissReason(e.target.value)}
        />
      </Modal>

      <Modal
        open={handoffTarget !== null}
        title={handoffTarget ? ROUTE_LABELS[handoffTarget.route] : ''}
        confirmLabel="Confirm"
        onConfirm={confirmHandoff}
        onClose={() => setHandoffTarget(null)}
      >
        <div className="t-meta mb-2">
          This leaves the queue and is recorded in the client's outcome ledger. A note is optional.
        </div>
        <textarea
          className="w-full border border-hairline-2 rounded-xl p-3 text-[14px] leading-relaxed min-h-[80px] font-sans"
          value={handoffNote}
          onChange={e => setHandoffNote(e.target.value)}
        />
      </Modal>
    </div>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
