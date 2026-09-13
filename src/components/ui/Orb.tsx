import { initials } from '../../lib/format';

export function Orb({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <div
      className="orb flex-none"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </div>
  );
}
