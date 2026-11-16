import { useId } from 'react';
import { cn } from '@/lib/utils';

/** A broad pointed leaf, 100 units long, base at the origin, tip at (0, -100). */
const leafPath = 'M0 0 C30 -16 34 -64 0 -100 C-34 -64 -30 -16 0 0 Z';
const midrib = 'M0 -3 Q3 -50 0 -95';
const sideVeins = [
  'M1 -22 Q12 -30 19 -40',
  'M1 -40 Q12 -48 18 -60',
  'M1 -58 Q10 -66 13 -76',
  'M-1 -30 Q-12 -38 -19 -48',
  'M-1 -48 Q-12 -56 -17 -68',
  'M-1 -66 Q-9 -73 -11 -82',
];

type LeafPlacement = { x: number; y: number; rotate: number; scale: number };

/** Leaves along a curved stem, painted watercolour-style (shaded fill, pale veins). */
const sprigLeaves: readonly LeafPlacement[] = [
  { x: 118, y: 52, rotate: 18, scale: 0.82 },
  { x: 98, y: 92, rotate: -48, scale: 0.95 },
  { x: 112, y: 112, rotate: 62, scale: 1 },
  { x: 82, y: 150, rotate: -58, scale: 1.12 },
  { x: 92, y: 176, rotate: 70, scale: 1.05 },
  { x: 66, y: 214, rotate: -40, scale: 0.9 },
];

/**
 * A watercolour leaf sprig: broad leaves shaded from base to tip with pale veins, on a thin curved stem. The colour is
 * `currentColor`, so it follows the theme token given in `className` (`text-chart-2`, `text-primary`…).
 */
export function LeafSprig({ className }: { className: string }) {
  const gradientId = `leaf-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <svg viewBox="0 0 200 260" aria-hidden="true" className={cn('absolute', className)}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="1" x2="0.6" y2="0">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.95" />
          <stop offset="0.55" stopColor="currentColor" stopOpacity="0.7" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.38" />
        </linearGradient>
      </defs>
      <path
        d="M58 258 C70 200 92 140 128 40"
        className="fill-none stroke-current"
        strokeOpacity="0.6"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {sprigLeaves.map(({ x, y, rotate, scale }) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}>
          <path d={leafPath} fill={`url(#${gradientId})`} />
          <path
            d={midrib}
            className="fill-none stroke-background"
            strokeOpacity="0.55"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          {sideVeins.map((vein) => (
            <path
              key={vein}
              d={vein}
              className="fill-none stroke-background"
              strokeOpacity="0.35"
              strokeWidth="1"
              strokeLinecap="round"
            />
          ))}
        </g>
      ))}
    </svg>
  );
}

/** A soft round watercolour wash in the `secondary` token, fading to nothing at its edge. */
export function Wash({ className }: { className: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'absolute rounded-full bg-[radial-gradient(closest-side,var(--color-secondary),transparent)]',
        className,
      )}
    />
  );
}

/**
 * Faint watercolour sprigs and washes behind the home page (decoration only, never interactive). Full-width bands with
 * their own background cover them, so they show through the plain sections between bands.
 */
export function HomeBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <Wash className="top-[17%] -left-40 size-[34rem] opacity-50" />
      <LeafSprig className="top-[20%] -left-10 w-56 rotate-[200deg] text-chart-2 opacity-25 md:w-72" />
      <LeafSprig className="top-[38%] -right-8 w-60 -scale-x-100 rotate-[160deg] text-primary opacity-15 md:w-80" />
      <Wash className="top-[55%] -right-48 size-[36rem] opacity-40" />
      <LeafSprig className="top-[60%] -left-12 w-64 rotate-[10deg] text-chart-2 opacity-20" />
    </div>
  );
}
