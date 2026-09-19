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
      <div className="t-lead mb-5">
        Market and desk events from the last day, grouped by client and led by whichever is most impactful to them.
        A confirmed impact is already linked to a signal on an opportunity; an inferred one is RIN's best match
        against the client's holdings and hasn't been reviewed by anyone.
      </div>

      {groups.map(({ client, items }) => (
        <div key={client.id} className="glass p-5 mb-4">
          <button
            type="button"
            data-testid="news-client-open"
            className="t-h2 mb-1 text-left hover:underline"
            onClick={() => onOpenClient(client.id)}
          >
            {client.name}
          </button>
          <div className="t-meta mb-3">{client.segment}</div>

          {items.map(item => (
            <div key={item.id} className="py-2.5 border-t border-hairline first:border-t-0">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <Pill variant="neutral">{item.recency} · {fmtDate(item.date)}</Pill>
                <Pill variant={FLAG_VARIANT[item.flag]} dot>{FLAG_LABEL[item.flag]}</Pill>
                <Pill variant={SEVERITY_VARIANT[item.impact.severity]} dot>{SEVERITY_LABEL[item.impact.severity]} impact</Pill>
                <Pill variant={item.impact.basis === 'confirmed' ? 'pass' : 'slate'}>
                  {item.impact.basis === 'confirmed' ? 'Confirmed' : 'Inferred'}
                </Pill>
              </div>
              <div className="t-h3 mb-1">{item.headline}</div>
              <div className="text-[13.5px] text-ink-2">{item.impact.reason}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
