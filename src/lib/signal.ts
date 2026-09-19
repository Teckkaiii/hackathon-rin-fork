import type { Opportunity } from '../types';
import { newsItems } from './news';
import { MOMENTUM_THEMES, momentumLevel } from './momentum';

export type SignalLevel = 'high' | 'medium' | 'low';

export interface SignalDimension {
  score: number;
  level: SignalLevel;
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
function urgencyScore(daysToAct: number): number {
  return Math.round(Math.max(0, Math.min(100, 100 - (daysToAct - 3) * (100 / 27))));
}

// Relevancy: how directly the underlying news actually touches this client's
// portfolio, not just how big or urgent the resulting opportunity is. An
// internally-triggered opportunity (idle cash, income gap, contractual
// maturity — no external driver) is by definition about the portfolio
// itself, so it scores maximally relevant. An externally-driven one inherits
// the same confirmed/inferred impact severity shown in the News tab, with
// an inferred (unreviewed) match discounted relative to a confirmed one.
function relevancyScore(opp: Opportunity): number {
  if (!opp.driverId) return 100;
  const item = newsItems().find(i => i.id === opp.driverId);
  const impact = item?.impacts.find(i => i.clientId === opp.clientId);
  if (!impact) return 100;
  const base = SEVERITY_SCORE[impact.severity];
  return impact.basis === 'confirmed' ? base : Math.round(base * 0.7);
}

// Momentum: a durable, all-week-one-direction trend on the driver behind
// this opportunity (see lib/momentum.ts) is a stronger reason to act now
// than a choppy one. An opportunity with no tracked theme, or no driver at
// all, gets a neutral baseline — momentum simply doesn't apply to it.
function momentumScore(opp: Opportunity): number {
  if (!opp.driverId) return 60;
  const theme = MOMENTUM_THEMES[opp.driverId];
  if (!theme) return 60;
  return momentumLevel(theme) === 'high' ? 100 : 40;
}

// Conviction: how many distinct pieces of news mention an impact on this
// client — corroboration, not just a single unconfirmed read. An
// internally-triggered opportunity is its own single source of truth.
function convictionScoreAndCount(opp: Opportunity): { score: number; count: number } {
  if (!opp.driverId) return { score: 50, count: 1 };
  const count = newsItems().filter(i => i.impacts.some(im => im.clientId === opp.clientId)).length;
  return { score: Math.min(100, count * 50), count };
}

export function signalBreakdown(opp: Opportunity): SignalBreakdown {
  const urgency = urgencyScore(opp.daysToAct);
  const relevancy = relevancyScore(opp);
  const momentum = momentumScore(opp);
  const { score: convictionScore, count } = convictionScoreAndCount(opp);
  const score = Math.round((urgency + relevancy + momentum + convictionScore) / 4);
  return {
    score,
    level: levelFor(score),
    urgency: { score: urgency, level: levelFor(urgency) },
    relevancy: { score: relevancy, level: levelFor(relevancy) },
    momentum: { score: momentum, level: levelFor(momentum) },
    conviction: { score: convictionScore, level: levelFor(convictionScore), count },
  };
}

export function signalScore(opp: Opportunity): number {
  return signalBreakdown(opp).score;
}
