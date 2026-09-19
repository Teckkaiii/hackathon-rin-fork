import { CLIENTS, MY_CLIENT_IDS } from '../state';
import { pastWeekThemes, deprioritizedClientIds } from '../lib/momentum';
import { fmtDate } from '../lib/format';
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
      <div className="t-display mb-1">Past Week</div>
      <div className="t-lead mb-5">
        Seven days of daily impact reads per theme, against your own clients' positions. A theme where every day
        landed the same direction is <b>high momentum</b> — a durable trend worth building a recommendation around.
        A theme that flips between favorable and adverse impact is <b>low momentum</b> — there's no single direction
        to act on yet, so clients touched only by low-momentum themes are deprioritized this week rather than pushed
        toward a long-term action the trend doesn't actually support.
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-1">
        <div className="glass p-5">
          <div className="t-micro">Themes tracked</div>
          <div className="font-serif text-[34px] leading-none mt-1">{rows.length}</div>
          <div className="t-meta mt-1">over the last 7 days</div>
        </div>
        <div className="glass p-5">
          <div className="t-micro">High momentum</div>
          <div className="font-serif text-[34px] leading-none mt-1">{highCount}</div>
          <div className="t-meta mt-1">consistent direction all week</div>
        </div>
        <div className="glass p-5">
          <div className="t-micro">Clients deprioritized</div>
          <div className="font-serif text-[34px] leading-none mt-1">{deprioritized.size}</div>
          <div className="t-meta mt-1">touched only by volatile themes</div>
        </div>
      </div>

      {rows.map(({ theme, level, flips }) => {
        const clients = theme.clientIds.filter(id => MY_CLIENT_IDS.has(id)).map(id => CLIENTS[id]);
        return (
          <div key={theme.id} className="glass p-5 mb-4">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <Pill variant={LEVEL_VARIANT[level]} dot>{LEVEL_LABEL[level]}</Pill>
              <Pill variant="neutral">{flips === 0 ? 'No direction change all week' : `Flipped direction ${flips}× this week`}</Pill>
            </div>
            <div className="t-h2 mb-1.5">{theme.label}</div>
            <div className="t-body mb-3">{theme.detail}</div>

            <div className="flex items-end gap-1.5 mb-3 flex-wrap">
              {theme.days.map(d => (
                <div key={d.date} className="flex flex-col items-center gap-1" title={`${fmtDate(d.date)}: ${d.note}`}>
                  <div className={`w-7 h-7 rounded-md ${d.impact === 'favorable' ? 'bg-green' : 'bg-red'}`} />
                  <div className="t-meta text-[10.5px] leading-none">{fmtDate(d.date).slice(0, 6)}</div>
                </div>
              ))}
            </div>

            <div className="text-[13.5px] text-ink-2 mb-3">
              {level === 'high'
                ? 'Consistent impact across all 7 days — durable enough for a long-term recommendation.'
                : 'No consistent direction this week — not yet durable enough for a long-term recommendation.'}
            </div>

            {clients.length > 0 && (
              <div>
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
