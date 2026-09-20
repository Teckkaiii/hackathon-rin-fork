import type { Client, NewsFlag, NewsImpact, NewsItem, Opportunity } from '../types';
import { CLIENT_LIST, DRIVERS } from '../state';
import { OPPS } from './data';

const SEVERITY_RANK = { high: 0, medium: 1, low: 2 };

// Severity of a *confirmed* impact is read off the opportunity itself — the
// same amount-at-stake / window-to-act the RM already sees in the Queue —
// rather than a separate score.
function severityFromOpp(opp: Opportunity): 'high' | 'medium' | 'low' {
  if (opp.amountAtStake >= 300000 && opp.daysToAct <= 15) return 'high';
  if (opp.amountAtStake >= 150000 || opp.daysToAct <= 20) return 'medium';
  return 'low';
}

// A client is an *inferred* match for a driver when their holdings look like
// the same instrument type or sector the news describes, but no opportunity
// has actually linked that client's record to this signal. Inferred impacts
// are capped at 'medium' — RIN hasn't verified the match, so it shouldn't
// read as more urgent than something confirmed.
const INFERRED_MATCH: Record<string, { test: (c: Client) => boolean; reason: (c: Client) => string }> = {
  'rate-cut': {
    test: c => c.holdings.some(h => /fixed deposit|corporate bond/i.test(h.label)),
    reason: c => `Holds a ${c.holdings[0].label.toLowerCase()} (${c.holdings[0].note}) — the same rate-sensitive instrument type as this news, but not yet linked to this signal in the record.`,
  },
  'sector-semis': {
    test: c => c.holdings.some(h => /foundry|semiconductor/i.test(h.label) || /foundry|semiconductor/i.test(h.note)),
    reason: c => `Holds a position described as "${c.holdings[0].note}" — the same sector as this news, but not yet linked to this signal in the record.`,
  },
  'reit-rerating': {
    test: c => c.holdings.some(h => /reit/i.test(h.label) || /reit/i.test(h.note)),
    reason: c => `Holds a ${c.holdings[0].label.toLowerCase()} (${c.holdings[0].note}) — the same rate-sensitive sector as this news, but not yet linked to this signal in the record.`,
  },
  'cross-border-fx-vol': {
    test: c => !!c.crossBorder && c.crossBorder.treasuryExposures.length > 0,
    reason: c => `Carries an unhedged cross-border treasury exposure (${c.crossBorder!.treasuryExposures[0].toLowerCase()}) — directly exposed to this FX move, but not yet linked to this signal in the record.`,
  },
  'usd-mmf-yield': {
    test: c => c.holdings.some(h => /money market/i.test(h.label)),
    reason: c => `Holds a ${c.holdings[0].label.toLowerCase()} (${c.holdings[0].note}) — the same instrument type as this news, but not yet linked to this signal in the record.`,
  },
  'par-fund-bonus-trim': {
    test: c => c.holdings.some(h => /universal life|participating|endowment/i.test(h.label)),
    reason: c => `Holds a ${c.holdings[0].label.toLowerCase()} (${c.holdings[0].note}) — the same policy type as this news, but not yet linked to this signal in the record.`,
  },
  'ig-credit-spread-widening': {
    test: c => c.holdings.some(h => /corporate bond/i.test(h.label)),
    reason: c => `Holds a ${c.holdings[0].label.toLowerCase()} (${c.holdings[0].note}) — directly exposed to this spread move, but not yet linked to this signal in the record.`,
  },
};

// Flags an item by how many clients it lands on and how hard. A single
// severely-impacted, confirmed client is 'elevated'; a signal confirmed
// severe on one client and reaching a second is 'priority' — the case most
// worth an RM's attention first.
function flagFor(impacts: NewsImpact[]): NewsFlag {
  const highConfirmed = impacts.filter(i => i.basis === 'confirmed' && i.severity === 'high').length;
  if (highConfirmed >= 2) return 'priority';
  if (highConfirmed >= 1 && impacts.length >= 2) return 'priority';
  if (highConfirmed >= 1) return 'elevated';
  return 'standard';
}

// Everyone in the book this driver lands on: clients whose opportunity is
// linked to it (confirmed) and clients whose holdings look like the same
// instrument or sector (inferred). Exported so the News tab and the
// bring-your-own-news intake can never disagree about who is exposed.
export function impactsForDriver(driverId: string, clientIds?: Set<string>): NewsImpact[] {
  const pool = clientIds ? CLIENT_LIST.filter(c => clientIds.has(c.id)) : CLIENT_LIST;
  const linkedOpps = OPPS.filter(o => o.driverId === driverId && (!clientIds || clientIds.has(o.clientId)));
  const confirmedIds = new Set(linkedOpps.map(o => o.clientId));

  const confirmed: NewsImpact[] = linkedOpps.map(o => ({
    clientId: o.clientId,
    severity: severityFromOpp(o),
    basis: 'confirmed',
    reason: o.whyNow,
  }));

  const match = INFERRED_MATCH[driverId];
  const inferred: NewsImpact[] = match
    ? pool.filter(c => !confirmedIds.has(c.id) && match.test(c)).map(c => ({
        clientId: c.id,
        severity: 'medium' as const,
        basis: 'inferred' as const,
        reason: match.reason(c),
      }))
    : [];

  return [...confirmed, ...inferred].sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}

// clientIds, when passed, scopes results to a single RM's book — same
// convention as lib/queue.ts. Omit it for book-wide views.
export function newsItems(clientIds?: Set<string>): NewsItem[] {
  const items = Object.values(DRIVERS).map(driver => {
    const impacts = impactsForDriver(driver.id, clientIds);
    const item: NewsItem = {
      id: driver.id,
      headline: driver.label,
      detail: driver.detail,
      date: driver.date,
      recency: driver.recency,
      impacts,
      flag: flagFor(impacts),
    };
    return item;
  });

  const RECENCY_ORDER = { Yesterday: 0, Today: 1, Internal: 2 };
  return items.sort((a, b) => RECENCY_ORDER[a.recency] - RECENCY_ORDER[b.recency]);
}

export interface ClientNewsItem extends NewsItem {
  impact: NewsImpact;
}

export interface ClientNewsGroup {
  client: Client;
  items: ClientNewsItem[];
}

const BASIS_RANK = { confirmed: 0, inferred: 1 };

// Same news, re-keyed per client: each client sees only the items that
// impact them, most impactful first — the mirror image of newsItems(),
// which is keyed per driver.
export function newsByClient(clientIds?: Set<string>): ClientNewsGroup[] {
  const pool = clientIds ? CLIENT_LIST.filter(c => clientIds.has(c.id)) : CLIENT_LIST;
  const items = newsItems(clientIds);

  const groups = pool
    .map(client => {
      const clientItems: ClientNewsItem[] = items
        .filter(item => item.impacts.some(im => im.clientId === client.id))
        .map(item => ({ ...item, impact: item.impacts.find(im => im.clientId === client.id)! }))
        .sort((a, b) =>
          SEVERITY_RANK[a.impact.severity] - SEVERITY_RANK[b.impact.severity] ||
          BASIS_RANK[a.impact.basis] - BASIS_RANK[b.impact.basis]
        );
      return { client, items: clientItems };
    })
    .filter(g => g.items.length > 0);

  return groups.sort((a, b) => SEVERITY_RANK[a.items[0].impact.severity] - SEVERITY_RANK[b.items[0].impact.severity]);
}
