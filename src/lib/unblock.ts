import type { Client, GateId, Opportunity } from '../types';
import { PRODUCTS } from './data';
import { fmt } from './format';

export interface UnblockAction {
  label: string;   // the button text
  message: string; // the canned internal request, editable before it's logged
}

// Only some gates are something the RM can chase. A lapsed suitability
// review or missing cross-entity consent is paperwork someone can be asked
// to clear. An MNPI information barrier isn't — it lifts on its own when
// the deal completes or is abandoned — and a shelf-eligibility gap is a
// policy wall RIN has no lever on either, so both return null: there is
// nothing honest to offer a button for.
export function unblockAction(gate: GateId, opp: Opportunity, client: Client): UnblockAction | null {
  const product = PRODUCTS[opp.productId].name;
  switch (gate) {
    case 'suitability':
      return {
        label: 'Request a suitability refresh',
        message: `Requesting a refreshed suitability review for ${client.name} (${client.segment}, ${client.mandate} mandate) — last done ${client.suitability.lastReview}, now overdue. This is blocking a conversation about their ${product}, worth ${fmt(opp.amountAtStake)}.`,
      };
    case 'permission':
      return {
        label: 'Request cross-entity consent',
        message: `Requesting cross-entity data-sharing consent on file for ${client.name} so this record can cross the One Group perimeter to this RM. Blocking a conversation about their ${product}, worth ${fmt(opp.amountAtStake)}.`,
      };
    case 'eligibility':
    case 'mnpi':
      return null;
  }
}
