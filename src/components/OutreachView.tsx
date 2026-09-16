import type { Action, AppState } from '../state';
import { MY_CLIENTS, MY_CLIENT_IDS, CLIENTS } from '../state';
import { OPPS, blockedClientIds } from '../lib/queue';
import { runCoachChecks, suggestRewrite } from '../lib/coach';
import { fmt } from '../lib/format';
import { Pill } from './ui/Pill';
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
  const text = state.draftByClient[clientId] ?? (opp ? outreachDraft(clientId, approach) : '');
  const results = state.draftResultByClient[clientId];

  function switchClient(id: string) {
    dispatch({ type: 'SET_OUTREACH_CLIENT', id });
  }
  function switchApproach(a: typeof APPROACHES[number]) {
    dispatch({ type: 'SET_APPROACH', approach: a });
    dispatch({ type: 'DRAFT_SET_TEXT', clientId, text: outreachDraft(clientId, a) });
  }

  const ledgerForClient = state.ledger.filter(l => l.clientId === clientId);
  const blocked = blockedClientIds(MY_CLIENT_IDS);
  const selectableClients = MY_CLIENTS.filter(cc => !blocked.has(cc.id) || cc.id === clientId);

  return (
    <div>
      <div className="t-display mb-1">Outreach</div>
      <div className="t-lead mb-5">
        Draft a client message, grounded in the client's own record and, when there's an active signal, the
        opportunity that surfaced them. RIN checks the draft before it goes — the RM's edit is always the final
        text, and nothing sends without explicit approval and a write to the archived channel.
      </div>

      <div className="glass p-5 mb-4">
        <select
          id="outreach-client-select"
          className="border border-hairline-2 rounded-lg px-2.5 py-2 text-[14px] mb-3"
          value={clientId}
          onChange={e => switchClient(e.target.value)}
        >
          {selectableClients.map(cc => <option key={cc.id} value={cc.id}>{cc.name}</option>)}
        </select>

        {opp && (
          <>
            <div className="t-h3 mb-2">Approach</div>
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
          className="w-full border border-hairline-2 rounded-xl p-3.5 text-[14.5px] leading-relaxed min-h-[130px] font-sans"
          value={text}
          onChange={e => dispatch({ type: 'DRAFT_SET_TEXT', clientId, text: e.target.value })}
        />

        <div className="flex gap-2 flex-wrap mt-3">
          <Button data-act="outreach-review" variant="primary" size="sm" onClick={() => dispatch({ type: 'DRAFT_REVIEW', clientId, checks: runCoachChecks(c, text) })}>
            Review draft
          </Button>
          <Button data-act="outreach-clear" variant="ghost" size="sm" onClick={() => dispatch({ type: 'DRAFT_CLEAR', clientId })}>
            Clear
          </Button>
          {opp && (
            <>
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
            </>
          )}
        </div>

        {!opp && (
          <div className="t-meta mt-2.5">
            No active opportunity for this client today — you can still draft and review a message manually, but
            sending is tied to a surfaced opportunity.
          </div>
        )}
      </div>

      {results && (
        <div className="glass p-5 mb-4">
          <div className="t-h3 mb-2">Checks</div>
          {results.map((r, i) => (
            <div key={i} className="flex items-start gap-2.5 py-2.5 border-t border-hairline first:border-t-0">
              <Pill variant={r.status === 'pass' ? 'pass' : r.status === 'flag' ? 'flag' : 'block'} dot>
                {r.status === 'pass' ? 'Pass' : r.status === 'flag' ? 'Flag' : 'Fail'}
              </Pill>
              <div>
                <div className="t-h3">{r.rule}</div>
                <div className="text-[13.5px] text-ink-2">{r.detail}</div>
              </div>
            </div>
          ))}

          {results.some(r => r.rule === 'Draft is real, sendable content' && r.status === 'fail') ? (
            <div className="t-meta mt-2.5">No rewrite to suggest — write the actual message you intend to send, then review it again.</div>
          ) : results.some(r => r.status !== 'pass') ? (
            <>
              <div className="t-h3 mt-3.5 mb-2">Suggested rewrite</div>
              <div className="bg-sunk rounded-xl p-3.5 text-[13.5px] whitespace-pre-wrap leading-relaxed">
                {suggestRewrite(c, text)}
              </div>
              <div className="flex gap-2 mt-3">
                <Button
                  data-act="outreach-accept"
                  variant="primary" size="sm"
                  onClick={() => {
                    const rewritten = suggestRewrite(c, text);
                    dispatch({ type: 'DRAFT_ACCEPT', clientId, text: rewritten, checks: runCoachChecks(c, rewritten) });
                  }}
                >
                  Accept rewrite
                </Button>
                <Button data-act="outreach-reject" variant="ghost" size="sm" onClick={() => dispatch({ type: 'DRAFT_REJECT', clientId })}>
                  Reject — keep my draft
                </Button>
              </div>
            </>
          ) : (
            <div className="t-meta mt-2.5">No suggested rewrite — every check passed.</div>
          )}
        </div>
      )}

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
