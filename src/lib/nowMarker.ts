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

// "HH:MM" → minutes since midnight. Mirrors minutesOf in DayChartRecharts.
function minutesOf(time: string): number {
  const [hh = "0", mm = "00"] = time.split(":");
  return parseInt(hh, 10) * 60 + parseInt(mm, 10);
}

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
export function nowFraction(points: { time: string }[], now: Date): number | null {
  const n = points.length;
  if (n < 2) return null;

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const mins = points.map((p) => minutesOf(p.time));

  // Index i such that mins[i] <= now <= mins[i+1]; t is the fraction between.
  // If now precedes mins[0], i stays 0 and t goes negative; if now follows the
  // last point, i is the last gap and t exceeds 1 — both are clamped below.
  let i = 0;
  while (i < n - 2 && mins[i + 1] <= nowMin) i++;
  const span = mins[i + 1] - mins[i] || 1;
  const t = (nowMin - mins[i]) / span;

  const fraction = (i + 0.5 + t) / n;
  return Math.min(1, Math.max(0, fraction));
}
