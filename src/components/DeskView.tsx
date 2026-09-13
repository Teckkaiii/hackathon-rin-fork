import type { AppState } from '../state';
import { CLIENT_LIST, CLIENTS, DRIVERS } from '../state';
import { activeOpps, blockedOpps, clusters, OPPS } from '../lib/queue';
import { GATE_LABELS } from '../lib/gates';
import { TODAY, monthsBetween, fmtDate } from '../lib/format';
import { Pill } from './ui/Pill';

export function DeskView({ state }: { state: AppState }) {
  const { parked, dismissed, ledger } = state;
  const blocked = blockedOpps();
  const byGate: Record<string, number> = {};
  blocked.forEach(x => { const g = x.gates.blockingGate!; byGate[g] = (byGate[g] || 0) + 1; });

  const active = activeOpps(parked, dismissed);
  const cls = clusters(parked, dismissed, DRIVERS);

  const docTable = CLIENT_LIST.map(c => {
    const months = monthsBetween(new Date(c.suitability.lastReview + 'T00:00:00'), TODAY);
    const status = months > 12 ? 'Lapsed' : months >= 10 ? 'Due soon' : 'Current';
    return { c, status };
  });

  const unactioned = OPPS.filter(o => active.some(a => a.id === o.id) || parked.has(o.id) || o.id in dismissed)
    .filter(o => !ledger.some(l => l.clientId === o.clientId));

  return (
    <div>
      <div className="t-display mb-1">Desk View</div>
      <div className="t-lead mb-5">
        Team-lead surface. Coverage, refusals and concentration across the book — no ranking or prediction of individual RM performance.
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="glass p-5">
          <div className="t-micro">Surfaced today</div>
          <div className="font-serif text-[34px] leading-none mt-1">{active.length}</div>
          <div className="t-meta mt-1">passed all 4 gates</div>
        </div>
        <div className="glass p-5">
          <div className="t-micro">Withheld by gates</div>
          <div className="font-serif text-[34px] leading-none mt-1">{blocked.length}</div>
          <div className="t-meta mt-1">would otherwise rank</div>
        </div>
        <div className="glass p-5">
          <div className="t-micro">Actioned this session</div>
          <div className="font-serif text-[34px] leading-none mt-1">{ledger.length + Object.keys(dismissed).length + parked.size}</div>
          <div className="t-meta mt-1">sent, dismissed or parked</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mt-1">
        <div className="glass p-5">
          <div className="t-h3 mb-2">Refusal-case volume, by reason</div>
          {Object.keys(byGate).length ? Object.entries(byGate).map(([g, n]) => (
            <div key={g} className="flex items-center gap-2.5 py-2 border-t border-hairline first:border-t-0">
              <Pill variant="block">{n}</Pill>
              <div className="text-[13.5px] text-ink-2">{GATE_LABELS[g as keyof typeof GATE_LABELS]}</div>
            </div>
          )) : <div className="t-meta">No refusals.</div>}
        </div>
        <div className="glass p-5">
          <div className="t-h3 mb-2">Unactioned, with recorded reason</div>
          {unactioned.length ? unactioned.map(o => {
            const c = CLIENTS[o.clientId];
            const reason = o.id in dismissed ? 'Dismissed: ' + dismissed[o.id] : parked.has(o.id) ? 'Parked' : 'Not yet actioned';
            return (
              <div key={o.id} className="flex items-center gap-2.5 py-2 border-t border-hairline first:border-t-0">
                <Pill variant="neutral">{c.name}</Pill>
                <div className="text-[13.5px] text-ink-2">{reason}</div>
              </div>
            );
          }) : <div className="t-meta">Everything surfaced has been actioned.</div>}
        </div>
      </div>

      <div className="glass p-5">
        <div className="t-h3 mb-2">Correlated-conviction clusters, spanning multiple RMs</div>
        {cls.length ? cls.map(cl => (
          <div key={cl.driver.id} className="flex items-center gap-2.5 py-2 border-t border-hairline first:border-t-0">
            <Pill variant="flag">{cl.opps.length}</Pill>
            <div className="text-[13.5px] text-ink-2">
              <b>{cl.driver.label}</b> — {cl.opps.map(o => `${CLIENTS[o.clientId].name} (RM ${CLIENTS[o.clientId].rm})`).join(', ')}
            </div>
          </div>
        )) : <div className="t-meta">No active clusters.</div>}
      </div>

      <div className="glass p-5">
        <div className="t-h3 mb-2">Documentation currency across the book</div>
        <table className="w-full text-[13.5px] border-collapse">
          <thead>
            <tr>
              {['Client', 'RM', 'Suitability review', 'Status', 'KYC'].map(h => (
                <th key={h} className="text-left t-micro pb-1.5 border-b border-hairline-2">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {docTable.map(({ c, status }) => (
              <tr key={c.id}>
                <td className="py-2 border-b border-hairline">{c.name}</td>
                <td className="py-2 border-b border-hairline">{c.rm}</td>
                <td className="py-2 border-b border-hairline">{fmtDate(c.suitability.lastReview)}</td>
                <td className="py-2 border-b border-hairline">
                  <Pill variant={status === 'Lapsed' ? 'block' : status === 'Due soon' ? 'flag' : 'pass'}>{status}</Pill>
                </td>
                <td className="py-2 border-b border-hairline">{c.kyc.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
