import type { ReactNode } from 'react';
import { CLIENTS } from '../state';
import { TODAY, fmt, fmtDate, monthsBetween } from '../lib/format';
import { OPPS } from '../lib/queue';
import { Pill } from './ui/Pill';

export function ClientDetail({ clientId, onBack }: { clientId: string; onBack: () => void }) {
  const c = CLIENTS[clientId];
  const opp = OPPS.find(o => o.clientId === clientId);
  const monthsSince = monthsBetween(new Date(c.suitability.lastReview + 'T00:00:00'), TODAY);
  const lapsed = monthsSince > 12;

  return (
    <div data-testid="client-detail">
      <button onClick={onBack} className="t-h3 text-slate mb-4 inline-flex items-center gap-1">&larr; All clients</button>

      <div className="font-sans text-[32px] font-extrabold leading-tight tracking-tight text-ink">{c.name}</div>
      <div className="t-meta mb-5">{c.segment}</div>

      {opp && (
        <div className="glass-tight border border-slate/25 bg-gradient-to-br from-[#EFF4F6] to-white p-5 mb-4">
          <div className="t-micro" style={{ color: '#33454E' }}>
            {opp.driverId
              ? `How today's news touches ${c.name.split(' ')[0]}`
              : `What changed in ${c.name.split(' ')[0]}'s portfolio`}
          </div>
          <div className="flex items-center gap-2 flex-wrap mt-1.5 mb-3">
            <div className="t-h2">{opp.signal.headline}</div>
            <Pill variant={opp.signal.recency === 'Internal' ? 'neutral' : 'flag'}>{opp.signal.recency}</Pill>
          </div>
          <div className="text-[14.5px] leading-relaxed text-ink-2">{opp.narrative}</div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-3.5 mb-3.5">
        <InfoCard eyebrow="Basic Information">
          <KV label="Tier" value={c.tier} />
          <KV label="RM" value={c.rm} />
          <KV label="Mandate" value={c.mandate} />
          <KV label="KYC" value={c.kyc.status} />
          <KV
            label="Suitability review"
            value={
              <span className="inline-flex items-center gap-2">
                {fmtDate(c.suitability.lastReview)} ({monthsSince} months ago)
                {lapsed && <Pill variant="block">Review lapsed</Pill>}
              </span>
            }
          />
        </InfoCard>

        <InfoCard eyebrow="Risk Profile">
          <KV label="Rating" value={c.riskProfile.rating} />
          <KV label="Horizon" value={c.riskProfile.horizon} />
          <KV label="Loss tolerance" value={c.riskProfile.lossTolerance} />
          <KV label="Last assessed" value={fmtDate(c.riskProfile.lastAssessed)} />
        </InfoCard>

        <InfoCard eyebrow="Portfolio">
          {c.holdings.map((h, i) => (
            <KV key={i} label={h.label} value={`${fmt(h.value)} — ${h.note}`} />
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
          <InfoCard eyebrow="Cross-Border Exposure">
            <KV label="Operating countries" value={c.crossBorder.operatingCountries.join(', ')} />
            <KV label="Investment locations" value={c.crossBorder.investmentLocations.join(', ')} />
            <KV label="Treasury exposures" value={c.crossBorder.treasuryExposures.join('; ')} />
          </InfoCard>
        )}
      </div>

      <InfoCard eyebrow="Complaint Records">
        {c.complaints.length === 0 ? (
          <div className="t-meta">No complaints on record.</div>
        ) : (
          c.complaints.map((cp, i) => (
            <div key={i} className="flex items-center justify-between gap-3 flex-wrap py-2 border-t border-hairline first:border-t-0">
              <div>
                <div className="t-body">{cp.summary}</div>
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
