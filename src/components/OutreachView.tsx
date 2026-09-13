import { useState } from 'react';
import type { Action, AppState } from '../state';
import { CLIENT_LIST, CLIENTS } from '../state';
import { OPPS } from '../lib/queue';
import { runCoachChecks } from '../lib/coach';
import { fmt } from '../lib/format';
import { Button } from './ui/Button';

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

export function OutreachView({ state, dispatch }: { state: AppState; dispatch: (a: Action) => void }) {
  const clientId = state.outreachClientId;
  const c = CLIENTS[clientId];
  const opp = OPPS.find(o => o.clientId === clientId);
  const approach = state.outreachApproach || opp?.approach || 'Notify';
  const [text, setText] = useState(() => outreachDraft(clientId, approach));

  function switchClient(id: string) {
    dispatch({ type: 'SET_OUTREACH_CLIENT', id });
    const o = OPPS.find(x => x.clientId === id);
    setText(outreachDraft(id, o?.approach || 'Notify'));
  }
  function switchApproach(a: typeof APPROACHES[number]) {
    dispatch({ type: 'SET_APPROACH', approach: a });
    setText(outreachDraft(clientId, a));
  }

  const ledgerForClient = state.ledger.filter(l => l.clientId === clientId);

  return (
    <div>
      <div className="t-display mb-1">Client Outreach</div>
      <div className="t-lead mb-5">
        Grounded in the client's position and the signal that surfaced them. Nothing sends without explicit RM approval, and every send writes to the approved, archived channel.
      </div>

      <div className="glass p-5 mb-4">
        <select
          id="outreach-client-select"
          className="border border-hairline-2 rounded-lg px-2.5 py-2 text-[14px] mb-3"
          value={clientId}
          onChange={e => switchClient(e.target.value)}
        >
          {CLIENT_LIST.map(cc => <option key={cc.id} value={cc.id}>{cc.name}</option>)}
        </select>

        {opp ? (
          <>
            <div className="t-h3 mb-2">Approach</div>
            <div className="flex gap-1.5 flex-wrap mb-3">
              {APPROACHES.map(a => (
                <Button key={a} size="sm" variant={a === approach ? 'primary' : 'default'} onClick={() => switchApproach(a)}>
                  {a}
                </Button>
              ))}
            </div>
            <textarea
              id="outreach-text"
              className="w-full border border-hairline-2 rounded-xl p-3.5 text-[14.5px] leading-relaxed min-h-[130px]"
              value={text}
              onChange={e => setText(e.target.value)}
            />
            <div className="flex gap-2 flex-wrap mt-3">
              <Button size="sm" onClick={() => dispatch({ type: 'OUTREACH_CHECK', checks: runCoachChecks(c, text) })}>
                Check before sending
              </Button>
              <Button
                data-act="outreach-send"
                variant="red" size="sm"
                onClick={() => {
                  const ref = 'ARC-' + Math.random().toString(36).slice(2, 8).toUpperCase();
                  dispatch({
                    type: 'OUTREACH_SEND',
                    entry: { ts: '14 Sep, 09:14', clientId, kind: 'Sent', detail: `${approach} message sent`, ref: 'Archived Client Comms · ' + ref },
                  });
                }}
              >
                Send
              </Button>
              <Button
                variant="ghost" size="sm"
                onClick={() => {
                  const reason = prompt('Reason for not sending:', 'Client travelling this week');
                  if (reason !== null) dispatch({ type: 'OUTREACH_NOSEND', entry: { ts: '14 Sep, 09:14', clientId, kind: 'Non-send', detail: reason, ref: null } });
                }}
              >
                Log a non-send
              </Button>
            </div>
            {state.outreachCheck && (
              <div className="bg-sunk rounded-xl p-3.5 mt-3 text-[13.5px] whitespace-pre-wrap leading-relaxed">
                {state.outreachCheck.map((r, i) => `${r.status.toUpperCase()} · ${r.rule}: ${r.detail}`).join('\n')}
              </div>
            )}
          </>
        ) : (
          <div className="t-meta">No active opportunity for this client today.</div>
        )}
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
    </div>
  );
}
