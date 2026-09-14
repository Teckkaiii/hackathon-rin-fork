import { useMemo } from 'react';
import type { Action, AppState } from '../state';
import { CLIENTS, DRIVERS, MY_CLIENT_IDS } from '../state';
import { PRODUCTS, OPPS, blockedOpps, filteredOpps, clusters } from '../lib/queue';
import { businessDaysAdd, TODAY } from '../lib/format';
import { OpportunityCard } from './OpportunityCard';
import { BlockedCard } from './BlockedCard';
import { Pill } from './ui/Pill';

export function QueueView({ state, dispatch }: { state: AppState; dispatch: (a: Action) => void }) {
  const { filters, parked, dismissed, parkDates } = state;

  const surfaced = useMemo(
    () => filteredOpps(parked, dismissed, filters, CLIENTS, MY_CLIENT_IDS),
    [parked, dismissed, filters]
  );
  const blocked = useMemo(() => blockedOpps(MY_CLIENT_IDS), []);
  const cls = useMemo(() => clusters(parked, dismissed, DRIVERS, MY_CLIENT_IDS), [parked, dismissed]);
  const families = useMemo(() => [...new Set(Object.values(PRODUCTS).map(p => p.family))], []);
  const parkedList = OPPS.filter(o => parked.has(o.id) && MY_CLIENT_IDS.has(o.clientId));
  const dismissedList = OPPS.filter(o => o.id in dismissed && MY_CLIENT_IDS.has(o.clientId));

  function setFilter(key: keyof typeof filters, value: string | number) {
    dispatch({ type: 'SET_FILTER', key, value });
  }

  return (
    <div>
      <div className="t-display mb-1">Today's queue</div>
      <div className="t-lead mb-5">
        Overnight signals resolved against client exposures, after compliance gates, ranked by window to act.
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
        <span className="ml-auto t-meta font-semibold">{blocked.length} withheld by gates — unaffected by these filters</span>
      </div>

      <div className="t-h3 mb-2.5">{surfaced.length} surfaced</div>
      {surfaced.length
        ? surfaced.map((o, i) => (
            <OpportunityCard
              key={o.id}
              opp={o}
              rank={i + 1}
              parkedResurfaceDate={parkDates[o.id] ? new Date(parkDates[o.id]).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' }) : undefined}
              onOpenClient={id => dispatch({ type: 'OPEN_CLIENT', id })}
              onOpenCoach={id => { dispatch({ type: 'SET_COACH_CLIENT', id }); dispatch({ type: 'SET_TAB', tab: 'coach' }); }}
              onPark={id => dispatch({ type: 'PARK', id, resurface: businessDaysAdd(TODAY, 5).toISOString() })}
              onDismiss={id => {
                const reason = prompt('Reason for dismissing this opportunity:', 'Client not reachable this week');
                if (reason !== null) dispatch({ type: 'DISMISS', id, reason: reason || 'No reason given' });
              }}
            />
          ))
        : <div className="glass-tight p-4 t-meta">No opportunities match these filters.</div>}

      <div className="t-h1 mt-8 mb-1">What we blocked</div>
      <div className="t-meta mb-3">
        Passed the rank ordering would have applied, but withheld from the queue entirely by a hard gate. Same production quality as a surfaced opportunity — a refusal is a credibility scene, not an edge case.
      </div>
      {blocked.map(x => <BlockedCard key={x.opp.id} opp={x.opp} gates={x.gates} />)}

      {parkedList.length > 0 && (
        <>
          <div className="t-h1 mt-8 mb-1">Parked</div>
          <div className="t-meta mb-3">
            Parking is itself recorded as a signal. A parked item resurfaces on a governed cadence rather than vanishing or reappearing daily. Rule: review-type opportunities resurface after 5 business days, or immediately if a new signal names the same client.
          </div>
          {parkedList.map(o => {
            const c = CLIENTS[o.clientId];
            return (
              <div key={o.id} className="glass-tight p-4 mb-2 flex items-center justify-between">
                <div>
                  <div className="t-h3">{c.name}</div>
                  <div className="t-meta">{c.segment} · {c.tier}</div>
                </div>
                <Pill variant="flag">Resurfaces {new Date(parkDates[o.id]).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })}</Pill>
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
                  <div className="t-meta">{c.segment} · {c.tier}</div>
                </div>
                <Pill variant="neutral">Reason: {dismissed[o.id]}</Pill>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
