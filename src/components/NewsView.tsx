import { CLIENTS, MY_CLIENT_IDS } from '../state';
import { newsItems } from '../lib/news';
import { fmtDate } from '../lib/format';
import type { NewsFlag, ImpactSeverity } from '../types';
import { Pill } from './ui/Pill';

const FLAG_LABEL: Record<NewsFlag, string> = {
  priority: 'Priority — reaches multiple clients, at least one severely',
  elevated: 'Elevated — at least one client severely affected',
  standard: 'Standard',
};
const FLAG_VARIANT: Record<NewsFlag, 'block' | 'flag' | 'neutral'> = {
  priority: 'block',
  elevated: 'flag',
  standard: 'neutral',
};
const SEVERITY_VARIANT: Record<ImpactSeverity, 'block' | 'flag' | 'neutral'> = {
  high: 'block',
  medium: 'flag',
  low: 'neutral',
};
const SEVERITY_LABEL: Record<ImpactSeverity, string> = { high: 'High', medium: 'Medium', low: 'Low' };

export function NewsView() {
  const items = newsItems(MY_CLIENT_IDS);

  return (
    <div>
      <div className="t-display mb-1">News</div>
      <div className="t-lead mb-5">
        Market and desk events from the last day, read against your own clients' positions. A confirmed impact is
        already linked to a signal on an opportunity; an inferred one is RIN's best match against the client's
        holdings and hasn't been reviewed by anyone.
      </div>

      {items.map(item => (
        <div key={item.id} className="glass p-5 mb-4">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <Pill variant="neutral">{item.recency} · {fmtDate(item.date)}</Pill>
            <Pill variant={FLAG_VARIANT[item.flag]} dot>{FLAG_LABEL[item.flag]}</Pill>
          </div>
          <div className="t-h2 mb-1.5">{item.headline}</div>
          <div className="t-body mb-3">{item.detail}</div>

          {item.impacts.length ? (
            <div>
              {item.impacts.map(imp => {
                const c = CLIENTS[imp.clientId];
                return (
                  <div key={imp.clientId} className="flex items-start gap-2.5 py-2.5 border-t border-hairline first:border-t-0">
                    <Pill variant={SEVERITY_VARIANT[imp.severity]} dot>{SEVERITY_LABEL[imp.severity]}</Pill>
                    <div className="flex-1 min-w-0">
                      <div className="t-h3">{c.name}</div>
                      <div className="text-[13.5px] text-ink-2">{imp.reason}</div>
                    </div>
                    <Pill variant={imp.basis === 'confirmed' ? 'pass' : 'slate'} className="flex-none">
                      {imp.basis === 'confirmed' ? 'Confirmed' : 'Inferred'}
                    </Pill>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="t-meta">No clients in your book match this signal.</div>
          )}
        </div>
      ))}
    </div>
  );
}
