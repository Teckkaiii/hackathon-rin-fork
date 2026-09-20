import { useEffect, useRef, useState } from 'react';
import { CLIENTS, MY_CLIENT_IDS } from '../state';
import { blockedClientIds } from '../lib/queue';
import { intake, type IntakeResult } from '../lib/newsIntake';
import type { ImpactSeverity } from '../types';
import { Button } from './ui/Button';
import { Pill } from './ui/Pill';

// RIN pauses before answering — the same beat the Outreach chat uses, so the
// two feel like one assistant.
const THINK_MS = 600;

const SEVERITY_VARIANT: Record<ImpactSeverity, 'block' | 'flag' | 'neutral'> = { high: 'block', medium: 'flag', low: 'neutral' };
const SEVERITY_LABEL: Record<ImpactSeverity, string> = { high: 'High', medium: 'Medium', low: 'Low' };

export function NewsIntake({ onOpenClient, onDraftOutreach }: { onOpenClient: (id: string) => void; onDraftOutreach: (id: string) => void }) {
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [result, setResult] = useState<IntakeResult | null>(null);
  const timer = useRef<number | null>(null);
  const blocked = blockedClientIds(MY_CLIENT_IDS);

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  function ask() {
    const text = input.trim();
    if (!text || thinking) return;
    if (timer.current) window.clearTimeout(timer.current);
    setResult(null);
    setThinking(true);
    timer.current = window.setTimeout(() => {
      setResult(intake(text, MY_CLIENT_IDS));
      setThinking(false);
    }, THINK_MS);
  }

  return (
    <div className="mb-6" data-testid="news-intake">
      <form className="flex gap-2 items-center" onSubmit={e => { e.preventDefault(); ask(); }}>
        <input
          id="news-intake-input"
          className="flex-1 min-w-0 rounded-full border border-hairline-2 bg-white px-4 py-2.5 text-[14px] text-ink placeholder:text-ink-3 focus:border-red/40 outline-none"
          placeholder="Paste a headline or link…"
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <Button type="submit" variant="primary" disabled={!input.trim() || thinking} data-testid="news-intake-ask" className="flex-none">
          Ask RIN
        </Button>
      </form>

      {(thinking || result) && (
        <div className="mesh-red mt-3 bubble-in" data-testid="news-intake-panel">
          <div className="flex gap-2.5 items-start">
            <div className="rin-orb w-7 h-7 text-[9px]" data-state={thinking ? 'thinking' : 'idle'}>R</div>
            {thinking ? (
              <div data-testid="news-intake-thinking" className="bg-white border border-red/10 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5 items-center shadow-glass">
                <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
              </div>
            ) : result && (
              <div className="min-w-0 flex-1">
                <div data-testid="news-intake-brief" className="bg-white border border-red/10 rounded-2xl rounded-bl-sm px-4 py-2.5 text-[14px] leading-relaxed text-ink-2 shadow-glass">
                  {result.brief}
                </div>
                {result.source && <div className="t-meta mt-1.5 ml-1">Read from the link's headline · {result.source}</div>}
              </div>
            )}
          </div>

          {result && result.impacts.length > 0 && (
            <div className="mt-3 space-y-2">
              {result.impacts.map(im => {
                const c = CLIENTS[im.clientId];
                const withheld = blocked.has(c.id);
                return (
                  <div key={c.id} data-testid="news-intake-client" className="glass-tight p-3.5 flex items-start gap-3 flex-wrap">
                    <div className="flex-1 min-w-[220px]">
                      <button type="button" className="text-left hover:underline" onClick={() => onOpenClient(c.id)}>
                        <span className="t-h3">{c.name}</span>
                        <span className="t-meta ml-2">{c.segment}</span>
                      </button>
                      <div className="text-[13.5px] text-ink-2 leading-relaxed mt-0.5">{im.reason}</div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Pill variant={SEVERITY_VARIANT[im.severity]}>{SEVERITY_LABEL[im.severity]} impact</Pill>
                      <Pill variant={im.basis === 'confirmed' ? 'pass' : 'neutral'}>{im.basis === 'confirmed' ? 'Confirmed' : 'Inferred'}</Pill>
                      {withheld
                        ? <Pill variant="block" dot>Withheld</Pill>
                        : <Button size="sm" variant="primary" data-testid="news-intake-draft" onClick={() => onDraftOutreach(c.id)}>Draft outreach</Button>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
