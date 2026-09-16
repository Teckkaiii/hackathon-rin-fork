import type { Client, Opportunity } from '../types';
import { PRODUCTS } from './data';
import { fmt } from './format';

export type RouteId = 'draft' | 'specialist' | 'clarify';

export interface Route {
  id: RouteId;
  label: string;
  rationale: string;
}

export type RoutedMap = Record<string, { route: RouteId; note: string }>;

export const ROUTE_LABELS: Record<RouteId, string> = {
  draft: 'Draft outreach',
  specialist: 'Refer to specialist',
  clarify: 'Call to clarify',
};

const SPECIALIST_FAMILIES = ['Discretionary', 'Insurance'];
const RM_LED_CEILING = 1_000_000;

// The order matters. An opportunity resting on cash the client never stated an
// intent for needs the client's own answer before anyone — including a
// specialist — can size a product against it.
export function routeFor(opp: Opportunity, client: Client): Route {
  if (opp.approach === 'Review' && opp.driverId === null) {
    return {
      id: 'clarify',
      label: ROUTE_LABELS.clarify,
      rationale:
        'Triggered internally, with no stated client intent behind the balance — confirm objectives on a call before any product conversation.',
    };
  }

  const conc = client.concentration;
  if (conc && conc.pct > conc.threshold) {
    return {
      id: 'specialist',
      label: ROUTE_LABELS.specialist,
      rationale: `Exposure concentration is ${conc.pct}% against a ${conc.threshold}% mandate threshold — the specialist desk owns this conversation.`,
    };
  }

  const family = PRODUCTS[opp.productId].family;
  if (SPECIALIST_FAMILIES.includes(family)) {
    return {
      id: 'specialist',
      label: ROUTE_LABELS.specialist,
      rationale: `${family} instruments are not an RM-led product conversation — route to the specialist desk.`,
    };
  }

  if (opp.amountAtStake >= RM_LED_CEILING) {
    return {
      id: 'specialist',
      label: ROUTE_LABELS.specialist,
      rationale: `${fmt(opp.amountAtStake)} at stake is above the RM-led ceiling — the specialist desk should lead.`,
    };
  }

  return {
    id: 'draft',
    label: ROUTE_LABELS.draft,
    rationale:
      'No specialist trigger — not a Discretionary or Insurance instrument, no concentration breach, and below the RM-led ceiling — a direct message is appropriate.',
  };
}
