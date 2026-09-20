import { useEffect, useMemo, useRef, useState } from 'react';
import type { Action, AppState } from '../state';
import { MY_CLIENT_IDS, CLIENTS } from '../state';
import type { CoachCheck } from '../types';
import { OPPS, blockedClientIds, rankedOpps } from '../lib/queue';
import { newsByClient } from '../lib/news';
import { runCoachChecks } from '../lib/coach';
import { NOW_TS } from '../lib/format';
import {
  DEFAULT_SPEC, applyIntent, parseIntent, renderDraft, replyFor, openingMessage,
  specialistOpeningMessage, clarifyOpeningMessage, checkFailureMessage, sentMessage, effectiveApproach, type Intent,
} from '../lib/assistant';
import type { Approach } from '../types';
import { cn } from '../lib/cn';
import { Button } from './ui/Button';
import { Pill } from './ui/Pill';
import { Modal } from './ui/Modal';

const CHIPS: { id: string; label: string; intent: Intent }[] = [
  { id: 'formal', label: 'More formal', intent: 'formal' },
  { id: 'casual', label: 'More casual', intent: 'casual' },
  { id: 'shorter', label: 'Shorter', intent: 'shorter' },
  { id: 'figures', label: 'Add the figures', intent: 'figures' },
  { id: 'reset', label: 'Start over', intent: 'reset' },
];

const TYPES: { id: string; approach: Approach; intent: Intent; label: string }[] = [
  { id: 'notify', approach: 'Notify', intent: 'notify', label: 'Make it a heads-up' },
  { id: 'contextualise', approach: 'Contextualise', intent: 'contextualise', label: 'Explain the news' },
  { id: 'review', approach: 'Review', intent: 'review', label: 'Make it a review' },
];

const REPLY_DELAY_MS = 600;
const STREAM_TICK_MS = 30;

// A reply streams in over 400–1200ms regardless of length, so short replies feel
// typed and long ones (the check-failure message) never drag.
function streamDurationMs(text: string): number {
  return Math.max(400, Math.min(1200, text.length * 8));
}

