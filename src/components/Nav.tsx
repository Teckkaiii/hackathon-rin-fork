import { cn } from '../lib/cn';
import type { Tab } from '../state';

const TABS: [Tab, string][] = [
  ['queue', 'Queue'],
  ['clients', 'Clients'],
  ['coach', 'Coach'],
  ['outreach', 'Outreach'],
  ['desk', 'Desk View'],
];

export function Nav({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="flex gap-1.5 flex-wrap ml-auto">
      {TABS.map(([id, label]) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={cn(
            'rounded-full px-3.5 py-2 text-[14px] font-semibold transition-colors',
            tab === id ? 'bg-slate text-white shadow-glass' : 'text-ink-2 hover:bg-sunk'
          )}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
