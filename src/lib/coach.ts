import type { Client, CoachCheck } from '../types';
import { fmt } from './format';

// Common English function words — articles, pronouns, prepositions,
// conjunctions. Virtually every grammatical English sentence contains at
// least one; keyboard-mashed gibberish essentially never does by chance,
// which makes this a much sharper gibberish signal than "contains a vowel".
const COMMON_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'to', 'of', 'in', 'on', 'at', 'for', 'and', 'or', 'but', 'with', 'as',
  'by', 'from', 'about', 'up', 'down', 'out', 'if', 'so', 'not', 'no', 'yes',
  'i', 'you', 'your', 'we', 'our', 'us', 'my', 'me', 'he', 'she', 'him',
  'her', 'his', 'they', 'them', 'their', 'it', 'its', 'this', 'that',
  'have', 'has', 'had', 'will', 'would', 'can', 'could', 'should', 'do',
  'does', 'did', 'just', 'hi', 'hello', 'dear', 'please', 'thanks', 'thank',
]);

// A "word" is word-shaped if it's short (articles/pronouns), or has at
// least one vowel without an implausible run of consonants or vowels —
// English words essentially never have 5+ consonants or 4+ vowels in a row.
function looksLikeWord(w: string): boolean {
  const lw = w.toLowerCase();
  if (lw.length <= 2) return true;
  if (!/[aeiou]/.test(lw)) return false;
  if (/[^aeiou]{5,}/.test(lw)) return false;
  if (/[aeiou]{4,}/.test(lw)) return false;
  return true;
}

// Rejects text that isn't real, sendable prose: empty/too-short drafts, or
// strings of characters that don't resemble actual English sentences
// (keyboard mashes, random gibberish).
function isGibberish(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 10) return true;
  const words = trimmed.match(/[A-Za-z']+/g) || [];
  if (words.length < 3) return true;
  if (!words.some(w => COMMON_WORDS.has(w.toLowerCase()))) return true;
  const wordShaped = words.filter(looksLikeWord);
  return wordShaped.length / words.length < 0.7;
}

export function runCoachChecks(client: Client, text: string): CoachCheck[] {
  const trueAmount = client.holdings[0].value;
  const trueSrc = client.holdings[0].source;
  const results: CoachCheck[] = [];

  const gibberish = isGibberish(text);
  results.push({
    rule: 'Draft is real, sendable content',
    status: gibberish ? 'fail' : 'pass',
    detail: gibberish
      ? "This doesn't read as an actual client message (too short, or not recognisable words). Write the message you intend to send before it can be checked."
      : 'Draft reads as real prose addressed to the client.',
  });

  if (gibberish) {
    return results;
  }

  const amounts = [...text.matchAll(/SGD\s?([\d,]{4,})/gi)].map(m => parseInt(m[1].replace(/,/g, ''), 10));
  const badAmount = amounts.find(a => a !== trueAmount);
  results.push({
    rule: 'Fact trace',
    status: badAmount ? 'fail' : 'pass',
    detail: badAmount
      ? `Draft states SGD ${badAmount.toLocaleString()}. The client record shows ${fmt(trueAmount)} for ${client.holdings[0].label} (source: ${trueSrc}). Figures in an RM message must trace to a record.`
      : `Every SGD figure in the draft matches a record the RM is licensed to see (source: ${trueSrc}).`,
  });

  const featureFirst = /great rate|don't miss|limited time|act now|best deal/i.test(text);
  results.push({
    rule: 'States circumstance, not a feature',
    status: featureFirst ? 'flag' : 'pass',
    detail: featureFirst
      ? 'Phrasing reads as a product pitch ("great rates", "don\'t miss") rather than the client\'s own circumstance. Lead with what is happening on their account, not the offer.'
      : 'Message is framed around the client\'s own position rather than a generic offer.',
  });

  const advises = /i('| )?d? recommend|you should (invest|buy|move|switch)|the best option for you/i.test(text);
  results.push({
    rule: "Stays within the RM's licence to inform",
    status: advises ? 'fail' : 'pass',
    detail: advises
      ? 'Contains language that reads as personal advice ("recommend", "you should"). The RM is licensed to inform, not to advise — leave the recommendation to the specialist conversation.'
      : 'No advice-shaped language detected; the message informs rather than recommends.',
  });

  const hasDisclosure = /not (financial|investment) advice|indicative only|subject to (suitability|change)/i.test(text);
  results.push({
    rule: 'Required disclosure present',
    status: hasDisclosure ? 'pass' : 'flag',
    detail: hasDisclosure
      ? 'A disclosure line is present.'
      : 'No disclosure line detected. Add a line making clear this is not financial advice and rates/terms are indicative and subject to change.',
  });

  const casual = /\bhey\b|!{2,}|lol/i.test(text);
  results.push({
    rule: 'Register matches relationship tier',
    status: casual && client.tier === 'Signature' ? 'flag' : 'pass',
    detail: casual && client.tier === 'Signature'
      ? `Tone reads as casual for a ${client.tier} relationship. Match the formality the client is used to.`
      : "Tone is consistent with this client's relationship tier.",
  });

  return results;
}

export function suggestRewrite(client: Client, text: string): string {
  const trueAmount = client.holdings[0].value;
  let out = text.replace(/SGD\s?[\d,]{4,}/gi, fmt(trueAmount));
  out = out
    .replace(/great rate[s]?/gi, 'a rate that may not hold')
    .replace(/don'?t miss (this|it)/gi, 'worth reviewing before the renewal date')
    .replace(/act now!?/gi, '')
    .replace(/limited time/gi, '');
  out = out
    .replace(/i('| )?d? recommend/gi, 'wanted to flag')
    .replace(/you should (invest|buy|move|switch)/gi, 'you may want to discuss whether to $1');
  if (!/not (financial|investment) advice|indicative only/i.test(out)) {
    out = out.trim() + '\n\nThis message is for information only and is not financial advice. Rates and terms are indicative and subject to change and to suitability review.';
  }
  return out;
}
