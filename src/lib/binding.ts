import type { BindingConstraint, Client } from '../types';
import { TODAY, fmt, fmtDate, monthsBetween } from './format';

/** Fixed-order, rule-based priority — not a weighted score. The first applicable
 *  condition, in this order, is the most limiting thing on the relationship today. */
export function bindingConstraint(client: Client): BindingConstraint {
  const monthsSinceReview = monthsBetween(new Date(client.suitability.lastReview + 'T00:00:00'), TODAY);

  if (monthsSinceReview > 12) {
    return {
      kind: 'doc',
      label: 'Documentation currency',
      detail: `Suitability review lapsed ${monthsSinceReview} months ago (last reviewed ${fmtDate(client.suitability.lastReview)}; policy requires refresh within 12 months). No product conversation may proceed until this is refreshed.`,
    };
  }
  if (client.concentration && client.concentration.pct > client.concentration.threshold) {
    return {
      kind: 'concentration',
      label: 'Exposure concentration',
      detail: `${client.concentration.pct}% of the portfolio sits in ${client.concentration.name}, above the ${client.concentration.threshold}% guideline.`,
    };
  }
  if (client.idleCash && client.idleCash.days > client.idleCash.threshold) {
    return {
      kind: 'idle',
      label: 'Idle-cash duration',
      detail: `${fmt(client.holdings[0].value)} has sat uninvested for ${client.idleCash.days} days, past the ${client.idleCash.threshold}-day threshold.`,
    };
  }
  if (client.incomeObjective && client.incomeObjective.actual < client.incomeObjective.target * 0.85) {
    const gap = Math.round((1 - client.incomeObjective.actual / client.incomeObjective.target) * 100);
    return {
      kind: 'income',
      label: 'Portfolio income vs objective',
      detail: `Trailing income is ${gap}% below the client's stated objective of ${client.incomeObjective.target.toLocaleString()} ${client.incomeObjective.unit}.`,
    };
  }
  return {
    kind: 'maturity',
    label: 'Maturity ladder',
    detail: 'Nearest scheduled maturity is the most time-bound item on this relationship today.',
  };
}
