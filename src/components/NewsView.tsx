import { MY_CLIENT_IDS } from '../state';
import { newsByClient } from '../lib/news';
import { fmtDate } from '../lib/format';
import type { NewsFlag, ImpactSeverity } from '../types';
import { Pill } from './ui/Pill';

const FLAG_LABEL: Record<NewsFlag, string> = { priority: 'Priority', elevated: 'Watch', standard: 'Standard' };
const FLAG_TITLE: Record<NewsFlag, string> = {
  priority: 'Touches several of your clients, at least one hard',
  elevated: 'Hits one of your clients hard',
  standard: '',
};
const FLAG_VARIANT: Record<NewsFlag, 'block' | 'flag' | 'neutral'> = {
  priority: 'block',
  elevated: 'flag',
  standard: 'neutral',
};
const FLAG_RANK: Record<NewsFlag, number> = { priority: 0, elevated: 1, standard: 2 };
const SEVERITY_VARIANT: Record<ImpactSeverity, 'block' | 'flag' | 'neutral'> = {
  high: 'block',
  medium: 'flag',
  low: 'neutral',
};
const SEVERITY_LABEL: Record<ImpactSeverity, string> = { high: 'High', medium: 'Medium', low: 'Low' };

export function NewsView({ onOpenClient }: { onOpenClient: (id: string) => void }) {
  const groups = newsByClient(MY_CLIENT_IDS);

  return (
    <div>
      <div className="t-display mb-1">News</div>
      <div className="t-lead mb-5 max-w-[820px]">
        What happened in the last day, sorted by who it touches most. Confirmed means it is already behind an item
        in your queue. Inferred means RIN thinks it fits what the client holds, and you have not checked it yet.
      </div>

      {groups.map(({ client, items }) => {
        const groupFlag = items.map(i => i.flag).sort((a, b) => FLAG_RANK[a] - FLAG_RANK[b])[0];
        return (
          <div key={client.id} className="glass p-5 mb-4">
            <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
              <button
                type="button"
                data-testid="news-client-open"
                className="text-left hover:underline"
                onClick={() => onOpenClient(client.id)}
              >
                <span className="t-h2">{client.name}</span>
                <span className="t-meta ml-2">{client.segment}</span>
              </button>
              {groupFlag !== 'standard' && (
                <Pill variant={FLAG_VARIANT[groupFlag]} title={FLAG_TITLE[groupFlag]}>{FLAG_LABEL[groupFlag]}</Pill>
              )}
            </div>

            {items.map(item => (
              <div key={item.id} className="flex items-start gap-4 py-3 border-t border-hairline first:border-t-0 first:pt-0 flex-wrap">
                <div className="w-16 flex-none">
                  <div className="t-meta font-semibold text-ink-2">{fmtDate(item.date).slice(0, 6)}</div>
                  <div className="t-meta">{item.recency}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="t-h3 mb-1">{item.headline}</div>
                  <div className="text-[13.5px] text-ink-2 leading-relaxed">{item.impact.reason}</div>
                </div>
                <div className="flex flex-row flex-wrap items-start gap-1.5 flex-none sm:flex-col sm:items-end">
                  <Pill variant={SEVERITY_VARIANT[item.impact.severity]}>{SEVERITY_LABEL[item.impact.severity]} impact</Pill>
                  <Pill variant={item.impact.basis === 'confirmed' ? 'pass' : 'neutral'}>
                    {item.impact.basis === 'confirmed' ? 'Confirmed' : 'Inferred'}
                  </Pill>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
