import { CLIENTS, MY_CLIENT_IDS } from '../state';
import { pastWeekThemes, deprioritizedClientIds } from '../lib/momentum';
import { fmtDate } from '../lib/format';
import { cn } from '../lib/cn';
import type { MomentumLevel } from '../types';
import { Pill } from './ui/Pill';

const LEVEL_LABEL: Record<MomentumLevel, string> = { high: 'High momentum', low: 'Low momentum' };
const LEVEL_VARIANT: Record<MomentumLevel, 'pass' | 'flag'> = { high: 'pass', low: 'flag' };

export function PastWeekView() {
  const rows = pastWeekThemes(MY_CLIENT_IDS);
  const deprioritized = deprioritizedClientIds(MY_CLIENT_IDS);
  const highCount = rows.filter(r => r.level === 'high').length;

  return (
    <div>
      <div className="t-display mb-1">Past week</div>
      <div className="t-lead mb-5 max-w-[820px]">
        Seven days of daily impact reads per theme, against this book. A theme that landed the same direction every
        day is durable enough to build a recommendation around; one that flips is not.
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-4">
        <div className="glass p-5">
          <div className="t-micro">Themes tracked</div>
          <div className="num text-[30px] font-semibold text-ink leading-none mt-1">{rows.length}</div>
          <div className="t-meta mt-1">over the last 7 days</div>
        </div>
        <div className="glass p-5">
          <div className="t-micro">High momentum</div>
          <div className="num text-[30px] font-semibold text-ink leading-none mt-1">{highCount}</div>
          <div className="t-meta mt-1">consistent direction all week</div>
        </div>
        <div className="glass p-5">
          <div className="t-micro">Clients deprioritized</div>
          <div className="num text-[30px] font-semibold text-ink leading-none mt-1">{deprioritized.size}</div>
          <div className="t-meta mt-1">touched only by volatile themes</div>
        </div>
      </div>

      {rows.map(({ theme, level, flips }) => {
        const clients = theme.clientIds.filter(id => MY_CLIENT_IDS.has(id)).map(id => CLIENTS[id]);
        const momentumTag = level === 'high'
          ? `High momentum · 7/7 ${theme.days[0].impact}`
          : `Low momentum · ${flips} reversal${flips === 1 ? '' : 's'}`;
        return (
          <div key={theme.id} className="glass p-5 mb-4">
            <div className="flex items-start justify-between gap-3 flex-wrap mb-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <Pill variant={LEVEL_VARIANT[level]}>{momentumTag}</Pill>
              </div>
              {clients.length > 0 && (
                <span className="t-meta">Touches {clients.map(c => c.name).join(', ')}</span>
              )}
            </div>
            <div className="t-h2 mb-1.5">{theme.label}</div>
            <div className="t-body mb-4">{theme.detail}</div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 mb-1">
              {theme.days.map(d => (
                <div
                  key={d.date}
                  title={`${fmtDate(d.date)}: ${d.note}`}
                  className={cn('rounded-lg p-2.5', d.impact === 'favorable' ? 'bg-green-wash' : 'bg-red-wash')}
                >
                  <div className="t-meta text-[11px] font-semibold text-ink-2">{fmtDate(d.date).slice(0, 6)}</div>
                  <div className={cn('h-[2px] rounded-full my-1.5', d.impact === 'favorable' ? 'bg-green' : 'bg-red')} />
                  <div className="text-[12px] leading-snug text-ink">{d.note}</div>
                </div>
              ))}
            </div>

            {clients.length > 0 && (
              <div className="mt-3">
                {clients.map(c => {
                  const isDeprioritized = deprioritized.has(c.id);
                  return (
                    <div key={c.id} className="flex items-start gap-2.5 py-2.5 border-t border-hairline first:border-t-0">
                      <Pill variant={isDeprioritized ? 'slate' : 'pass'} className="flex-none">
                        {isDeprioritized ? 'Deprioritized' : 'Active priority'}
                      </Pill>
                      <div className="flex-1 min-w-0">
                        <div className="t-h3">{c.name}</div>
                        <div className="text-[13.5px] text-ink-2">
                          {isDeprioritized
                            ? 'Every theme touching this client this week was volatile — no durable long-term action to recommend yet. Watch, don’t act.'
                            : 'Touched by at least one high-momentum theme this week — keeps its normal priority in the Queue.'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
