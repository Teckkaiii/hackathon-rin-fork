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

// clientIds, when passed, scopes results to a single RM's book — same
// convention as lib/queue.ts. Omit it for book-wide views.
export function newsItems(clientIds?: Set<string>): NewsItem[] {
  const pool = clientIds ? CLIENT_LIST.filter(c => clientIds.has(c.id)) : CLIENT_LIST;

  const items = Object.values(DRIVERS).map(driver => {
    const linkedOpps = OPPS.filter(o => o.driverId === driver.id && (!clientIds || clientIds.has(o.clientId)));
    const confirmedIds = new Set(linkedOpps.map(o => o.clientId));

    const confirmed: NewsImpact[] = linkedOpps.map(o => ({
      clientId: o.clientId,
      severity: severityFromOpp(o),
      basis: 'confirmed',
      reason: o.whyNow,
    }));

    const match = INFERRED_MATCH[driver.id];
    const inferred: NewsImpact[] = match
      ? pool.filter(c => !confirmedIds.has(c.id) && match.test(c)).map(c => ({
          clientId: c.id,
          severity: 'medium' as const,
          basis: 'inferred' as const,
          reason: match.reason(c),
        }))
      : [];

    const impacts = [...confirmed, ...inferred].sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);

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