export function OutreachView({ state, dispatch }: { state: AppState; dispatch: (a: Action) => void }) {
  const clientId = state.outreachClientId;
  const c = CLIENTS[clientId];
  const opp = OPPS.find(o => o.clientId === clientId);
  const spec = state.specByClient[clientId] ?? DEFAULT_SPEC;
  const text = state.draftByClient[clientId] ?? (opp ? renderDraft(c, opp, spec) : '');
  const chat = state.chatByClient[clientId] ?? [];
  const first = c.name.split(' ')[0];

  const ledgerForClient = state.ledger.filter(l => l.clientId === clientId);
  const blocked = blockedClientIds(MY_CLIENT_IDS);
  // Outreach is for clients there's a reason to write to today: those with a
  // surfaced opportunity (queue order first) and those the news reaches.
  const reachable = useMemo(() => {
    const ids: string[] = [];
    for (const o of rankedOpps({}, {}, MY_CLIENT_IDS)) if (!ids.includes(o.clientId)) ids.push(o.clientId);
    for (const g of newsByClient(MY_CLIENT_IDS)) if (!ids.includes(g.client.id)) ids.push(g.client.id);
    return ids.filter(id => !blocked.has(id));
  }, []);
  const selectableClients = reachable.map(id => CLIENTS[id]);

  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState<CoachCheck[] | null>(null);
  const [stream, setStream] = useState<{ index: number; shown: number } | null>(null);
  const [draftVersion, setDraftVersion] = useState(0);
  const [nonSendOpen, setNonSendOpen] = useState(false);
  const [nonSendReason, setNonSendReason] = useState('Client travelling this week');
  const replyTimer = useRef<number | null>(null);
  const streamTimer = useRef<number | null>(null);
  const threadEnd = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const streaming = stream !== null;
  const busy = typing || streaming;

  useEffect(() => {
    if (chat.length === 0) {
      const specialistReply = opp ? state.specialistReplies[opp.id] : undefined;
      const callOutcome = opp ? state.callOutcomes[opp.id] : undefined;
      const opening = specialistReply
        ? specialistOpeningMessage(c, specialistReply)
        : callOutcome
        ? clarifyOpeningMessage(c, callOutcome)
        : openingMessage(c, opp);
      dispatch({ type: 'CHAT_APPEND', clientId, message: { role: 'rin', text: opening } });
    }
  }, [clientId]);

  useEffect(() => {
    threadEnd.current?.scrollIntoView({ block: 'nearest' });
  }, [chat.length, typing, stream?.shown]);

  useEffect(() => () => {
    if (replyTimer.current) window.clearTimeout(replyTimer.current);
    if (streamTimer.current) window.clearInterval(streamTimer.current);
  }, []);

  function streamIn(index: number, fullText: string) {
    if (streamTimer.current) window.clearInterval(streamTimer.current);
    const total = fullText.length;
    const perTick = Math.max(1, Math.ceil(total / (streamDurationMs(fullText) / STREAM_TICK_MS)));
    let shown = 0;
    setStream({ index, shown: 0 });
    streamTimer.current = window.setInterval(() => {
      shown = Math.min(total, shown + perTick);
      setStream({ index, shown });
      if (shown >= total) {
        if (streamTimer.current) window.clearInterval(streamTimer.current);
        streamTimer.current = null;
        setStream(null);
      }
    }, STREAM_TICK_MS);
  }

  // RIN pauses (typing dots), then its reply lands in the thread and streams in.
  // `index` is where the reply will sit, so the streaming state can find it.
  function rinReplies(index: number, reply: string, applyChange?: () => void) {
    setTyping(true);
    replyTimer.current = window.setTimeout(() => {
      applyChange?.();
      dispatch({ type: 'CHAT_APPEND', clientId, message: { role: 'rin', text: reply } });
      setTyping(false);
      streamIn(index, reply);
    }, REPLY_DELAY_MS);
  }

  function ask(userText: string, intentOverride?: Intent) {
    if (!userText.trim() || busy) return;
    dispatch({ type: 'CHAT_APPEND', clientId, message: { role: 'rm', text: userText } });
    setPending(null);
    const intent = intentOverride ?? parseIntent(userText);
    rinReplies(chat.length + 1, replyFor(intent, c), () => {
      if (intent && opp) {
        const next = applyIntent(spec, intent);
        dispatch({ type: 'SET_DRAFT_SPEC', clientId, spec: next });
        dispatch({ type: 'DRAFT_SET_TEXT', clientId, text: renderDraft(c, opp, next) });
        setDraftVersion(v => v + 1);
      }
    });
  }

  function commitSend(approach: string) {
    const ref = 'ARC-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    dispatch({
      type: 'OUTREACH_SEND',
      entry: { ts: NOW_TS, clientId, kind: 'Sent', detail: `${approach} message sent`, ref: 'Archived Client Comms · ' + ref },
    });
    setPending(null);
    rinReplies(chat.length, sentMessage(c, ref));
  }

  function send() {
    if (!opp || busy) return;
    const checks = runCoachChecks(c, text);
    if (checks.every(k => k.status === 'pass')) {
      commitSend(effectiveApproach(opp, spec));
      return;
    }
    setPending(checks);
    rinReplies(chat.length, checkFailureMessage(checks));
  }

  function switchClient(id: string) {
    if (replyTimer.current) window.clearTimeout(replyTimer.current);
    if (streamTimer.current) window.clearInterval(streamTimer.current);
    setTyping(false);
    setStream(null);
    setPending(null);
    setInput('');
    dispatch({ type: 'SET_OUTREACH_CLIENT', id });
  }

  const canSendAnyway = pending !== null && pending.every(k => k.status !== 'fail');
  const status = typing ? 'Thinking' : streaming ? 'Replying' : 'Ready';
  const approach = opp ? effectiveApproach(opp, spec) : null;

  return (
    <div>
      <div className="t-display mb-1">Outreach</div>
      <div className="t-lead mb-5">
        Tell RIN how you want the note to sound. RIN checks it against {c.name}'s records before you send, and
        keeps a record of what you decided.
      </div>

      <select
        id="outreach-client-select"
        className="appearance-none rounded-full border border-hairline-2 bg-white pl-4 pr-9 py-2 text-[14px] font-semibold text-ink mb-4 bg-no-repeat bg-[right_0.9rem_center] bg-[length:12px_12px] bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22%234A5560%22><path d=%22M5.5 7.5l4.5 4.5 4.5-4.5%22 stroke=%22%234A5560%22 stroke-width=%222%22 fill=%22none%22 stroke-linecap=%22round%22/></svg>')] hover:border-ink-3 transition-colors"
        value={clientId}
        onChange={e => switchClient(e.target.value)}
      >
        {selectableClients.map(cc => <option key={cc.id} value={cc.id}>{cc.name}</option>)}
      </select>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        {/* ---- chat ---- */}
        <div className="mesh-red !p-0 flex flex-col overflow-hidden" data-testid="chat-panel">
          <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-red/10">
            <div className="rin-orb w-9 h-9 text-[11px]" data-state={busy ? 'thinking' : 'idle'}>RIN</div>
            <div className="min-w-0">
              <div className="t-h3 leading-none">RIN</div>
              <div className="t-meta mt-0.5 flex items-center gap-1.5">
                <span className={cn('w-1.5 h-1.5 rounded-full inline-block', busy ? 'bg-red animate-pulse' : 'bg-green')} />
                {status} · drafting for {first}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[460px] px-5 py-4 space-y-3" data-testid="chat-thread">
            {chat.map((m, i) => {
              const isStreaming = stream !== null && stream.index === i;
              const shownText = isStreaming ? m.text.slice(0, stream.shown) : m.text;
              return m.role === 'rin' ? (
                <div key={i} data-testid="chat-msg-rin" data-streaming={isStreaming ? 'true' : undefined} className="bubble-in flex gap-2.5 items-end">
                  <div className="rin-orb w-6 h-6 text-[8px] !animate-none shadow-glow-sm">R</div>
                  <div className={cn(
                    'bg-white border border-red/10 rounded-2xl rounded-bl-sm px-4 py-2.5 text-[14px] leading-relaxed text-ink-2 whitespace-pre-wrap max-w-[86%] shadow-glass',
                    isStreaming && 'stream-caret'
                  )}>{shownText}</div>
                </div>
              ) : (
                <div key={i} data-testid="chat-msg-rm" className="bubble-in flex justify-end">
                  <div className="bg-slate text-white rounded-2xl rounded-br-sm px-4 py-2.5 text-[14px] leading-relaxed max-w-[86%]">{m.text}</div>
                </div>
              );
            })}
            {typing && (
              <div data-testid="chat-typing" className="bubble-in flex gap-2.5 items-end">
                <div className="rin-orb w-6 h-6 text-[8px] !animate-none shadow-glow-sm">R</div>
                <div className="bg-white border border-red/10 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5 items-center shadow-glass">
                  <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
                </div>
              </div>
            )}
            <div ref={threadEnd} />
          </div>

          <div className="px-5 pb-4 pt-2 border-t border-red/10">
            <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible mb-2" data-testid="type-chips">
              <span className="t-micro mr-1 flex-none">Email type</span>
              {TYPES.map(t => (
                <Button
                  key={t.id}
                  data-testid={`chip-${t.id}`}
                  size="sm"
                  variant={approach === t.approach ? 'primary' : 'default'}
                  disabled={busy || !opp}
                  onClick={() => ask(t.label, t.intent)}
                  className="flex-none"
                >
                  {t.approach}
                </Button>
              ))}
            </div>
            <div className="flex gap-1.5 flex-nowrap overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible mb-3">
              {pending ? (
                <>
                  <Button data-testid="chip-fix" size="sm" variant="primary" disabled={busy} onClick={() => ask('Fix it for me', 'fix')} className="flex-none">
                    Fix it for me
                  </Button>
                  {canSendAnyway && opp && (
                    <Button data-testid="chip-send-anyway" size="sm" disabled={busy} onClick={() => commitSend(effectiveApproach(opp, spec))} className="flex-none">
                      Send anyway
                    </Button>
                  )}
                </>
              ) : (
                CHIPS.map(ch => (
                  <Button key={ch.id} data-testid={`chip-${ch.id}`} size="sm" disabled={busy || !opp} onClick={() => ask(ch.label, ch.intent)} className="flex-none">
                    {ch.label}
                  </Button>
                ))
              )}
            </div>

            <form
              className="flex items-center gap-2 bg-white border border-hairline-2 rounded-full pl-4 pr-1.5 py-1.5 focus-within:border-red/40 focus-within:shadow-glow-sm transition-shadow"
              onSubmit={e => { e.preventDefault(); const t = input; setInput(''); ask(t); inputRef.current?.focus(); }}
            >
              <input
                id="chat-input"
                ref={inputRef}
                className="flex-1 min-w-0 bg-transparent text-[14px] outline-none placeholder:text-ink-3"
                placeholder={busy ? 'RIN is replying…' : `Tell RIN how to change the note to ${first}…`}
                value={input}
                onChange={e => setInput(e.target.value)}
                disabled={busy}
              />
              <button
                type="submit"
                aria-label="Ask RIN"
                disabled={busy || !input.trim()}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-red to-red-deep text-white flex items-center justify-center flex-none shadow-glow-sm disabled:opacity-40 disabled:shadow-none transition-opacity"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 19V5" /><path d="m5 12 7-7 7 7" />
                </svg>
              </button>
            </form>
          </div>
        </div>

        {/* ---- draft ---- */}
        <div className="glass p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="t-micro">Draft · {c.name}</div>
              {approach && <Pill variant="neutral" data-testid="draft-type">{approach}</Pill>}
            </div>
            <div className="t-meta flex items-center gap-1.5">
              <span className={cn('w-1.5 h-1.5 rounded-full inline-block', busy ? 'bg-red animate-pulse' : 'bg-green')} />
              Live draft
            </div>
          </div>
          <div key={draftVersion} className={cn('rounded-xl', draftVersion > 0 && 'flash-red')}>
            <textarea
              id="outreach-text"
              className="w-full border border-hairline-2 rounded-xl p-3.5 text-[14.5px] leading-relaxed min-h-[360px] font-sans bg-white focus:border-red/40 outline-none"
              value={text}
              onChange={e => dispatch({ type: 'DRAFT_SET_TEXT', clientId, text: e.target.value })}
            />
          </div>
          <div className="flex gap-2 flex-wrap mt-3">
            <Button data-act="outreach-send" variant="red" size="sm" disabled={!opp || busy} onClick={send}>
              Send to {first}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setNonSendReason('Client travelling this week'); setNonSendOpen(true); }}>
              Skip, and say why
            </Button>
          </div>
          {!opp && (
            <div className="t-meta mt-2.5">
              No active opportunity for this client today — sending is tied to a surfaced opportunity.
            </div>
          )}
        </div>
      </div>

      <div className="glass p-5">
        <div className="t-h3 mb-2">What you decided — {c.name}</div>
        {ledgerForClient.length ? (
          <table className="w-full text-[13.5px] border-collapse">
            <thead>
              <tr>
                {['When', 'Kind', 'Detail', 'Reference'].map(h => (
                  <th key={h} className="text-left t-micro pb-1.5 border-b border-hairline-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ledgerForClient.map((l, i) => (
                <tr key={i}>
                  <td className="py-2 border-b border-hairline">{l.ts}</td>
                  <td className="py-2 border-b border-hairline">{l.kind}</td>
                  <td className="py-2 border-b border-hairline">{l.detail}</td>
                  <td className="py-2 border-b border-hairline src">{l.ref || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="t-meta">Nothing here yet. Once you send or skip a note to {first}, it shows up here.</div>
        )}
      </div>

      <Modal
        open={nonSendOpen}
        title="Log a non-send"
        confirmLabel="Log it"
        onConfirm={() => {
          dispatch({ type: 'OUTREACH_NOSEND', entry: { ts: NOW_TS, clientId, kind: 'Non-send', detail: nonSendReason.trim() || 'No reason given', ref: null } });
          setNonSendOpen(false);
        }}
        onClose={() => setNonSendOpen(false)}
      >
        <div className="t-meta mb-2">Recorded in the outcome ledger for {c.name}.</div>
        <textarea
          className="w-full border border-hairline-2 rounded-xl p-3 text-[14px] leading-relaxed min-h-[80px] font-sans"
          value={nonSendReason}
          onChange={e => setNonSendReason(e.target.value)}
        />
      </Modal>
    </div>
  );
}
