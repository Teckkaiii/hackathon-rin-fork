import type { GateId, GateResult, GateRow, Opportunity } from '../types';

export const GATE_LABELS: Record<GateId, string> = {
  eligibility: 'Product eligibility',
  suitability: 'Suitability & mandate fit',
  permission: 'Cross-entity permission',
  mnpi: 'MNPI / secrecy firewall',
};

const GATE_ORDER: GateId[] = ['eligibility', 'suitability', 'permission', 'mnpi'];

export function evalGates(opp: Opportunity): GateResult {
  const rows: GateRow[] = GATE_ORDER.map(gate => ({
    gate,
    label: GATE_LABELS[gate],
    status: 'pass',
    reason: defaultReason(gate),
  }));

  if (opp.gateOverride) {
    const row = rows.find(r => r.gate === opp.gateOverride!.gate)!;
    row.status = 'block';
    row.reason = opp.gateOverride.reason;
  }

  const blocked = rows.some(r => r.status === 'block');
  return {
    rows,
    blocked,
    blockingGate: blocked ? rows.find(r => r.status === 'block')!.gate : null,
  };
}

function defaultReason(gate: GateId): string {
  switch (gate) {
    case 'eligibility': return 'On the One Group approved shelf for this segment.';
    case 'suitability': return 'Matches stated risk profile and mandate; review current.';
    case 'permission': return 'Signal and client data sit within one permissioned entity.';
    case 'mnpi': return 'No information barrier applies.';
  }
}
