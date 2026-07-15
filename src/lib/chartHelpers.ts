export function scoreColor(score: number): string {
  if (score >= 8) return "#93bf00";
  if (score >= 6) return "#f58a1f";
  if (score >= 4) return "#f3b329";
  return "#e15d4f";
}

// "08:00" → "8:00", "12:00" → "12:00", "ma" → "ma" (week-view dag-namen)
export function formatTick(t: string): string {
  if (!t.includes(":")) return t;
  const [hh = "0", mm = "00"] = t.split(":");
  return `${Number.parseInt(hh, 10)}:${mm}`;
}
