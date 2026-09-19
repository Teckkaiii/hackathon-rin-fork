import type { Opportunity } from '../types';
import { newsItems } from './news';
import { MOMENTUM_THEMES, momentumLevel, flipCount } from './momentum';

export type SignalLevel = 'high' | 'medium' | 'low';

export interface SignalDimension {
  score: number;
  level: SignalLevel;
  detail: string;
}

export interface SignalBreakdown {
  score: number;
  level: SignalLevel;
  urgency: SignalDimension;
  relevancy: SignalDimension;
  momentum: SignalDimension;
  conviction: SignalDimension & { count: number };
}

export function levelFor(score: number): SignalLevel {
  if (score >= 75) return 'high';
  if (score >= 45) return 'medium';
  return 'low';
}

const SEVERITY_SCORE = { high: 100, medium: 60, low: 30 };

// A 3-day window scores near-max urgency; a 30-day window scores near-min.
function urgencyScore(daysToAct: number): { score: number; detail: string } {
  const score = Math.round(Math.max(0, Math.min(100, 100 - (daysToAct - 3) * (100 / 27))));
  return { score, detail: `${daysToAct}-day window` };
}

// Relevancy: how directly the underlying news actually touches this client's
// portfolio, not just how big or urgent the resulting opportunity is. An
// internally-triggered opportunity (idle cash, income gap, contractual
// maturity — no external driver) is by definition about the portfolio
// itself, so it scores maximally relevant. An externally-driven one inherits
// the same confirmed/inferred impact severity shown in the News tab, with
// an inferred (unreviewed) match discounted relative to a confirmed one.
function relevancyScore(opp: Opportunity): { score: number; detail: string } {
  if (!opp.driverId) return { score: 100, detail: 'Internally triggered' };
  const item = newsItems().find(i => i.id === opp.driverId);
  const impact = item?.impacts.find(i => i.clientId === opp.clientId);
  if (!impact) return { score: 100, detail: 'Internally triggered' };
  const base = SEVERITY_SCORE[impact.severity];
  const score = impact.basis === 'confirmed' ? base : Math.round(base * 0.7);
  const basisLabel = impact.basis === 'confirmed' ? 'Confirmed' : 'Inferred';
  return { score, detail: `${basisLabel}, ${impact.severity} severity` };
}

// Momentum: a durable, all-week-one-direction trend on the driver behind
// this opportunity (see lib/momentum.ts) is a stronger reason to act now
// than a choppy one. An opportunity with no tracked theme, or no driver at
// all, gets a neutral baseline — momentum simply doesn't apply to it.
function momentumScore(opp: Opportunity): { score: number; detail: string } {
  if (!opp.driverId) return { score: 60, detail: 'No tracked driver' };
  const theme = MOMENTUM_THEMES[opp.driverId];
  if (!theme) return { score: 60, detail: 'No tracked driver' };
  if (momentumLevel(theme) === 'high') {
    return { score: 100, detail: `${theme.days.length}/${theme.days.length} days one direction` };
  }
  const flips = flipCount(theme);
  return { score: 40, detail: `${flips} reversal${flips === 1 ? '' : 's'} this week` };
}

// Conviction: how many distinct pieces of news mention an impact on this
// client — corroboration, not just a single unconfirmed read. An
// internally-triggered opportunity is its own single source of truth.
function convictionScoreAndCount(opp: Opportunity): { score: number; count: number; detail: string } {
  if (!opp.driverId) return { score: 50, count: 1, detail: '1 piece of news' };
  const count = newsItems().filter(i => i.impacts.some(im => im.clientId === opp.clientId)).length;
  return { score: Math.min(100, count * 50), count, detail: `${count} piece${count === 1 ? '' : 's'} of news` };
}

export function signalBreakdown(opp: Opportunity): SignalBreakdown {
  const urgency = urgencyScore(opp.daysToAct);
  const relevancy = relevancyScore(opp);
  const momentum = momentumScore(opp);
  const conviction = convictionScoreAndCount(opp);
  const score = Math.round((urgency.score + relevancy.score + momentum.score + conviction.score) / 4);
  return {
    score,
    level: levelFor(score),
    urgency: { score: urgency.score, level: levelFor(urgency.score), detail: urgency.detail },
    relevancy: { score: relevancy.score, level: levelFor(relevancy.score), detail: relevancy.detail },
    momentum: { score: momentum.score, level: levelFor(momentum.score), detail: momentum.detail },
    conviction: { score: conviction.score, level: levelFor(conviction.score), count: conviction.count, detail: conviction.detail },
  };
}

export function signalScore(opp: Opportunity): number {
  return signalBreakdown(opp).score;
}
