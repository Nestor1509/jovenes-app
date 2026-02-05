export function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

export function hmToMinutes(hStr: string, mStr: string): number {
  const h = hStr.trim() === "" ? 0 : clampInt(Number(hStr), 0, 24);
  const m = mStr.trim() === "" ? 0 : clampInt(Number(mStr), 0, 59);
  return h * 60 + m;
}

export function minutesToHM(total: number): { h: number; m: number } {
  const t = Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0;
  return { h: Math.floor(t / 60), m: t % 60 };
}

export function formatMinutes(total: number): string {
  const { h, m } = minutesToHM(total);
  if (h <= 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
