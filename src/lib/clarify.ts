import type { Client, Opportunity } from '../types';

export interface CallOutcome {
  verdict: string;
  nextStep: string;
}

// A canned outcome standing in for the actual clarifying call, grounded in
// the same income-objective gap the referral was made over. If a future
// clarify-routed client has no incomeObjective on file, the call still
// needs a deterministic answer — the fallback below gives one instead of
// throwing on a missing field.
export function callOutcome(opp: Opportunity, client: Client): CallOutcome {
  const first = client.name.split(' ')[0];
  const obj = client.incomeObjective;
  if (obj) {
    return {
      verdict: `${first} confirmed the gap is real — ${obj.actual.toLocaleString()} ${obj.unit} against the ${obj.target.toLocaleString()} ${obj.unit} he told you he wanted, and it's been on his mind too.`,
      nextStep: 'He wants to look at a higher-income reallocation, framed against the objective he set — not a product pitch.',
    };
  }
  return {
    verdict: `${first} confirmed there's no change to what he told you before.`,
    nextStep: 'Nothing further to raise for now.',
  };
}
