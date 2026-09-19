import { useState } from 'react';
import type { Opportunity } from '../types';
import { CLIENTS } from '../state';
import { signalBreakdown, type SignalLevel } from '../lib/signal';
import { fmt } from '../lib/format';
import { Pill } from './ui/Pill';
import { Button } from './ui/Button';
import { routeFor, ROUTE_LABELS, type RouteId } from '../lib/routing';

const LEVEL_VARIANT: Record<SignalLevel, 'pass' | 'flag' | 'neutral'> = {
  high: 'pass', medium: 'flag', low: 'neutral',
};
const LEVEL_LABEL: Record<SignalLevel, string> = { high: 'High', medium: 'Medium', low: 'Low' };
const WINDOW_VARIANT: Record<SignalLevel, 'block' | 'flag' | 'neutral'> = {
  high: 'block', medium: 'flag', low: 'neutral',
};

export function OpportunityCard({
  opp, onOpenClient, onOpenOutreach, onDismiss, onHandoff,
}: {
  opp: Opportunity;
  onOpenClient: (id: string) => void;
  onOpenOutreach: (id: string) => void;
  onDismiss?: (id: string) => void;
  onHandoff: (oppId: string, route: RouteId) => void;
}) {
  const c = CLIENTS[opp.clientId];
  const signal = signalBreakdown(opp);
  const route = routeFor(opp, c);
  const [showAlts, setShowAlts] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const alternates = (Object.keys(ROUTE_LABELS) as RouteId[]).filter(id => id !== route.id);

  function runRoute(id: RouteId) {
    if (id === 'draft') onOpenOutreach(c.id);
    else onHandoff(opp.id, id);
  }

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
          <div className="t-micro">Opportunity size</div>
          <div className="t-h2 font-serif text-[24px]">{fmt(opp.amountAtStake)}</div>
          <div className="mt-1.5">
            <Pill variant={WINDOW_VARIANT[signal.urgency.level]} dot className="text-[13px] font-semibold" data-testid="window-to-act">
              {opp.daysToAct} days to act
            </Pill>
          </div>
        </div>
      </div>

      <div className="mt-3">
        <button
          type="button"
          data-testid="signal-score"
          onClick={() => setShowBreakdown(v => !v)}
          className="inline-block"
        >
          <Pill variant={LEVEL_VARIANT[signal.level]} dot className="cursor-pointer hover:brightness-95">
            Signal score: {signal.score}/100 {showBreakdown ? '▴' : '▾'}
          </Pill>
        </button>

        {showBreakdown && (
          <div className="flex gap-1.5 flex-wrap mt-2" data-testid="signal-breakdown">
            <Pill variant={LEVEL_VARIANT[signal.urgency.level]} dot>Urgency: {signal.urgency.score}/100</Pill>
            <Pill variant={LEVEL_VARIANT[signal.relevancy.level]} dot>Relevancy: {signal.relevancy.score}/100</Pill>
            <Pill variant={LEVEL_VARIANT[signal.momentum.level]} dot>Momentum: {signal.momentum.score}/100</Pill>
            <Pill variant={LEVEL_VARIANT[signal.conviction.level]} dot>
              Conviction: {signal.conviction.score}/100 ({signal.conviction.count} {signal.conviction.count === 1 ? 'piece' : 'pieces'} of news)
            </Pill>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-3 mt-4">
        <WhyBox label="Why this client" value={opp.whyClient} onClick={() => onOpenClient(c.id)} />
        <WhyBox label="Why now" value={opp.whyNow} onClick={() => onOpenClient(c.id)} />
        <WhyBox label="Why this instrument" value={opp.whyInstrument} onClick={() => onOpenClient(c.id)} />
      </div>

      <div className="mt-4">
        <div className="flex gap-2 flex-wrap items-center">
          <Button data-testid="route-primary" variant="primary" size="sm" onClick={() => runRoute(route.id)}>
            {route.label}
          </Button>
          <Button data-testid="route-toggle" variant="ghost" size="sm" onClick={() => setShowAlts(v => !v)}>
            Other actions {showAlts ? '▴' : '▾'}
          </Button>
          {onDismiss && <Button variant="ghost" size="sm" onClick={() => onDismiss(opp.id)}>Dismiss</Button>}
        </div>
        <div data-testid="route-rationale" className="t-meta mt-2">{route.rationale}</div>
        {showAlts && (
          <div className="flex gap-2 flex-wrap mt-2.5">
            {alternates.map(id => (
              <Button key={id} data-testid="route-alt" variant="ghost" size="sm" onClick={() => runRoute(id)}>
                {ROUTE_LABELS[id]}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WhyBox({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return (
    <button
      type="button"
      data-testid="why-box"
      onClick={onClick}
      className="bg-sunk rounded-xl p-3 text-left hover:bg-hairline-2/40 transition-colors"
    >
      <div className="t-micro mb-1">{label}</div>
      <div className="text-[13.5px] leading-relaxed text-ink-2">{value}</div>
    </button>
  );
}
