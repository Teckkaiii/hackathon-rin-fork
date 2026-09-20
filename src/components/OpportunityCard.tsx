import { useState } from 'react';
import type { Opportunity } from '../types';
import { CLIENTS } from '../state';
import { signalBreakdown, type SignalLevel } from '../lib/signal';
import { fmtNumber, fmtRollsOver } from '../lib/format';
import { cn } from '../lib/cn';
import { Pill } from './ui/Pill';
import { Button } from './ui/Button';
import { routeFor, ROUTE_LABELS, type RouteId } from '../lib/routing';
import type { SpecialistReply } from '../lib/specialist';

const WINDOW_VARIANT: Record<SignalLevel, 'block' | 'flag' | 'neutral'> = {
  high: 'block', medium: 'flag', low: 'neutral',
};
const BAR_COLOR = {
  urgency: 'bg-slate',
  relevancy: 'bg-slate',
  momentum: 'bg-slate',
  conviction: 'bg-slate',
} as const;

export function OpportunityCard({
  rank, opp, onOpenClient, onOpenOutreach, onDismiss, onHandoff, specialistReply,
}: {
  rank: number;
  opp: Opportunity;
  onOpenClient: (id: string) => void;
  onOpenOutreach: (id: string) => void;
  onDismiss?: (id: string) => void;
  onHandoff: (oppId: string, route: RouteId) => void;
  specialistReply?: SpecialistReply;
}) {
  const c = CLIENTS[opp.clientId];
  const signal = signalBreakdown(opp);
  const route = routeFor(opp, c);
  const [showAlts, setShowAlts] = useState(false);
  // Once the specialist has replied, the referral is closed — the next step is to
  // draft, whatever the original routing rule said.
  const primaryId: RouteId = specialistReply ? 'draft' : route.id;
  const primaryLabel = specialistReply ? ROUTE_LABELS.draft : route.label;
  const alternates = (Object.keys(ROUTE_LABELS) as RouteId[]).filter(id => id !== primaryId);

  function runRoute(id: RouteId) {
    if (id === 'draft') onOpenOutreach(c.id);
    else onHandoff(opp.id, id);
  }

  return (
    <div
      className="glass p-5 mb-3"
      data-oppid={opp.id}
      data-testid="opportunity-card"
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="t-micro">Rank {String(rank).padStart(2, '0')} · {opp.approach}</span>
            <Pill variant={WINDOW_VARIANT[signal.urgency.level]} className="text-[12px] font-semibold" data-testid="window-to-act">
              {opp.daysToAct} days to act
            </Pill>
            {specialistReply && <Pill variant="pass" dot>Specialist reviewed</Pill>}
          </div>
          <button
            type="button"
            data-testid="client-open"
            className="block text-left group mt-1"
            onClick={() => onOpenClient(c.id)}
          >
            <div className="t-h1 break-words group-hover:underline">{c.name}</div>
            <div className="t-meta mt-1">{c.segment}</div>
          </button>
        </div>
        <div className="text-right">
          <div className="t-micro">Opportunity size</div>
          <div className="num text-[26px] font-extrabold leading-none text-ink mt-1">{fmtNumber(opp.amountAtStake)}</div>
          <div className="t-meta mt-1">SGD · {opp.approach === 'Notify' ? 'rolls over' : 'act by'} {fmtRollsOver(opp.daysToAct)}</div>
        </div>
      </div>

      <div className="flex gap-6 items-start mt-4 pt-4 border-t border-hairline flex-wrap" data-testid="signal-breakdown">
        <div className="flex-none">
          <div className="num text-[44px] font-extrabold leading-none text-red" data-testid="signal-score">{signal.score}</div>
          <div className="t-micro mt-1">Signal / 100</div>
        </div>
        <div className="grid sm:grid-cols-3 gap-x-5 gap-y-4 flex-1 min-w-[280px]">
          <div className="flex flex-col gap-4">
            <MetricBar label="Urgency" score={signal.urgency.score} detail={signal.urgency.detail} color={BAR_COLOR.urgency} />
            <MetricBar label="Conviction" score={signal.conviction.score} detail={signal.conviction.detail} color={BAR_COLOR.conviction} />
          </div>
          <MetricBar label="Relevancy" score={signal.relevancy.score} detail={signal.relevancy.detail} color={BAR_COLOR.relevancy} />
          <MetricBar label="Momentum" score={signal.momentum.score} detail={signal.momentum.detail} color={BAR_COLOR.momentum} />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3 mt-4">
        <WhyBox label="Why this client" value={opp.whyClient} onClick={() => onOpenClient(c.id)} />
        <WhyBox label="Why now" value={opp.whyNow} onClick={() => onOpenClient(c.id)} />
        <WhyBox label="Why this instrument" value={opp.whyInstrument} onClick={() => onOpenClient(c.id)} />
      </div>

      {specialistReply && (
        <div className="bg-green-wash rounded-xl p-3 mt-3" data-testid="specialist-verdict">
          <div className="t-micro mb-1">Specialist verdict</div>
          <div className="text-[13.5px] leading-relaxed text-ink-2">{specialistReply.verdict} {specialistReply.nextStep}</div>
        </div>
      )}

      <div className="mt-4">
        <div className="flex gap-2 flex-wrap items-center">
          <Button data-testid="route-primary" variant="primary" size="sm" onClick={() => runRoute(primaryId)}>
            {primaryLabel}
          </Button>
          <Button data-testid="route-toggle" variant="ghost" size="sm" onClick={() => setShowAlts(v => !v)}>
            Other actions {showAlts ? '▴' : '▾'}
          </Button>
          {onDismiss && <Button variant="ghost" size="sm" onClick={() => onDismiss(opp.id)}>Dismiss</Button>}
        </div>
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

function MetricBar({ label, score, detail, color }: { label: string; score: number; detail: string; color: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <div className="t-h3">{label}</div>
        <div className="num text-[15px] font-semibold text-ink-2">{score}</div>
      </div>
      <div className="h-[6px] rounded-full bg-hairline-2/50 mt-1.5 overflow-hidden">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${score}%` }} />
      </div>
      <div className="t-meta mt-1">{detail}</div>
    </div>
  );
}

function WhyBox({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return (
    <button
      type="button"
      data-testid="why-box"
      onClick={onClick}
      className="bg-sunk rounded-xl p-3 text-left hover:bg-red-wash transition-colors"
    >
      <div className="t-micro mb-1">{label}</div>
      <div className="text-[13.5px] leading-relaxed text-ink-2">{value}</div>
    </button>
  );
}
