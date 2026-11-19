import { colors } from '../theme/tokens';

export type ZoneId = 'anabolic' | 'catabolic' | 'fatBurning' | 'ketosis';

export type Zone = {
  id: ZoneId;
  label: string;
  /** Hours into the fast at which this zone begins. */
  startH: number;
  color: string;
  tint: string;
  tip: string;
};

/** Ordered by start hour. The last zone is open-ended. */
export const ZONES: readonly Zone[] = [
  {
    id: 'anabolic',
    label: 'Anabolic',
    startH: 0,
    color: colors.green,
    tint: '#E4EBD2',
    tip: 'Your body is still digesting your last meal.',
  },
  {
    id: 'catabolic',
    label: 'Catabolic',
    startH: 4,
    color: colors.yellow,
    tint: colors.yellowTint,
    tip: 'Digestion is done and your body starts drawing on stored energy.',
  },
  {
    id: 'fatBurning',
    label: 'Fat burning',
    startH: 12,
    color: colors.orange,
    tint: colors.orangeTint,
    tip: 'Your body is leaning on stored energy. Keep sipping water.',
  },
  {
    id: 'ketosis',
    label: 'Ketosis',
    startH: 16,
    color: colors.lavender,
    tint: '#E6E1FB',
    tip: 'You are deep into your fast. Listen to your body.',
  },
] as const;

export function zoneAt(elapsedH: number): Zone {
  let current = ZONES[0];
  for (const z of ZONES) {
    if (elapsedH >= z.startH) current = z;
  }
  return current;
}

export function nextZone(elapsedH: number): Zone | null {
  return ZONES.find((z) => z.startH > elapsedH) ?? null;
}

/** End hour of a zone (exclusive), or Infinity for the last one. */
export function zoneEndH(zone: Zone): number {
  const idx = ZONES.findIndex((z) => z.id === zone.id);
  return ZONES[idx + 1]?.startH ?? Infinity;
}

export type RingSegment = {
  zone: Zone;
  /** Fraction of the ring (0..1) where the segment starts and ends. */
  from: number;
  to: number;
};

/**
 * Segments to draw on the home ring for a fast of `goalH` hours that has
 * run for `elapsedH` hours. The ring represents the goal; segments stop at
 * the goal even if the fast runs longer.
 */
export function ringSegments(elapsedH: number, goalH: number): RingSegment[] {
  if (goalH <= 0 || elapsedH <= 0) return [];
  const capped = Math.min(elapsedH, goalH);
  const out: RingSegment[] = [];
  for (const zone of ZONES) {
    if (zone.startH >= capped) break;
    const end = Math.min(zoneEndH(zone), capped);
    out.push({ zone, from: zone.startH / goalH, to: end / goalH });
  }
  return out;
}
