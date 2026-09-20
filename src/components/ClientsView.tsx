import { MY_CLIENTS, MY_CLIENT_IDS } from '../state';
import { TODAY, monthsBetween } from '../lib/format';
import { blockedClientIds, rankedOpps } from '../lib/queue';
import { Pill } from './ui/Pill';

export function ClientsView({ onOpenClient }: { onOpenClient: (id: string) => void }) {
  const blocked = blockedClientIds(MY_CLIENT_IDS);
  const clients = MY_CLIENTS.filter(c => !blocked.has(c.id));
  const queued = new Map<string, number>();
  rankedOpps({}, {}, MY_CLIENT_IDS).forEach((o, i) => { if (!queued.has(o.clientId)) queued.set(o.clientId, i + 1); });
  return (
    <div>
      <div className="t-display mb-1">Clients</div>
      <div className="t-lead mb-5">
        Everyone in your book. Anyone held back by a compliance check is in the Blocked tab instead.
      </div>
      {clients.map(c => {
        const months = monthsBetween(new Date(c.suitability.lastReview + 'T00:00:00'), TODAY);
        const lapsed = months > 12;
        return (
          <button
            type="button"
            key={c.id}
            onClick={() => onOpenClient(c.id)}
            data-testid="client-row"
            data-client-id={c.id}
            className="w-full text-left glass-tight p-4 mb-2 flex items-center gap-3.5 cursor-pointer hover:border-ink-3 transition-colors"
          >
            <div className="flex-1">
              <div className="t-h3">{c.name}</div>
              <div className="t-meta">{c.segment}</div>
            </div>
            <div className="flex items-center gap-2 flex-none">
              {queued.has(c.id) && <span className="t-meta num">In queue · #{String(queued.get(c.id)).padStart(2, '0')}</span>}
              {lapsed && <Pill variant="block">Review lapsed</Pill>}
            </div>
          </button>
        );
      })}
    </div>
  );
}
