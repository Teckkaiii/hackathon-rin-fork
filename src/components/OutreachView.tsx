import { useState } from 'react';
import type { Action, AppState } from '../state';
import { MY_CLIENTS, MY_CLIENT_IDS, CLIENTS } from '../state';
import { OPPS, blockedClientIds } from '../lib/queue';
import { runCoachChecks, suggestRewrite } from '../lib/coach';
import { fmt } from '../lib/format';
import { cn } from '../lib/cn';
import { Pill } from './ui/Pill';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import type { CoachCheck } from '../types';

const APPROACHES = ['Notify', 'Contextualise', 'Review'] as const;

function outreachDraft(clientId: string, approach: string): string {
  const c = CLIENTS[clientId];
  const opp = OPPS.find(o => o.clientId === clientId);
  if (!opp) return '';
  const h = c.holdings[0];
  if (approach === 'Notify') {
    return `Hi ${c.name.split(' ')[0]},\n\nYour ${h.label.toLowerCase()} of ${fmt(h.value)} is ${h.note}. Worth a short call before the renewal date to walk through the options.\n\nThis message is for information only and is not financial advice.`;
  }
  if (approach === 'Contextualise') {
    return `Hi ${c.name.split(' ')[0]},\n\nA market event today touches a position you hold (${h.label.toLowerCase()}, ${fmt(h.value)}). Happy to walk through what it means for you when convenient.\n\nThis message is for information only and is not financial advice.`;
  }
  return `Hi ${c.name.split(' ')[0]},\n\nWhen we last reviewed your portfolio, we set an objective together. It looks like it's drifted — worth a short review call to see whether anything should change.\n\nThis message is for information only and is not financial advice.`;
}

const CHECK_STATUS_LABEL: Record<CoachCheck['status'], string> = { pass: 'pass', flag: 'flag', fail: 'fail' };

