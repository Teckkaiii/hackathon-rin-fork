import type { Opportunity } from '../types';
import { CLIENTS } from '../state';
import { signalBreakdown, type SignalLevel } from '../lib/signal';
import { fmt } from '../lib/format';
import { Pill } from './ui/Pill';
import { Button } from './ui/Button';

const LEVEL_VARIANT: Record<SignalLevel, 'pass' | 'flag' | 'neutral'> = {
  high: 'pass', medium: 'flag', low: 'neutral',
};
const LEVEL_LABEL: Record<SignalLevel, string> = { high: 'High', medium: 'Medium', low: 'Low' };

export function OpportunityCard({
  opp, parkedResurfaceDate, onOpenClient, onOpenOutreach, onPark, onDismiss,
}: {
  opp: Opportunity;
  parkedResurfaceDate?: string;
  onOpenClient: (id: string) => void;
  onOpenOutreach: (id: string) => void;
  onPark?: (id: string) => void;
  onDismiss?: (id: string) => void;
}) {
  const c = CLIENTS[opp.clientId];
  const signal = signalBreakdown(opp);

  return (
    <div
      className="glass-tight border p-5 mb-3"
      data-oppid={opp.id}
      data-testid="opportunity-card"
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <button
          type="button"
          data-testid="client-open"
          className="min-w-0 flex-1 text-left group"
          onClick={() => onOpenClient(c.id)}
        >
          <div className="t-h2 break-words group-hover:underline">{c.name}</div>
          <div className="t-meta">{c.segment}</div>
        </button>
        <div className="text-right">
          <div className="t-micro">Amount at stake</div>
          <div className="t-h2 font-serif text-[24px]">{fmt(opp.amountAtStake)}</div>
          <div className="t-meta">Window to act: {opp.daysToAct} days</div>
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap mt-3">
        <Pill variant={LEVEL_VARIANT[signal.urgency.level]} dot>Urgency: {LEVEL_LABEL[signal.urgency.level]}</Pill>
        <Pill variant={LEVEL_VARIANT[signal.relevancy.level]} dot>Relevancy: {LEVEL_LABEL[signal.relevancy.level]}</Pill>
        <Pill variant={LEVEL_VARIANT[signal.momentum.level]} dot>Momentum: {LEVEL_LABEL[signal.momentum.level]}</Pill>
        <Pill variant={LEVEL_VARIANT[signal.conviction.level]} dot>
          Conviction: {signal.conviction.count} {signal.conviction.count === 1 ? 'piece' : 'pieces'} of news
        </Pill>
      </div>

      <div className="grid md:grid-cols-3 gap-3 mt-4">
        <WhyBox label="Why this client" value={opp.whyClient} />
        <WhyBox label="Why now" value={opp.whyNow} />
        <WhyBox label="Why this instrument" value={opp.whyInstrument} />
      </div>

      <div className="flex gap-2 flex-wrap mt-4">
        <Button size="sm" onClick={() => onOpenOutreach(c.id)}>Draft outreach</Button>
        {parkedResurfaceDate ? (
          <Pill variant="flag">Parked — resurfaces {parkedResurfaceDate}</Pill>
        ) : (
          onPark && <Button variant="ghost" size="sm" onClick={() => onPark(opp.id)}>Park</Button>
        )}
        {onDismiss && <Button variant="ghost" size="sm" onClick={() => onDismiss(opp.id)}>Dismiss</Button>}
      </div>
    </div>
  );
}

function WhyBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-sunk rounded-xl p-3">
      <div className="t-micro mb-1">{label}</div>
      <div className="text-[13.5px] leading-relaxed text-ink-2">{value}</div>
    </div>
  );
}
