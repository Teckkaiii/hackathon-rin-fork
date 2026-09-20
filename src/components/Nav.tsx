import { cn } from '../lib/cn';
import type { Tab } from '../state';

const TABS: [Tab, string][] = [
  ['queue', 'Queue'],
  ['clients', 'Clients'],
  ['blocked', 'Blocked'],
  ['news', 'News'],
  ['pastweek', 'Past Week'],
  ['outreach', 'Outreach'],
];

export function Nav({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="flex gap-1.5 ml-auto overflow-x-auto flex-nowrap max-sm:w-full max-sm:-mx-5 max-sm:px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {TABS.map(([id, label]) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={cn(
            'flex-none whitespace-nowrap rounded-full px-3.5 py-2 text-[14px] font-semibold transition-colors',
            tab === id ? 'bg-red text-white shadow-glow-sm' : 'text-ink-2 hover:bg-red-wash'
          )}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