export function OutreachView({ state, dispatch }: { state: AppState; dispatch: (a: Action) => void }) {
  const clientId = state.outreachClientId;
  const c = CLIENTS[clientId];
  const opp = OPPS.find(o => o.clientId === clientId);
  const approach = state.outreachApproach || opp?.approach || 'Notify';
  const text = state.draftByClient[clientId] ?? (opp ? outreachDraft(clientId, approach) : '');
  const results = state.draftResultByClient[clientId];

  const oppCount = OPPS.filter(o => o.clientId === clientId).length;
  const failCount = results?.filter(r => r.status === 'fail').length ?? 0;
  const flagCount = results?.filter(r => r.status === 'flag').length ?? 0;
  const passCount = results?.filter(r => r.status === 'pass').length ?? 0;
  const rewriteText = results ? suggestRewrite(c, text) : '';
  const isGibberishFail = results?.some(r => r.rule === 'Draft is real, sendable content' && r.status === 'fail') ?? false;
  const hasRewrite = !!results && !isGibberishFail && results.some(r => r.status !== 'pass');
  const isBlocked = failCount > 0;

  function switchClient(id: string) {
    dispatch({ type: 'SET_OUTREACH_CLIENT', id });
  }
  function switchApproach(a: typeof APPROACHES[number]) {
    dispatch({ type: 'SET_APPROACH', approach: a });
    dispatch({ type: 'DRAFT_SET_TEXT', clientId, text: outreachDraft(clientId, a) });
  }
  function runReview() {
    dispatch({ type: 'DRAFT_REVIEW', clientId, checks: runCoachChecks(c, text) });
  }
  function applyRewrite() {
    dispatch({ type: 'DRAFT_ACCEPT', clientId, text: rewriteText, checks: runCoachChecks(c, rewriteText) });
  }

  const ledgerForClient = state.ledger.filter(l => l.clientId === clientId);
  const blocked = blockedClientIds(MY_CLIENT_IDS);
  const selectableClients = MY_CLIENTS.filter(cc => !blocked.has(cc.id) || cc.id === clientId);

  const [nonSendOpen, setNonSendOpen] = useState(false);
  const [nonSendReason, setNonSendReason] = useState('Client travelling this week');

  return (
    <div>
      <div className="t-display mb-1">Outreach</div>
      <div className="t-lead mb-5 max-w-[760px]">
        Drafted against the client's own record. RIN checks the draft before it goes; the RM's edit is always the
        final text, and nothing sends without explicit approval and a write to the archived channel.
      </div>

      <div className="grid lg:grid-cols-[minmax(0,440px)_1fr] gap-4 items-start">
        <div className="glass p-5">
          <div className="flex items-center gap-2.5 flex-wrap mb-1">
            <div className="relative inline-flex items-center">
              <select
                id="outreach-client-select"
                className="appearance-none bg-transparent border-none font-sans text-[19px] font-extrabold text-ink pr-5 cursor-pointer focus:outline-none"
                value={clientId}
                onChange={e => switchClient(e.target.value)}
              >
                {selectableClients.map(cc => <option key={cc.id} value={cc.id}>{cc.name}</option>)}
              </select>
              <span className="pointer-events-none absolute right-0 text-ink-3 text-[12px]">▾</span>
            </div>
            <span className="t-meta">{c.segment} · {oppCount} active {oppCount === 1 ? 'opportunity' : 'opportunities'}</span>
          </div>

          {opp && (
            <>
              <div className="t-micro mt-4 mb-2">Approach</div>
              <div className="flex gap-1.5 flex-wrap mb-3">
                {APPROACHES.map(a => (
                  <Button key={a} size="sm" variant={a === approach ? 'primary' : 'default'} onClick={() => switchApproach(a)}>
                    {a}
                  </Button>
                ))}
              </div>
            </>
          )}

          <textarea
            id="outreach-text"
            className="w-full bg-transparent border-0 outline-none focus:ring-0 resize-none p-0 text-[14.5px] leading-relaxed min-h-[150px] font-sans text-ink"
            value={text}
            onChange={e => dispatch({ type: 'DRAFT_SET_TEXT', clientId, text: e.target.value })}
          />

          <div className="h-px bg-hairline my-3.5" />

          <div className="flex gap-2 flex-wrap">
            {hasRewrite ? (
              <Button data-act="outreach-accept" variant="primary" size="sm" onClick={applyRewrite}>
                Apply suggested rewrite
              </Button>
            ) : (
              <Button data-act="outreach-review" variant="primary" size="sm" onClick={runReview}>
                Review draft
              </Button>
            )}
            <Button data-act="outreach-recheck" variant="default" size="sm" onClick={runReview}>
              Re-check
            </Button>
            {opp && (
              <Button
                data-act="outreach-send"
                variant={isBlocked ? 'default' : 'primary'}
                size="sm"
                disabled={isBlocked}
                onClick={() => {
                  const ref = 'ARC-' + Math.random().toString(36).slice(2, 8).toUpperCase();
                  dispatch({
                    type: 'OUTREACH_SEND',
                    entry: { ts: '14 Sep, 09:14', clientId, kind: 'Sent', detail: `${approach} message sent`, ref: 'Archived Client Comms · ' + ref },
                  });
                }}
              >
                {isBlocked ? `Send — blocked by ${failCount} failed check${failCount === 1 ? '' : 's'}` : 'Send'}
              </Button>
            )}
          </div>

          <div className="flex gap-2 flex-wrap mt-2">
            <Button data-act="outreach-clear" variant="ghost" size="sm" onClick={() => dispatch({ type: 'DRAFT_CLEAR', clientId })}>
              Clear
            </Button>
            {opp && (
              <Button variant="ghost" size="sm" onClick={() => { setNonSendReason('Client travelling this week'); setNonSendOpen(true); }}>
                Log a non-send
              </Button>
            )}
          </div>

          {!opp && (
            <div className="t-meta mt-2.5">
              No active opportunity for this client today — you can still draft and review a message manually, but
              sending is tied to a surfaced opportunity.
            </div>
          )}
        </div>

        <div>
          {results && (
            <div className="glass p-5 mb-4">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                <div className="t-micro">Pre-send checks</div>
                <div className="text-[13px] font-semibold">
                  {failCount > 0 && <span className="text-red-deep">{failCount} fail</span>}
                  {failCount > 0 && (flagCount > 0 || passCount > 0) && <span className="text-ink-3"> · </span>}
                  {flagCount > 0 && <span className="text-gold">{flagCount} flag</span>}
                  {flagCount > 0 && passCount > 0 && <span className="text-ink-3"> · </span>}
                  {passCount > 0 && <span className="text-green">{passCount} pass</span>}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                {results.map((r, i) => (
                  <div
                    key={i}
                    className={cn(
                      'rounded-lg px-3 py-2.5',
                      r.status === 'fail' && 'bg-red-wash',
                      r.status === 'flag' && 'bg-gold-wash'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn('dot', r.status === 'pass' ? 'dot-pass' : r.status === 'flag' ? 'dot-flag' : 'dot-block')} />
                      <span
                        className={cn(
                          'text-[14px] font-bold',
                          r.status === 'fail' && 'text-red-deep',
                          r.status === 'flag' && 'text-gold',
                          r.status === 'pass' && 'text-ink'
                        )}
                      >
                        {r.rule}{r.status !== 'pass' && ` — ${CHECK_STATUS_LABEL[r.status]}`}
                      </span>
                    </div>
                    <div className="text-[13px] text-ink-2 mt-0.5 ml-[15px]">{r.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results && (
            isGibberishFail ? (
              <div className="glass p-5 mb-4 t-meta">
                No rewrite to suggest — write the actual message you intend to send, then review it again.
              </div>
            ) : hasRewrite ? (
              <div className="panel-dark mb-4">
                <div className="t-micro text-white/50 mb-2">Suggested rewrite</div>
                <div className="text-[14px] whitespace-pre-wrap leading-relaxed text-white/90">{rewriteText}</div>
              </div>
            ) : (
              <div className="glass p-5 mb-4 t-meta">No suggested rewrite — every check passed.</div>
            )
          )}

          <div className="glass p-5">
            <div className="t-micro mb-2.5">Outcome ledger · {c.name}</div>
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
                      <td className="py-2 border-b border-hairline num">{l.ts}</td>
                      <td className="py-2 border-b border-hairline">{l.kind}</td>
                      <td className="py-2 border-b border-hairline">{l.detail}</td>
                      <td className="py-2 border-b border-hairline src">{l.ref || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="t-meta">No entry yet. Every send and non-send writes here with an archive reference.</div>
            )}
          </div>
        </div>
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
