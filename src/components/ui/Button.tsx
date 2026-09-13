import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type Variant = 'default' | 'primary' | 'red' | 'ghost';
type Size = 'default' | 'sm';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClass: Record<Variant, string> = {
  default: '',
  primary: 'btn-primary',
  red: 'btn-red',
  ghost: 'btn-ghost',
};

export function Button({ variant = 'default', size = 'default', className, ...props }: Props) {
  return (
    <button
      className={cn('btn', variantClass[variant], size === 'sm' && 'btn-sm', className)}
      {...props}
    />
  );
}
