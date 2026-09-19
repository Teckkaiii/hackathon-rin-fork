import type { Client, CoachCheck, Opportunity } from '../types';
import { fmt } from './format';

export type Tone = 'formal' | 'neutral' | 'casual';
export type Length = 'short' | 'full';

export interface DraftSpec {
  tone: Tone;
  length: Length;
  figures: boolean;
  cta: boolean;
}

export const DEFAULT_SPEC: DraftSpec = { tone: 'neutral', length: 'full', figures: false, cta: true };

export type Intent = 'formal' | 'casual' | 'shorter' | 'longer' | 'figures' | 'cta' | 'reset' | 'fix';

export interface ChatMessage {
  role: 'rin' | 'rm';
  text: string;
}

const DISCLOSURE = 'This message is for information only and is not financial advice.';

// First match wins, so the more specific intents sit above the broader ones.
const INTENT_PATTERNS: [Intent, RegExp][] = [
  ['reset', /\b(start over|reset|from scratch)\b/i],
  ['fix', /\b(fix|clean it up|clean up|correct)\b/i],
  ['formal', /\b(formal|professional|polite)\b/i],
  ['casual', /\b(casual|friendly|relaxed|warm|informal)\b/i],
  ['shorter', /\b(short|shorter|brief|concise|trim)\b/i],
  ['longer', /\b(longer|more detail|expand)\b/i],
  ['figures', /\b(figure|figures|number|numbers|amount|rate|details)\b/i],
  ['cta', /\b(call|meeting|catch up)\b/i],
];

export function parseIntent(text: string): Intent | null {
  for (const [intent, re] of INTENT_PATTERNS) {
    if (re.test(text)) return intent;
  }
  return null;
}

export function applyIntent(spec: DraftSpec, intent: Intent): DraftSpec {
  switch (intent) {
    case 'formal': return { ...spec, tone: 'formal' };
    case 'casual': return { ...spec, tone: 'casual' };
    case 'shorter': return { ...spec, length: 'short' };
    case 'longer': return { ...spec, length: 'full', figures: true };
    case 'figures': return { ...spec, length: 'full', figures: true };
    case 'cta': return { ...spec, cta: true };
    case 'reset': return { ...DEFAULT_SPEC };
    case 'fix': return spec;
  }
}

function firstName(client: Client): string {
  return client.name.split(' ')[0];
}

// Lower-case a label for use mid-sentence without flattening acronyms:
// "SGD Fixed Deposit" -> "SGD fixed deposit".
function softLower(s: string): string {
  return s.split(' ').map(w => (/^[A-Z]{2,}$/.test(w) ? w : w.toLowerCase())).join(' ');
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function approachLine(client: Client, opp: Opportunity): string {
  const h = client.holdings[0];
  switch (opp.approach) {
    case 'Notify':
      return `your ${softLower(h.label)} of ${fmt(h.value)} comes up for renewal within the next ${opp.daysToAct} days, and there is a rate change expected before then that is worth knowing about.`;
    case 'Contextualise':
      return `something in today's market news touches a position you hold — your ${softLower(h.label)} of ${fmt(h.value)} — and I wanted you to hear it from me first.`;
    case 'Review':
      return 'when we last reviewed your portfolio we set an objective together, and the latest figures suggest it has drifted. I think it is worth a short review.';
  }
}

function openingLine(client: Client, opp: Opportunity, tone: Tone): string {
  const lead = tone === 'casual' ? 'Quick one — ' : '';
  return capitalise(lead + approachLine(client, opp));
}

export function renderDraft(client: Client, opp: Opportunity, spec: DraftSpec): string {
  const first = firstName(client);
  const h = client.holdings[0];

  const greeting =
    spec.tone === 'formal' ? `Dear ${client.name},` :
    spec.tone === 'casual' ? `Hi ${first}, hope you're well!` :
    `Hi ${first},`;

  const opening = openingLine(client, opp, spec.tone);

  const figures = spec.figures && spec.length === 'full'
    ? `For reference: ${h.label}, ${fmt(h.value)} — ${h.note}.`
    : '';

  const cta = !spec.cta ? '' :
    spec.tone === 'formal' ? 'Would you have fifteen minutes this week for a short call?' :
    spec.tone === 'casual' ? 'Got fifteen minutes this week for a quick call?' :
    'Worth a short call this week if you have fifteen minutes.';

  const signoff =
    spec.tone === 'formal' ? 'Kind regards,\nAisha Rahman' :
    spec.tone === 'casual' ? 'Cheers,\nAisha' :
    'Best,\nAisha';

  const body = [opening, figures, cta].filter(Boolean).join('\n\n');
  return `${greeting}\n\n${body}\n\n${signoff}\n\n${DISCLOSURE}`;
}

export function openingMessage(client: Client, opp: Opportunity | undefined): string {
  const first = firstName(client);
  if (!opp) {
    return `There's no active opportunity for ${first} today. You can still write a note on the right and I'll check it before it goes.`;
  }
  return `I've drafted a note to ${first} — ${softLower(opp.signal.headline)}. Want it more formal, more casual, shorter, or with the figures from the record?`;
}

export function replyFor(intent: Intent | null, client: Client): string {
  const first = firstName(client);
  const h = client.holdings[0];
  switch (intent) {
    case 'formal':
      return "Done — I've made it more formal: full name in the greeting, no contractions, and a proper sign-off. Take a look on the right.";
    case 'casual':
      return 'Loosened it up — friendlier greeting, lighter phrasing. Still no advice language, so it stays inside your licence.';
    case 'shorter':
      return "Trimmed it to the essentials: what's happening, the ask, and the disclosure.";
    case 'longer':
      return `Expanded it with the figures from ${first}'s record so the note stands on its own.`;
    case 'figures':
      return `Added the figures straight from ${first}'s record — ${fmt(h.value)}, ${h.note}. Every number traces to a source.`;
    case 'cta':
      return 'Added a clear ask for a short call at the end.';
    case 'reset':
      return `Back to a fresh draft for ${first}.`;
    case 'fix':
      return `Rewritten from ${first}'s record — every figure now traces to a source and the advice language is gone.`;
    default:
      return `I can adjust the tone (more formal or more casual), the length, or pull the figures from ${first}'s record into the note. Which would you like?`;
  }
}

export function checkFailureMessage(checks: CoachCheck[]): string {
  const problems = checks.filter(k => k.status !== 'pass');
  const blocking = problems.some(k => k.status === 'fail');
  const lines = problems.map(k => `• ${k.rule}: ${k.detail}`).join('\n');
  const opener = blocking
    ? "I can't send this yet — here's what I found:"
    : 'Before this goes, one thing to note:';
  return `${opener}\n${lines}\n\nSay "fix it" and I'll rewrite it from the record, or edit the draft on the right.`;
}

export function sentMessage(client: Client, ref: string): string {
  return `Sent to ${firstName(client)} and archived as ${ref}. I've logged it in the outcome ledger.`;
}
