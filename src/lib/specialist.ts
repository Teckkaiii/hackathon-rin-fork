import type { Client, Opportunity } from '../types';
import { PRODUCTS } from './data';
import { fmt } from './format';

export interface SpecialistReply {
  verdict: string;
  nextStep: string;
}

const SPECIALIST_FAMILIES = ['Discretionary', 'Insurance'];

// A canned reply from the specialist desk, standing in for the call the RM would
// actually have. Mirrors routeFor's own reasoning in lib/routing.ts (concentration
// first, then product family, then size), so the reply always answers the same
// question the referral was made for.
export function specialistReply(opp: Opportunity, client: Client): SpecialistReply {
  const first = client.name.split(' ')[0];

  const conc = client.concentration;
  if (conc && conc.pct > conc.threshold) {
    return {
      verdict: `Reviewed — confirms the ${conc.pct}% concentration in ${conc.name} breaches ${first}'s ${conc.threshold}% mandate threshold.`,
      nextStep: 'Recommend trimming toward a diversified alternative. Happy to join the call if it helps.',
    };
  }

  const family = PRODUCTS[opp.productId].family;
  if (SPECIALIST_FAMILIES.includes(family)) {
    return {
      verdict: `Reviewed — this ${family.toLowerCase()} conversation clears suitability at ${first}'s current mandate.`,
      nextStep: `Go ahead and open the conversation; loop the desk in once ${first}'s interested.`,
    };
  }

  return {
    verdict: `Reviewed — ${fmt(opp.amountAtStake)} is within policy for this mandate at this size.`,
    nextStep: "You're clear to lead this one directly.",
  };
}
