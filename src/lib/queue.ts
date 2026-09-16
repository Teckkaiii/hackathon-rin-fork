import type { Driver, Opportunity } from '../types';
import { evalGates } from './gates';
import { signalScore } from './signal';
import type { Filters } from './filters';
import { OPPS, PRODUCTS } from './data';

export { OPPS, PRODUCTS };

export function allOppsWithGates() {
  return OPPS.map(opp => ({ opp, gates: evalGates(opp) }));
}

// clientIds, when passed, scopes results to a single RM's book. Omit it for
// book-wide views.
export function passedOpps(clientIds?: Set<string>): Opportunity[] {
  return allOppsWithGates()
    .filter(x => !x.gates.blocked)
    .filter(x => !clientIds || clientIds.has(x.opp.clientId))
    .map(x => x.opp);
}

export function blockedOpps(clientIds?: Set<string>) {
  return allOppsWithGates()
    .filter(x => x.gates.blocked)
    .filter(x => !clientIds || clientIds.has(x.opp.clientId));
}

export function activeOpps(parked: Set<string>, dismissed: Record<string, string>, clientIds?: Set<string>): Opportunity[] {
  return passedOpps(clientIds).filter(o => !parked.has(o.id) && !(o.id in dismissed));
}

export function filteredOpps(
  parked: Set<string>,
  dismissed: Record<string, string>,
  filters: Filters,
  clientsById: Record<string, { segment: string; tier: string }>,
  clientIds?: Set<string>
): Opportunity[] {
  return activeOpps(parked, dismissed, clientIds)
    .filter(o => {
      const c = clientsById[o.clientId];
      if (filters.segment !== 'all' && c.segment !== filters.segment) return false;
      if (filters.tier !== 'all' && c.tier !== filters.tier) return false;
      if (filters.family !== 'all' && PRODUCTS[o.productId].family !== filters.family) return false;
      if (o.amountAtStake < filters.minAmount) return false;
      if (filters.recency === 'fresh' && !(o.signal.recency === 'Today' || o.signal.recency === 'Yesterday')) return false;
      if (filters.recency === 'internal' && o.signal.recency !== 'Internal') return false;
      return true;
    })
    .sort((a, b) => signalScore(b) - signalScore(a) || a.daysToAct - b.daysToAct);
}

export function blockedClientIds(clientIds?: Set<string>): Set<string> {
  return new Set(blockedOpps(clientIds).map(x => x.opp.clientId));
}

export function clusters(parked: Set<string>, dismissed: Record<string, string>, driversById: Record<string, Driver>, clientIds?: Set<string>) {
  const byDriver: Record<string, Opportunity[]> = {};
  activeOpps(parked, dismissed, clientIds).forEach(o => {
    if (!o.driverId) return;
    (byDriver[o.driverId] ||= []).push(o);
  });
  return Object.entries(byDriver)
    .filter(([, list]) => list.length > 1)
    .map(([driverId, list]) => ({ driver: driversById[driverId], opps: list }));
}
