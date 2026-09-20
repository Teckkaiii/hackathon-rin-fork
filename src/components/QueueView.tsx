import { useMemo, useState } from 'react';
import type { Action, AppState } from '../state';
import { CLIENTS, DRIVERS, MY_CLIENT_IDS, CURRENT_RM } from '../state';
import { OPPS, blockedOpps, rankedOpps, clusters } from '../lib/queue';
import { OpportunityCard } from './OpportunityCard';
import { Pill } from './ui/Pill';
import { Modal } from './ui/Modal';
import { StatStrip } from './ui/StatStrip';
import { ROUTE_LABELS, type RouteId } from '../lib/routing';

export function QueueView({ state, dispatch }: { state: AppState; dispatch: (a: Action) => void }) {
  const { dismissed, routed } = state;

  const surfaced = useMemo(() => rankedOpps(dismissed, routed, MY_CLIENT_IDS), [dismissed, routed]);
  const blocked = useMemo(() => blockedOpps(MY_CLIENT_IDS), []);
  const cls = useMemo(() => clusters(dismissed, routed, DRIVERS, MY_CLIENT_IDS), [dismissed, routed]);
  const overnightDrivers = useMemo(() => {
    const ids = [...new Set(OPPS.filter(o => MY_CLIENT_IDS.has(o.clientId) && o.driverId).map(o => o.driverId as string))];
    return ids.map(id => DRIVERS[id].label);
  }, []);
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
      <div className="t-display mb-3">{greeting()}, {CURRENT_RM.split(' ')[0]}.</div>

      <StatStrip
        data-testid="queue-stat-strip"
        stats={[
          { value: surfaced.length, label: 'Surfaced' },
          { value: blocked.length, label: 'Withheld' },
          { value: overnightDrivers.length, label: 'Signals overnight' },
        ]}
      />

      <div className="t-lead mb-5" data-testid="queue-summary">
        {overnightSummary(overnightDrivers, surfaced.length, blocked.length)}
      </div>

      {cls.map(cl => (
        <div key={cl.driver.id} className="glass-tight bg-sunk p-4 mb-4 flex gap-3 items-start">
          <Pill variant="flag">Linked</Pill>
          <div className="t-body">
            <b>Same story, {cl.opps.length} clients</b> — {cl.opps.map(o => CLIENTS[o.clientId].name).join(', ')} are all
            here because of <b>{cl.driver.label}</b>. Treat them as one call, not {cl.opps.length}.
          </div>
        </div>
      ))}

      {surfaced.length
        ? surfaced.map((o, i) => (
            <OpportunityCard
              key={o.id}
              rank={i + 1}
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
            You passed these to a specialist or to a call. They stay off your queue until you hear back.
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

function overnightSummary(driverLabels: string[], surfacedCount: number, blockedCount: number): string {
  const overnight = driverLabels.length
    ? `Overnight: ${driverLabels.join(' · ')}.`
    : 'No material overnight signals.';
  const surfacedPhrase = `That leaves ${surfacedCount} ${surfacedCount === 1 ? 'client' : 'clients'} worth a look today`;
  const blockedPhrase = blockedCount > 0
    ? `, with ${blockedCount} more on hold pending compliance — see the Blocked tab.`
    : '.';
  return `${overnight} ${surfacedPhrase}${blockedPhrase}`;
}
