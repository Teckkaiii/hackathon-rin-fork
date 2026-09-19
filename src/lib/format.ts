export const TODAY = new Date('2026-09-14T09:00:00');

export function fmt(n: number): string {
  return 'SGD ' + Math.round(n).toLocaleString('en-SG');
}

export function fmtNumber(n: number): string {
  return Math.round(n).toLocaleString('en-SG');
}

// "26 Sep" — the date `daysFromNow` days after TODAY, no year.
export function fmtRollsOver(daysFromNow: number): string {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + daysFromNow);
  return d.toLocaleDateString('en-SG', { day: 'numeric', month: 'short' });
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

// Turns a raw note like "matures 2026-09-26, rate 3.10% p.a." into
// "Matures 26 Sep 2026, rate 3.10% p.a." for display.
export function prettyNote(note: string): string {
  const withDates = note.replace(/\d{4}-\d{2}-\d{2}/g, d => fmtDate(d));
  return withDates.charAt(0).toUpperCase() + withDates.slice(1);
}
