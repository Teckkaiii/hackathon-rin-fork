import { useEffect, useRef, useState } from 'react';
import type { Action, AppState } from '../state';
import { MY_CLIENTS, MY_CLIENT_IDS, CLIENTS } from '../state';
import type { CoachCheck } from '../types';
import { OPPS, blockedClientIds } from '../lib/queue';
import { runCoachChecks } from '../lib/coach';
import {
  DEFAULT_SPEC, applyIntent, parseIntent, renderDraft, replyFor, openingMessage,
  checkFailureMessage, sentMessage, type Intent,
} from '../lib/assistant';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';

const CHIPS: { id: string; label: string; intent: Intent }[] = [
  { id: 'formal', label: 'More formal', intent: 'formal' },
  { id: 'casual', label: 'More casual', intent: 'casual' },
  { id: 'shorter', label: 'Shorter', intent: 'shorter' },
  { id: 'figures', label: 'Add the figures', intent: 'figures' },
  { id: 'reset', label: 'Start over', intent: 'reset' },
];

const REPLY_DELAY_MS = 600;

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
  const selectableClients = MY_CLIENTS.filter(cc => !blocked.has(cc.id) || cc.id === clientId);

  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState<CoachCheck[] | null>(null);
  const [nonSendOpen, setNonSendOpen] = useState(false);
  const [nonSendReason, setNonSendReason] = useState('Client travelling this week');
  const timer = useRef<number | null>(null);
  const threadEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chat.length === 0) {
      dispatch({ type: 'CHAT_APPEND', clientId, message: { role: 'rin', text: openingMessage(c, opp) } });
    }
  }, [clientId]);

  useEffect(() => {
    threadEnd.current?.scrollIntoView({ block: 'nearest' });
  }, [chat.length, typing]);

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  function rinSays(reply: string, applyChange?: () => void) {
    setTyping(true);
    timer.current = window.setTimeout(() => {
      applyChange?.();
      dispatch({ type: 'CHAT_APPEND', clientId, message: { role: 'rin', text: reply } });
      setTyping(false);
    }, REPLY_DELAY_MS);
  }

  function ask(userText: string, intentOverride?: Intent) {
    if (!userText.trim() || typing) return;
    dispatch({ type: 'CHAT_APPEND', clientId, message: { role: 'rm', text: userText } });
    setPending(null);
    const intent = intentOverride ?? parseIntent(userText);
    rinSays(replyFor(intent, c), () => {
      if (intent && opp) {
        const next = applyIntent(spec, intent);
        dispatch({ type: 'SET_DRAFT_SPEC', clientId, spec: next });
        dispatch({ type: 'DRAFT_SET_TEXT', clientId, text: renderDraft(c, opp, next) });
      }
    });
  }

  function commitSend(approach: string) {
    const ref = 'ARC-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    dispatch({
      type: 'OUTREACH_SEND',
      entry: { ts: '14 Sep, 09:14', clientId, kind: 'Sent', detail: `${approach} message sent`, ref: 'Archived Client Comms · ' + ref },
    });
    setPending(null);
    rinSays(sentMessage(c, ref));
  }

  function send() {
    if (!opp || typing) return;
    const checks = runCoachChecks(c, text);
    if (checks.every(k => k.status === 'pass')) {
      commitSend(opp.approach);
      return;
    }
    setPending(checks);
    rinSays(checkFailureMessage(checks));
  }

  function switchClient(id: string) {
    setPending(null);
    setInput('');
    dispatch({ type: 'SET_OUTREACH_CLIENT', id });
  }

  const canSendAnyway = pending !== null && pending.every(k => k.status !== 'fail');

  return (
    <div>
      <div className="t-display mb-1">Outreach</div>
      <div className="t-lead mb-5">
        Talk to RIN to shape the message. RIN checks it against {c.name}'s own record before anything goes —
        nothing sends without your say-so, and every send or non-send is written to the outcome ledger.
      </div>

      <select
        id="outreach-client-select"
        className="border border-hairline-2 rounded-lg px-2.5 py-2 text-[14px] mb-4 bg-white"
        value={clientId}
        onChange={e => switchClient(e.target.value)}
      >
        {selectableClients.map(cc => <option key={cc.id} value={cc.id}>{cc.name}</option>)}
      </select>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div className="glass p-5 flex flex-col" data-testid="chat-panel">
          <div className="t-micro mb-3">Chat with RIN</div>

          <div className="flex-1 overflow-y-auto max-h-[440px] space-y-3 pr-1" data-testid="chat-thread">
            {chat.map((m, i) => (
              m.role === 'rin' ? (
                <div key={i} data-testid="chat-msg-rin" className="flex gap-2.5 items-start">
                  <RinAvatar />
                  <div className="bg-sunk rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-[14px] leading-relaxed text-ink-2 whitespace-pre-wrap max-w-[85%]">{m.text}</div>
                </div>
              ) : (
                <div key={i} data-testid="chat-msg-rm" className="flex gap-2.5 items-start justify-end">
                  <div className="bg-slate text-white rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-[14px] leading-relaxed max-w-[85%]">{m.text}</div>
                </div>
              )
            ))}
            {typing && (
              <div data-testid="chat-typing" className="flex gap-2.5 items-start">
                <RinAvatar />
                <div className="bg-sunk rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-ink-3 tracking-[0.25em]">•••</div>
              </div>
            )}
            <div ref={threadEnd} />
          </div>

          <div className="flex gap-1.5 flex-wrap mt-3">
            {pending ? (
              <>
                <Button data-testid="chip-fix" size="sm" variant="primary" disabled={typing} onClick={() => ask('Fix it for me', 'fix')}>
                  Fix it for me
                </Button>
                {canSendAnyway && opp && (
                  <Button data-testid="chip-send-anyway" size="sm" disabled={typing} onClick={() => commitSend(opp.approach)}>
                    Send anyway
                  </Button>
                )}
              </>
            ) : (
              CHIPS.map(ch => (
                <Button key={ch.id} data-testid={`chip-${ch.id}`} size="sm" disabled={typing || !opp} onClick={() => ask(ch.label, ch.intent)}>
                  {ch.label}
                </Button>
              ))
            )}
          </div>

          <form
            className="flex gap-2 mt-3"
            onSubmit={e => { e.preventDefault(); const t = input; setInput(''); ask(t); }}
          >
            <input
              id="chat-input"
              className="flex-1 border border-hairline-2 rounded-full px-4 py-2 text-[14px] bg-white"
              placeholder="Ask RIN to change the draft…"
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={typing}
            />
            <Button type="submit" variant="primary" size="sm" disabled={typing || !input.trim()}>Ask</Button>
          </form>
        </div>

        <div className="glass p-5">
          <div className="t-micro mb-3">Draft · {c.name}</div>
          <textarea
            id="outreach-text"
            className="w-full border border-hairline-2 rounded-xl p-3.5 text-[14.5px] leading-relaxed min-h-[320px] font-sans"
            value={text}
            onChange={e => dispatch({ type: 'DRAFT_SET_TEXT', clientId, text: e.target.value })}
          />
          <div className="flex gap-2 flex-wrap mt-3">
            <Button data-act="outreach-send" variant="red" size="sm" disabled={!opp || typing} onClick={send}>
              Send to {first}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setNonSendReason('Client travelling this week'); setNonSendOpen(true); }}>
              Log a non-send
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
        <div className="t-h3 mb-2">Outcome ledger — {c.name}</div>
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
          <div className="t-meta">No entries yet.</div>
        )}
      </div>

      <Modal
        open={nonSendOpen}
        title="Log a non-send"
        confirmLabel="Log it"
        onConfirm={() => {
          dispatch({ type: 'OUTREACH_NOSEND', entry: { ts: '14 Sep, 09:14', clientId, kind: 'Non-send', detail: nonSendReason.trim() || 'No reason given', ref: null } });
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

function RinAvatar() {
  return (
    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#4A5F6B] to-slate text-white text-[10px] font-bold flex items-center justify-center flex-none">
      RIN
    </div>
  );
}
