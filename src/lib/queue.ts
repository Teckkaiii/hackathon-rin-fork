import opportunitiesData from '../data/opportunities.json';
import productsData from '../data/products.json';
import type { Opportunity, Product, Driver } from '../types';
import { evalGates } from './gates';

export const OPPS = opportunitiesData as Opportunity[];
export const PRODUCTS = productsData as Record<string, Product>;

export interface Filters {
  segment: string;
  tier: string;
  family: string;
  minAmount: number;
  recency: string;
}

export const DEFAULT_FILTERS: Filters = {
  segment: 'all', tier: 'all', family: 'all', minAmount: 0, recency: 'all',
};

export function allOppsWithGates() {
  return OPPS.map(opp => ({ opp, gates: evalGates(opp) }));
}

export function passedOpps(): Opportunity[] {
  return allOppsWithGates().filter(x => !x.gates.blocked).map(x => x.opp);
}

export function blockedOpps() {
  return allOppsWithGates().filter(x => x.gates.blocked);
}

export function activeOpps(parked: Set<string>, dismissed: Record<string, string>): Opportunity[] {
  return passedOpps().filter(o => !parked.has(o.id) && !(o.id in dismissed));
}

export function filteredOpps(
  parked: Set<string>,
  dismissed: Record<string, string>,
  filters: Filters,
  clientsById: Record<string, { segment: string; tier: string }>
): Opportunity[] {
  return activeOpps(parked, dismissed)
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
    .sort((a, b) => a.daysToAct - b.daysToAct);
}

export function clusters(parked: Set<string>, dismissed: Record<string, string>, driversById: Record<string, Driver>) {
  const byDriver: Record<string, Opportunity[]> = {};
  activeOpps(parked, dismissed).forEach(o => {
    if (!o.driverId) return;
    (byDriver[o.driverId] ||= []).push(o);
  });
  return Object.entries(byDriver)
    .filter(([, list]) => list.length > 1)
    .map(([driverId, list]) => ({ driver: driversById[driverId], opps: list }));
}
