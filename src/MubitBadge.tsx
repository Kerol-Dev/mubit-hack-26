import { Layers, LoaderCircle } from 'lucide-react';
import './mubit-brand.css';

export function MubitBadge({
  label = 'AI powered by Mubit',
  busy = false,
  inverse = false,
}: {
  label?: string;
  busy?: boolean;
  inverse?: boolean;
}) {
  const Icon = busy ? LoaderCircle : Layers;
  return (
    <span className={'mubit-badge' + (inverse ? ' inverse' : '')}>
      <Icon size={15} className={busy ? 'spin' : undefined} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
