import { useEffect, type ReactNode } from 'react';
import { Button } from './Button';

interface Props {
  open: boolean;
  title: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ open, title, confirmLabel, onConfirm, onClose, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate/30 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        data-testid="modal"
        className="glass p-5 w-full max-w-[460px]"
        onClick={e => e.stopPropagation()}
      >
        <div className="t-h2 mb-3">{title}</div>
        {children}
        <div className="flex gap-2 mt-4">
          <Button data-act="modal-confirm" variant="primary" size="sm" onClick={onConfirm}>{confirmLabel}</Button>
          <Button data-act="modal-cancel" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}
