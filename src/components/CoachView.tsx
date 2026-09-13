import type { Action, AppState } from '../state';
import { CLIENT_LIST, CLIENTS } from '../state';
import { runCoachChecks, suggestRewrite } from '../lib/coach';
import { Pill } from './ui/Pill';
import { Button } from './ui/Button';

export function CoachView({ state, dispatch }: { state: AppState; dispatch: (a: Action) => void }) {
  const clientId = state.coachClientId;
  const client = CLIENTS[clientId];
  const text = state.draftByClient[clientId] ?? '';
  const results = state.coachResultByClient[clientId];

  return (
    <div>
      <div className="t-display mb-1">Conversation Coach</div>
      <div className="t-lead mb-5">
        Draft a client message. RIN checks it against the client's own record before it goes — the RM's edit is always the final text.
      </div>

      <div className="glass p-5 mb-4">
        <div className="t-h3 mb-2">Client</div>
        <select
          id="coach-client-select"
          className="border border-hairline-2 rounded-lg px-2.5 py-2 text-[14px] mb-3"
          value={clientId}
          onChange={e => dispatch({ type: 'SET_COACH_CLIENT', id: e.target.value })}
        >
          {CLIENT_LIST.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <textarea
          id="coach-text"
          className="w-full border border-hairline-2 rounded-xl p-3.5 text-[14.5px] leading-relaxed min-h-[130px] font-sans"
          value={text}
          onChange={e => dispatch({ type: 'COACH_SET_DRAFT', clientId, text: e.target.value })}
        />
        <div className="flex gap-2 mt-3">
          <Button data-act="coach-review" variant="primary" size="sm" onClick={() => dispatch({ type: 'COACH_REVIEW', clientId, checks: runCoachChecks(client, text) })}>
            Review draft
          </Button>
          <Button data-act="coach-clear" variant="ghost" size="sm" onClick={() => dispatch({ type: 'COACH_CLEAR', clientId })}>Clear</Button>
        </div>
      </div>

      {results && (
        <div className="glass p-5">
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

          {results.some(r => r.status !== 'pass') ? (
            <>
              <div className="t-h3 mt-3.5 mb-2">Suggested rewrite</div>
              <div className="bg-sunk rounded-xl p-3.5 text-[13.5px] whitespace-pre-wrap leading-relaxed">
                {suggestRewrite(client, text)}
              </div>
              <div className="flex gap-2 mt-3">
                <Button
                  data-act="coach-accept"
                  variant="primary" size="sm"
                  onClick={() => {
                    const rewritten = suggestRewrite(client, text);
                    dispatch({ type: 'COACH_ACCEPT', clientId, text: rewritten, checks: runCoachChecks(client, rewritten) });
                  }}
                >
                  Accept rewrite
                </Button>
                <Button data-act="coach-reject" variant="ghost" size="sm" onClick={() => dispatch({ type: 'COACH_REJECT', clientId })}>
                  Reject — keep my draft
                </Button>
              </div>
            </>
          ) : (
            <div className="t-meta mt-2.5">No suggested rewrite — every check passed.</div>
          )}
        </div>
      )}
    </div>
  );
}
