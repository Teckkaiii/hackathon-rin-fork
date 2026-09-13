import type { GateResult, Opportunity } from '../types';
import { CLIENTS } from '../state';
import { fmt } from '../lib/format';
import { Pill } from './ui/Pill';
import { Orb } from './ui/Orb';

export function BlockedCard({ opp, gates }: { opp: Opportunity; gates: GateResult }) {
  const c = CLIENTS[opp.clientId];
  const blockedRow = gates.rows.find(r => r.status === 'block')!;

  return (
    <div className="glass-tight border border-dashed bg-sunk/60 p-5 mb-3" data-oppid={opp.id} data-testid="blocked-card">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex gap-3 items-start">
          <Orb name={c.name} size={38} />
          <div>
            <div className="t-h2">{c.name}</div>
            <div className="t-meta">{c.segment} · {c.tier} · RM {c.rm}</div>
          </div>
        </div>
        <Pill variant="block" dot>Withheld from queue</Pill>
      </div>

      <div className="flex flex-col gap-1.5 mt-3">
        {gates.rows.map(r => (
          <div key={r.gate} className="flex items-center gap-2 text-[13.5px] py-1.5 border-t border-hairline first:border-t-0">
            <span className={`dot dot-${r.status === 'pass' ? 'pass' : 'block'}`} />
            <span className="font-semibold text-ink-2 min-w-[150px]">{r.label}</span>
            <span className="text-ink-3 text-[13px]">{r.reason}</span>
          </div>
        ))}
      </div>
      <div className="t-meta mt-2">
        Would otherwise rank on {fmt(opp.amountAtStake)} at stake, {opp.daysToAct}-day window. Blocked at:{' '}
        <b className="text-ink-2">{blockedRow.label}</b>. No filter setting can surface this — gates run before any ranking.
      </div>
    </div>
  );
}
