import { useMemo, useState } from 'react';
import type { Action, AppState } from '../state';
import { CLIENTS, DRIVERS, MY_CLIENT_IDS } from '../state';
import { PRODUCTS, OPPS, blockedOpps, filteredOpps, clusters } from '../lib/queue';
import { OpportunityCard } from './OpportunityCard';
import { Pill } from './ui/Pill';
import { Modal } from './ui/Modal';

export function QueueView({ state, dispatch }: { state: AppState; dispatch: (a: Action) => void }) {
  const { filters, dismissed } = state;

  const surfaced = useMemo(
    () => filteredOpps(dismissed, filters, CLIENTS, MY_CLIENT_IDS),
    [dismissed, filters]
  );
  const blocked = useMemo(() => blockedOpps(MY_CLIENT_IDS), []);
  const cls = useMemo(() => clusters(dismissed, DRIVERS, MY_CLIENT_IDS), [dismissed]);
  const families = useMemo(() => [...new Set(Object.values(PRODUCTS).map(p => p.family))], []);
  const dismissedList = OPPS.filter(o => o.id in dismissed && MY_CLIENT_IDS.has(o.clientId));

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

  function setFilter(key: keyof typeof filters, value: string | number) {
    dispatch({ type: 'SET_FILTER', key, value });
  }

  return (
    <div>
      <div className="t-display mb-1">Today's queue</div>
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

      <div className="glass-tight bg-sunk/70 flex flex-wrap gap-2.5 items-center p-3.5 mb-4">
        <select className="border border-hairline-2 bg-white rounded-lg px-2.5 py-1.5 text-[13.5px]" value={filters.segment} onChange={e => setFilter('segment', e.target.value)}>
          <option value="all">All segments</option>
          <option value="Premier">Premier</option>
          <option value="Private">Private</option>
        </select>
        <select className="border border-hairline-2 bg-white rounded-lg px-2.5 py-1.5 text-[13.5px]" value={filters.tier} onChange={e => setFilter('tier', e.target.value)}>
          <option value="all">All tiers</option>
          <option value="Priority">Priority</option>
          <option value="Signature">Signature</option>
        </select>
        <select className="border border-hairline-2 bg-white rounded-lg px-2.5 py-1.5 text-[13.5px]" value={filters.family} onChange={e => setFilter('family', e.target.value)}>
          <option value="all">All product families</option>
          {families.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <select className="border border-hairline-2 bg-white rounded-lg px-2.5 py-1.5 text-[13.5px]" value={filters.minAmount} onChange={e => setFilter('minAmount', parseInt(e.target.value, 10))}>
          <option value={0}>Any amount at stake</option>
          <option value={250000}>≥ SGD 250,000</option>
          <option value={500000}>≥ SGD 500,000</option>
          <option value={1000000}>≥ SGD 1,000,000</option>
        </select>
        <select className="border border-hairline-2 bg-white rounded-lg px-2.5 py-1.5 text-[13.5px]" value={filters.recency} onChange={e => setFilter('recency', e.target.value)}>
          <option value="all">Any signal recency</option>
          <option value="fresh">Fresh (today/yesterday)</option>
          <option value="internal">Internal only</option>
        </select>
        <span className="ml-auto t-meta font-semibold">{blocked.length} withheld by gates — see the Blocked tab</span>
      </div>

      <div className="t-h3 mb-2.5">{surfaced.length} surfaced</div>
      {surfaced.length
        ? surfaced.map(o => (
            <OpportunityCard
              key={o.id}
              opp={o}
              onOpenClient={id => dispatch({ type: 'OPEN_CLIENT', id })}
              onOpenOutreach={id => { dispatch({ type: 'SET_OUTREACH_CLIENT', id }); dispatch({ type: 'SET_TAB', tab: 'outreach' }); }}
              onDismiss={openDismiss}
            />
          ))
        : <div className="glass-tight p-4 t-meta">No opportunities match these filters.</div>}

      {dismissedList.length > 0 && (
        <>
          <div className="t-h1 mt-8 mb-1">Dismissed</div>
          {dismissedList.map(o => {
            const c = CLIENTS[o.clientId];
            return (
              <div key={o.id} className="glass-tight p-4 mb-2 flex items-center justify-between">
                <div>
                  <div className="t-h3">{c.name}</div>
                  <div className="t-meta">{c.segment} · {c.tier}</div>
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
    </div>
  );
}
