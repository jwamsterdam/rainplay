// Pure, clock-injected position helper for the "nu" (now) marker on the chart.
//
// The chart lays out n points using a band model: each point i occupies one
// band of width 1/n, and its CENTRE sits at fraction (i + 0.5)/n across the
// plot (the same model the sky-gradient canvas uses, see lib/chart.ts). This
// module returns where the current wall-clock time falls in that model as a
// fraction in [0,1], so the component can project it to pixels against the
// measured plot rect: x = rect.x + fraction * rect.width.
//
// `now` is injected (never read from new Date() inside) so the math is
// deterministic and unit-testable in jsdom. No DOM, no React.
//
// Uses isoTime (full date + time) for comparison so cross-midnight windows
// (e.g. +6 uur: 23:00 → 04:30 next day) work correctly — a plain HH:MM
// minutes-since-midnight comparison breaks because 0:00 (0) sorts before
// 23:00 (1380), causing the marker to jump to the right edge at midnight.

/**
 * Horizontal position of `now` as a fraction in [0,1] across the plot, using
 * the band-centre model: point i's centre is at (i + 0.5)/n.
 *
 * Interpolates between the two bracketing points by time, so the result is
 * ((i + 0.5) + t)/n where t is the time-fraction between points i and i+1.
 *
 * The result is CLAMPED to [0,1]: when `now` is before the first point's time
 * (e.g. a +2/+6 uur window that starts just after now) it pins to the left
 * edge; when after the last point's time it pins to the right edge. It does NOT
 * return null merely because `now` is outside [first, last].
 *
 * Returns null ONLY for a degenerate input (fewer than 2 points — can't
 * interpolate); the caller then renders nothing.
 */
export function nowFraction(points: { isoTime: string }[], now: Date): number | null {
  const n = points.length;
  if (n < 2) return null;

  const nowMs = now.getTime();
  const timestamps = points.map((p) => new Date(p.isoTime).getTime());

  // Find the last bracket i such that timestamps[i] <= nowMs.
  // timestamps is monotonically increasing (cross-midnight safe via isoTime dates).
  let i = 0;
  while (i < n - 2 && timestamps[i + 1] <= nowMs) i++;
  const span = timestamps[i + 1] - timestamps[i] || 1;
  const t = (nowMs - timestamps[i]) / span;

  const fraction = (i + 0.5 + t) / n;
  return Math.min(1, Math.max(0, fraction));
}
