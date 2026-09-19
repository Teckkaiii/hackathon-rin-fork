import momentumData from '../data/momentum.json';
import type { MomentumTheme, MomentumLevel } from '../types';

export const MOMENTUM_THEMES = momentumData as Record<string, MomentumTheme>;

// A theme is high momentum when every day this week read the same direction
// of impact on the clients it touches — a durable trend an RM can act on.
// Any flip between favorable and adverse makes it low momentum: there is no
// single direction to build a recommendation around yet.
export function momentumLevel(theme: MomentumTheme): MomentumLevel {
  const first = theme.days[0].impact;
  return theme.days.every(d => d.impact === first) ? 'high' : 'low';
}

export function flipCount(theme: MomentumTheme): number {
  let n = 0;
  for (let i = 1; i < theme.days.length; i++) {
    if (theme.days[i].impact !== theme.days[i - 1].impact) n++;
  }
  return n;
}

export interface MomentumRow {
  theme: MomentumTheme;
  level: MomentumLevel;
  flips: number;
}

// clientIds, when passed, scopes results to a single RM's book — same
// convention as lib/queue.ts and lib/news.ts.
export function pastWeekThemes(clientIds?: Set<string>): MomentumRow[] {
  return Object.values(MOMENTUM_THEMES)
    .filter(t => !clientIds || t.clientIds.some(id => clientIds.has(id)))
    .map(theme => ({ theme, level: momentumLevel(theme), flips: flipCount(theme) }))
    .sort((a, b) => (a.level === b.level ? a.theme.label.localeCompare(b.theme.label) : a.level === 'high' ? -1 : 1));
}

// A client is deprioritized for this week's momentum read when every theme
// touching them is low momentum — there is no durable direction on any of
// their active signals to build a long-term action around. A client touched
// by at least one high-momentum theme keeps their normal priority even if
// another theme on them is volatile.
export function deprioritizedClientIds(clientIds?: Set<string>): Set<string> {
  const rows = pastWeekThemes(clientIds);
  const byClient: Record<string, MomentumLevel[]> = {};
  rows.forEach(r => r.theme.clientIds.forEach(cid => {
    if (clientIds && !clientIds.has(cid)) return;
    (byClient[cid] ||= []).push(r.level);
  }));
  const result = new Set<string>();
  Object.entries(byClient).forEach(([cid, levels]) => {
    if (levels.every(l => l === 'low')) result.add(cid);
  });
  return result;
}
