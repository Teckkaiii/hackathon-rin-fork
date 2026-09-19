export const TODAY = new Date('2026-09-14T09:00:00');

export function fmt(n: number): string {
  return 'SGD ' + Math.round(n).toLocaleString('en-SG');
}

export function fmtDate(s: string): string {
  const d = new Date(s + 'T00:00:00');
  return d.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function monthsBetween(a: Date, b: Date): number {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

export function initials(name: string): string {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('');
}
