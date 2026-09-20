import type { Driver, NewsImpact } from '../types';
import { DRIVERS } from '../state';
import { impactsForDriver } from './news';

export interface IntakeResult {
  headline: string;       // the text RIN actually read
  source: string | null;  // the link's hostname when the input was a URL, else null
  driver: Driver | null;  // null = RIN couldn't tie it to anything the book holds
  impacts: NewsImpact[];  // empty when driver is null
  brief: string;          // RIN's reply, ready to render
}

// Term lists per driver. Each pattern is case-insensitive and word-bounded so
// "rate" never matches "corporate". The driver with the most hits wins; on a
// tie the one listed first wins, so the narrower stories sit above the broad
// "rates" one.
const TERMS: [string, RegExp[]][] = [
  ['sector-semis', [/\bsemiconductors?\b/i, /\bfoundry\b/i, /\bwafers?\b/i, /\bchips?\b/i, /\bchipmakers?\b/i]],
  ['reit-rerating', [/\bs-?reits?\b/i, /\breal estate investment trusts?\b/i]],
  ['ig-credit-spread-widening', [/\bcredit spreads?\b/i, /\bspreads? widen\w*\b/i, /\binvestment[- ]grade\b/i, /\bcorporate bonds?\b/i, /\brisk-off\b/i]],
  ['par-fund-bonus-trim', [/\binsurers?\b/i, /\bparticipating\b/i, /\bpar fund\b/i, /\bbonus rates?\b/i, /\bendowments?\b/i, /\buniversal life\b/i]],
  ['usd-mmf-yield', [/\bmoney[- ]market\b/i, /\bfed\b/i, /\bt-?bills?\b/i, /\busd yields?\b/i]],
  ['cross-border-fx-vol', [/\bfx\b/i, /\bcurrency\b/i, /\bcurrencies\b/i, /\bforex\b/i, /\bvolatility\b/i, /\bhedging\b/i, /\b(?:vnd|idr|myr|thb)\b/i]],
  ['rate-cut', [/\bsora\b/i, /\bmas\b/i, /\brate cuts?\b/i, /\brates? (?:to )?ease\b/i, /\beasing\b/i, /\blower rates\b/i, /\bmonetary policy\b/i, /\binflation cools?\b/i, /\bdovish\b/i]],
];

const NOTHING_FOUND =
  "I couldn't tie that to anything your clients hold. I can read stories about SGD rates, REITs, credit spreads, FX moves, insurer bonus rates, and the semiconductor sector.";

// A link can't be fetched from the browser (no backend, CORS), but news URLs
// carry the headline in their last path segment. Strip the extension, any long
// numeric article id, and turn hyphens back into spaces.
export function headlineFromInput(raw: string): { headline: string; source: string | null } {
  const text = raw.trim();
  if (!/^https?:\/\//i.test(text)) return { headline: text, source: null };
  try {
    const url = new URL(text);
    const segments = url.pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1] ?? '';
    const words = decodeURIComponent(last)
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/[-_]+/g, ' ')
      .replace(/\b\d{4,}\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return { headline: words || url.hostname, source: url.hostname.replace(/^www\./, '') };
  } catch {
    return { headline: text, source: null };
  }
}

export function classifyHeadline(headline: string): Driver | null {
  let best: { id: string; score: number } | null = null;
  for (const [id, patterns] of TERMS) {
    const score = patterns.filter(p => p.test(headline)).length;
    if (score > 0 && (!best || score > best.score)) best = { id, score };
  }
  return best ? DRIVERS[best.id] : null;
}

// The desk note's first sentence, without its "Desk note (date):" prefix.
function firstSentence(detail: string): string {
  const plain = detail.replace(/^Desk note \([^)]*\):\s*/, '');
  const m = plain.match(/^[^.]*\./);
  return m ? m[0] : plain;
}

export function briefFor(driver: Driver | null, impacts: NewsImpact[]): string {
  if (!driver) return NOTHING_FOUND;
  const confirmed = impacts.filter(i => i.basis === 'confirmed').length;
  const inferred = impacts.length - confirmed;
  const parts = [
    confirmed ? `${confirmed} confirmed against an open opportunity` : '',
    inferred ? `${inferred} inferred from what they hold` : '',
  ].filter(Boolean);
  const touches = impacts.length
    ? `Touches ${impacts.length} of your clients — ${parts.join(', ')}.`
    : 'None of your clients look exposed to it.';
  return `Reads as: ${driver.label}. ${firstSentence(driver.detail)} ${touches}`;
}

export function intake(raw: string, clientIds: Set<string>): IntakeResult {
  const { headline, source } = headlineFromInput(raw);
  const driver = classifyHeadline(headline);
  const impacts = driver ? impactsForDriver(driver.id, clientIds) : [];
  return { headline, source, driver, impacts, brief: briefFor(driver, impacts) };
}
