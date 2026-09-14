import type { ReactNode } from 'react';
import { MY_CLIENTS, CLIENTS } from '../state';
import { TODAY, monthsBetween } from '../lib/format';
import { bindingConstraint } from '../lib/binding';
import { OPPS, PRODUCTS } from '../lib/queue';
import { fmt, fmtDate } from '../lib/format';
import { Pill } from './ui/Pill';
import { Orb } from './ui/Orb';
import { Button } from './ui/Button';

export function ClientsView({ onOpenClient }: { onOpenClient: (id: string) => void }) {
  return (
    <div>
      <div className="t-display mb-1">Clients</div>
      <div className="t-lead mb-5">One reviewable position page per Premier or Private client.</div>
      {MY_CLIENTS.map(c => {
        const months = monthsBetween(new Date(c.suitability.lastReview + 'T00:00:00'), TODAY);
        const lapsed = months > 12;
        return (
          <div
            key={c.id}
            onClick={() => onOpenClient(c.id)}
            data-testid="client-row"
            data-client-id={c.id}
            className="glass-tight p-4 mb-2 flex items-center gap-3.5 cursor-pointer hover:border-ink-3 transition-colors"
          >
            <Orb name={c.name} />
            <div className="flex-1">
              <div className="t-h3">{c.name}</div>
              <div className="t-meta">{c.segment} · {c.tier} · RM {c.rm}</div>
            </div>
            <Pill variant={lapsed ? 'block' : 'pass'}>{lapsed ? 'Review lapsed' : 'Docs current'}</Pill>
          </div>
        );
      })}
    </div>
  );
}

export function ClientDetail({ clientId, onBack, onOpenCoach }: { clientId: string; onBack: () => void; onOpenCoach: (id: string) => void }) {
  const c = CLIENTS[clientId];
  const bind = bindingConstraint(c);
  const monthsSince = monthsBetween(new Date(c.suitability.lastReview + 'T00:00:00'), TODAY);
  const opp = OPPS.find(o => o.clientId === clientId);

  const dims: { key: string; title: string; body: ReactNode; source: string }[] = [];
  dims.push({
    key: 'doc', title: 'Documentation currency',
    body: `Suitability last reviewed ${fmtDate(c.suitability.lastReview)} (${monthsSince} months ago). KYC status: ${c.kyc.status}, expiry ${fmtDate(c.kyc.expiry)}.`,
    source: 'Compliance Records System',
  });
  if (c.concentration) {
    dims.push({
      key: 'concentration', title: 'Exposure concentration',
      body: `${c.concentration.pct}% of the portfolio in ${c.concentration.name} (guideline: ${c.concentration.threshold}%).`,
      source: c.holdings[0].source,
    });
  }
  if (c.idleCash) {
    dims.push({
      key: 'idle', title: 'Idle-cash duration',
      body: `${fmt(c.holdings[0].value)} idle for ${c.idleCash.days} days (threshold: ${c.idleCash.threshold} days).`,
      source: c.idleCash.source,
    });
  }
  dims.push({
    key: 'maturity', title: 'Maturity ladder',
    body: (
      <>{c.holdings.map((h, i) => <div key={i}>{h.label}: {fmt(h.value)} — {h.note}</div>)}</>
    ),
    source: c.holdings[0].source,
  });
  if (c.incomeObjective) {
    dims.push({
      key: 'income', title: 'Portfolio income vs objective',
      body: `Trailing income ${c.incomeObjective.actual.toLocaleString()} ${c.incomeObjective.unit} against a stated objective of ${c.incomeObjective.target.toLocaleString()} ${c.incomeObjective.unit}.`,
      source: c.incomeObjective.source,
    });
  }
  dims.push({
    key: 'mandate', title: 'Mandate drift',
    body: `Mandate: ${c.mandate}. Risk profile: ${c.risk}. Holdings reviewed against mandate — no drift detected.`,
    source: 'Mandate Records',
  });

  dims.sort((a, b) => (a.key === bind.kind ? -1 : 0) - (b.key === bind.kind ? -1 : 0));

  return (
    <div>
      <button onClick={onBack} className="t-h3 text-slate mb-4 inline-flex items-center gap-1">&larr; All clients</button>
      <div className="flex items-center gap-3.5 mb-1">
        <Orb name={c.name} size={48} />
        <div className="t-display">{c.name}</div>
      </div>
      <div className="t-meta mb-5">{c.segment} · {c.tier} · RM {c.rm} · Mandate: {c.mandate} · Risk profile: {c.risk}</div>

      <div className={`glass-tight border p-4 mb-4 ${bind.kind === 'doc' ? 'bg-gold-wash border-gold-line' : 'bg-red-wash border-red-deep/20'}`}>
        <div className="t-micro" style={{ color: bind.kind === 'doc' ? '#8A6210' : '#B81C13' }}>
          Binding constraint — shown first because it is the most limiting condition on this relationship today
        </div>
        <div className="t-h3 mt-1">{bind.label}</div>
        <div className="t-body mt-0.5">{bind.detail}</div>
      </div>

      {dims.map(d => (
        <div key={d.key} className={`glass-tight p-4 mb-2.5 ${d.key === bind.kind ? 'border-red ring-1 ring-red/20' : ''}`}>
          <div className="flex justify-between items-baseline gap-2.5">
            <div className="t-h3">{d.title}</div>
            {d.key === bind.kind && <Pill variant="block">Binding</Pill>}
          </div>
          <div className="t-body mt-1">{d.body}</div>
          <div className="src mt-1.5">Source: {d.source}</div>
        </div>
      ))}

      {opp && (
        <div className="glass-tight p-4 mt-1">
          <div className="t-h3 mb-1.5">Related opportunity</div>
          <div className="t-body mb-3">{fmt(opp.amountAtStake)} at stake · {opp.approach} · {PRODUCTS[opp.productId].name}</div>
          <Button variant="primary" size="sm" onClick={() => onOpenCoach(c.id)}>Draft in Coach</Button>
        </div>
      )}
    </div>
  );
}
