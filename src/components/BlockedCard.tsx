import type { GateResult, Opportunity } from '../types';
import { CLIENTS } from '../state';
import { fmt } from '../lib/format';
import { cn } from '../lib/cn';
import { Pill } from './ui/Pill';

export function BlockedCard({ opp, gates }: { opp: Opportunity; gates: GateResult }) {
  const c = CLIENTS[opp.clientId];
  const blockedRow = gates.rows.find(r => r.status === 'block')!;

  return (
    <div className="glass border-t-2 border-t-red p-0 mb-4 overflow-hidden" data-oppid={opp.id} data-testid="blocked-card">
      <div className="flex items-start justify-between gap-4 flex-wrap p-5 pb-4">
        <div>
          <div className="t-h2">{c.name}</div>
          <div className="t-meta mt-0.5">{c.segment} · {c.tier} · RM {c.rm}</div>
        </div>
        <Pill variant="block" dot>Withheld from queue</Pill>
      </div>

      <div>
        {gates.rows.map(r => (
          <div
            key={r.gate}
            className={cn(
              'flex items-center gap-3 text-[13.5px] py-3 px-5 border-t border-hairline',
              r.status === 'block' && 'bg-red-wash'
            )}
          >
            <span className={`dot dot-${r.status === 'pass' ? 'pass' : 'block'}`} />
            <span className={cn('font-semibold min-w-[170px]', r.status === 'block' ? 'text-red-deep' : 'text-ink')}>{r.label}</span>
            <span className="text-ink-2 text-[13px]">{r.reason}</span>
          </div>
        ))}
      </div>

      <div className="t-meta px-5 py-3 border-t border-hairline bg-sunk">
        Would otherwise rank on <span className="num font-semibold text-ink-2">{fmt(opp.amountAtStake)}</span> at stake,{' '}
        {opp.daysToAct}-day window. Blocked at <b className="text-ink-2">{blockedRow.label}</b>.
      </div>
    </div>
  );
}
