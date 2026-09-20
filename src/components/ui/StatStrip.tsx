import { Fragment } from 'react';
import type { HTMLAttributes } from 'react';

export interface Stat { value: number; label: string; hint?: string }

/** The one place a number gets to be red: a summary strip on a mesh-red surface. */
export function StatStrip({ stats, ...rest }: { stats: Stat[] } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className="mesh-red flex items-stretch gap-0 !p-0 overflow-hidden mb-4">
      {stats.map((s, i) => (
        <Fragment key={s.label}>
          {i > 0 && <div className="w-px bg-red/15 my-4" />}
          <div className="flex-1 px-5 py-4 min-w-[110px]">
            <div className="num text-[32px] font-extrabold leading-none tracking-tight text-red">{String(s.value).padStart(2, '0')}</div>
            <div className="t-micro mt-1.5">{s.label}</div>
            {s.hint && <div className="t-meta mt-0.5">{s.hint}</div>}
          </div>
        </Fragment>
      ))}
    </div>
  );
}
