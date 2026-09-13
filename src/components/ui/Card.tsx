import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('glass p-5 md:p-6 mb-4', className)} {...props} />;
}

export function CardTight({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('glass-tight p-4 mb-3', className)} {...props} />;
}
