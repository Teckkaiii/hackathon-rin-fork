import { MY_CLIENT_IDS } from '../state';
import { newsByClient } from '../lib/news';
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
        Market and desk events from the last day, grouped by client and led by whichever is most impactful to them.
        Confirmed impacts are already linked to a signal on an opportunity; inferred ones are RIN's own match against
        holdings, unreviewed.
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
                <Pill variant={FLAG_VARIANT[groupFlag]}>{FLAG_LABEL[groupFlag]}</Pill>
              )}
            </div>

            {items.map(item => (
              <div key={item.id} className="flex items-start gap-4 py-3 border-t border-hairline first:border-t-0 first:pt-0">
                <div className="w-16 flex-none">
                  <div className="t-meta font-semibold text-ink-2">{fmtDate(item.date).slice(0, 6)}</div>
                  <div className="t-meta">{item.recency}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="t-h3 mb-1">{item.headline}</div>
                  <div className="text-[13.5px] text-ink-2 leading-relaxed">{item.impact.reason}</div>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-none">
                  <Pill variant={SEVERITY_VARIANT[item.impact.severity]}>{SEVERITY_LABEL[item.impact.severity]} impact</Pill>
                  <Pill variant={item.impact.basis === 'confirmed' ? 'pass' : 'slate'}>
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
