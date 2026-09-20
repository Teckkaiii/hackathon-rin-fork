import { useState } from 'react';
import type { GateResult, Opportunity } from '../types';
import { CLIENTS } from '../state';
import { fmt } from '../lib/format';
import { cn } from '../lib/cn';
import { unblockAction } from '../lib/unblock';
import { Pill } from './ui/Pill';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';

export function BlockedCard({
  opp, gates, requested, onRequest,
}: {
  opp: Opportunity;
  gates: GateResult;
  requested: boolean;
  onRequest: (message: string) => void;
}) {
  const c = CLIENTS[opp.clientId];
  const blockedRow = gates.rows.find(r => r.status === 'block')!;
  const action = gates.blockingGate ? unblockAction(gates.blockingGate, opp, c) : null;
  const [modalOpen, setModalOpen] = useState(false);
  const [requestText, setRequestText] = useState(action?.message ?? '');

  return (
    <div className="glass border-t-2 border-t-red p-0 mb-4 overflow-hidden" data-oppid={opp.id} data-testid="blocked-card">
      <div className="flex items-start justify-between gap-4 flex-wrap p-5 pb-4">
        <div>
          <div className="t-h2">{c.name}</div>
          <div className="t-meta mt-0.5">{c.segment}</div>
        </div>
        <Pill variant="block" dot>Withheld from queue</Pill>
      </div>

      <div>
        {gates.rows.map(r => (
          <div
            key={r.gate}
            className={cn(
              'grid grid-cols-[7px_1fr] sm:grid-cols-[7px_170px_1fr] items-baseline gap-x-3 gap-y-1 text-[13.5px] py-3 px-5 border-t border-hairline',
              r.status === 'block' && 'bg-red-wash'
            )}
          >
            <span className={`dot dot-${r.status === 'pass' ? 'pass' : 'block'}`} />
            <span className={cn('font-semibold', r.status === 'block' ? 'text-red-deep' : 'text-ink')}>{r.label}</span>
            <span className="text-ink-2 text-[13px] col-start-2 sm:col-start-3">{r.reason}</span>
          </div>
        ))}
      </div>

      <div className="t-meta px-5 py-3 border-t border-hairline bg-sunk">
        Worth <span className="num font-semibold text-ink-2">{fmt(opp.amountAtStake)}</span> with {opp.daysToAct} days
        to act — held at <b className="text-ink-2">{blockedRow.label}</b>.
      </div>

      {requested ? (
        <div className="px-5 py-3 border-t border-hairline flex items-center gap-2 flex-wrap">
          <Pill variant="pass" dot>Requested</Pill>
          <span className="t-meta">Logged — you'll see it in the outcome ledger once it clears.</span>
        </div>
      ) : action ? (
        <div className="px-5 py-3 border-t border-hairline">
          <Button size="sm" variant="primary" data-testid="unblock-request" onClick={() => setModalOpen(true)}>
            {action.label}
          </Button>
        </div>
      ) : (
        <div className="px-5 py-3 border-t border-hairline t-meta">
          No RM-side action available — this clears on its own once the barrier lifts.
        </div>
      )}

      <Modal
        open={modalOpen}
        title={action?.label ?? ''}
        confirmLabel="Send request"
        onConfirm={() => { onRequest(requestText.trim() || action?.message || ''); setModalOpen(false); }}
        onClose={() => setModalOpen(false)}
      >
        <div className="t-meta mb-2">Recorded in {c.name}'s outcome ledger.</div>
        <textarea
          className="w-full border border-hairline-2 rounded-xl p-3 text-[14px] leading-relaxed min-h-[100px] font-sans"
          value={requestText}
          onChange={e => setRequestText(e.target.value)}
        />
      </Modal>
    </div>
  );
}
