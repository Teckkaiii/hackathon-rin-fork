import type { ReactNode } from 'react';
import { CLIENTS } from '../state';
import { TODAY, fmt, fmtDate, monthsBetween, prettyNote } from '../lib/format';
import { OPPS } from '../lib/queue';
import { Pill } from './ui/Pill';

export function ClientDetail({ clientId, onBack, backLabel }: { clientId: string; onBack: () => void; backLabel: string }) {
  const c = CLIENTS[clientId];
  const opp = OPPS.find(o => o.clientId === clientId);
  const oppCount = OPPS.filter(o => o.clientId === clientId).length;
  const monthsSince = monthsBetween(new Date(c.suitability.lastReview + 'T00:00:00'), TODAY);
  const lapsed = monthsSince > 12;

  return (
    <div data-testid="client-detail">
      <button onClick={onBack} data-testid="client-back" className="t-meta font-semibold text-ink-2 mb-4 inline-flex items-center gap-1 hover:text-ink">&larr; {backLabel}</button>

      <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
        <div>
          <div className="font-sans text-[30px] font-extrabold leading-tight tracking-tight text-ink">{c.name}</div>
          <div className="t-meta mt-0.5">{c.segment} · {c.tier} · {c.mandate} mandate · KYC current to {fmtDate(c.kyc.expiry)}</div>
        </div>
        <div className="flex gap-2 flex-none">
          <Pill variant={lapsed ? 'block' : 'pass'}>{lapsed ? 'Suitability lapsed' : `Suitability current · ${monthsSince} months ago`}</Pill>
          <Pill variant="neutral">{oppCount} open {oppCount === 1 ? 'opportunity' : 'opportunities'}</Pill>
        </div>
      </div>

      {opp && (
        <div className="panel-dark mb-4">
          <div className="t-micro text-white/50">
            {opp.driverId
              ? `How today's news touches ${c.name.split(' ')[0]}`
              : `What changed in ${c.name.split(' ')[0]}'s portfolio`}
          </div>
          <div className="text-[20px] font-extrabold mt-1.5 mb-2.5">{opp.signal.headline}</div>
          <div className="text-[14.5px] leading-relaxed text-white/70">{opp.narrative}</div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-3.5 mb-3.5">
        <InfoCard eyebrow="Relationship">
          <KV label="Tier" value={c.tier} />
          <KV label="RM" value={c.rm} />
          <KV label="Mandate" value={c.mandate} />
          <KV label="KYC" value={c.kyc.status} />
          <KV label="Suitability review" value={`${fmtDate(c.suitability.lastReview)} · ${monthsSince} mo ago`} />
        </InfoCard>

        <InfoCard eyebrow="Risk Profile">
          <KV label="Rating" value={c.riskProfile.rating} />
          <KV label="Horizon" value={c.riskProfile.horizon} />
          <KV label="Loss tolerance" value={c.riskProfile.lossTolerance} />
          <KV label="Last assessed" value={fmtDate(c.riskProfile.lastAssessed)} />
        </InfoCard>

        <InfoCard eyebrow="Portfolio · evidence-traced">
          {c.holdings.map((h, i) => (
            <div key={i} className={i > 0 ? 'pt-3 mt-3 border-t border-hairline' : ''}>
              <div className="flex justify-between items-baseline gap-3">
                <span className="t-h3">{h.label}</span>
                <span className="num text-[19px] font-semibold text-ink">{h.value.toLocaleString('en-SG')}</span>
              </div>
              <div className="t-meta mt-0.5">{prettyNote(h.note)}</div>
              <div className="src mt-1">Source: {h.source}</div>
            </div>
          ))}
          {c.concentration && (
            <KV label="Concentration" value={`${c.concentration.pct}% in ${c.concentration.name} (guideline: ${c.concentration.threshold}%)`} />
          )}
          {c.idleCash && (
            <KV label="Idle cash" value={`${c.idleCash.days} days idle (threshold: ${c.idleCash.threshold} days)`} />
          )}
          {c.incomeObjective && (
            <KV label="Income vs objective" value={`${c.incomeObjective.actual.toLocaleString()} vs ${c.incomeObjective.target.toLocaleString()} ${c.incomeObjective.unit}`} />
          )}
        </InfoCard>

        {c.crossBorder && (
          <InfoCard eyebrow="Cross-Border Footprint">
            <KV label="Operating" value={c.crossBorder.operatingCountries.join(', ')} />
            <KV label="Investments" value={c.crossBorder.investmentLocations.join(', ')} />
            <KV label="Treasury" value={c.crossBorder.treasuryExposures.join('; ')} />
          </InfoCard>
        )}
      </div>

      <InfoCard eyebrow="Complaint Records">
        {c.complaints.length === 0 ? (
          <div className="t-meta">No complaints on record.</div>
        ) : (
          c.complaints.map((cp, i) => (
            <div key={i} className="flex items-center justify-between gap-3 flex-wrap py-2 border-t border-hairline first:border-t-0 first:pt-0">
              <div>
                <div className="t-body font-semibold text-ink">{cp.summary}</div>
                <div className="t-meta">{fmtDate(cp.date)} · {cp.channel}</div>
              </div>
              <Pill variant={cp.status === 'Closed' ? 'pass' : 'flag'}>{cp.status}</Pill>
            </div>
          ))
        )}
      </InfoCard>
    </div>
  );
}

function InfoCard({ eyebrow, children }: { eyebrow: string; children: ReactNode }) {
  return (
    <div className="glass-tight p-4">
      <div className="t-micro mb-2.5">{eyebrow}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function KV({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-3 text-[13.5px]">
      <span className="text-ink-3">{label}</span>
      <span className="font-semibold text-ink text-right">{value}</span>
    </div>
  );
}
