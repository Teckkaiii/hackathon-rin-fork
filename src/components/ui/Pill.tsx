import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

type Variant = 'pass' | 'block' | 'flag' | 'neutral' | 'slate';

const variantClass: Record<Variant, string> = {
  pass: 'pill-pass',
  block: 'pill-block',
  flag: 'pill-flag',
  neutral: 'pill-neutral',
  slate: 'pill-slate',
};

const dotClass: Partial<Record<Variant, string>> = {
  pass: 'dot-pass',
  block: 'dot-block',
  flag: 'dot-flag',
};

export function Pill({ variant, dot, children, className, ...rest }: { variant: Variant; dot?: boolean; children: ReactNode; className?: string } & HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn('pill', variantClass[variant], className)} {...rest}>
      {dot && dotClass[variant] && <span className={cn('dot', dotClass[variant])} />}
      {children}
    </span>
  );
}
